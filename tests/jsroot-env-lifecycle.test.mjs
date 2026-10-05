import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { build } from "esbuild";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { ReplaySubject } from "rxjs";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(dom.window.HTMLElement.prototype, "offsetParent", {
    configurable: true,
    get() {
        return this.closest("[data-jsroot-host]")?.dataset.visible === "true"
            ? this.parentElement
            : null;
    },
});

const harness = { current: null };
globalThis.__ndmvrJsrootLifecycleHarness = harness;
const rootDirectory = fileURLToPath(new URL("../", import.meta.url));
const modules = new Map([
    [
        "@ndmspc/ndmvr-core",
        "export const histogramSubjectGet=()=>({getStream:()=>h.current.stream});",
    ],
    [
        "jsroot",
        `export const redraw=(element,obj,options)=>{
            const environment=h.current;
            let resolve,reject;
            const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
            const operation={element,obj,options,resolve,reject,handlers:[]};
            environment.redraws.push(operation);
            return promise.then(()=>{
                element.dataset.drawn=obj.name;
                return {configureUserClickHandler:handler=>operation.handlers.push(handler)};
            });
        };
        export const cleanup=element=>{
            h.cleanups.push(element);
            delete element.dataset.drawn;
        };`,
    ],
    ["../ui/desktop/Tabs.tsx", "export const Tabs=({children})=>children;"],
    ["../ui/desktop/Tab.tsx", "export const Tab=({children})=>children;"],
]);
const bundle = await build({
    entryPoints: [
        fileURLToPath(new URL("../src/lib/components/env/JsrootEnv.tsx", import.meta.url)),
    ],
    absWorkingDir: rootDirectory,
    bundle: true,
    packages: "external",
    platform: "node",
    format: "esm",
    jsx: "automatic",
    write: false,
    plugins: [
        {
            name: "jsroot-lifecycle-boundaries",
            setup(builder) {
                builder.onResolve({ filter: /.*/ }, ({ path }) =>
                    modules.has(path) ? { path, namespace: "jsroot-lifecycle" } : undefined
                );
                builder.onLoad({ filter: /.*/, namespace: "jsroot-lifecycle" }, ({ path }) => ({
                    contents: `const h=globalThis.__ndmvrJsrootLifecycleHarness;\n${modules.get(path)}`,
                    resolveDir: rootDirectory,
                }));
            },
        },
    ],
});
const cacheDirectory = new URL("../node_modules/.cache/ndmvr-tests/", import.meta.url);
const bundleUrl = new URL(`jsroot-lifecycle-${process.pid}.mjs`, cacheDirectory);
await mkdir(cacheDirectory, { recursive: true });
await writeFile(bundleUrl, bundle.outputFiles[0].text);
let JsrootEnv;
try {
    ({ default: JsrootEnv } = await import(bundleUrl.href));
} finally {
    await unlink(bundleUrl);
}

const mounted = new Set();
afterEach(async () => {
    for (const environment of mounted) await environment.unmount();
});

async function mount({ visible = true, initial, strict = false } = {}) {
    const stream = new ReplaySubject(1);
    if (initial) stream.next({ obj: initial });
    const container = document.createElement("div");
    container.dataset.jsrootHost = "true";
    container.dataset.visible = String(visible);
    document.body.appendChild(container);
    const environment = { stream, container, redraws: [] };
    harness.current = environment;
    harness.cleanups ??= [];
    const root = createRoot(container);
    const tree = () =>
        strict
            ? React.createElement(React.StrictMode, null, React.createElement(JsrootEnv))
            : React.createElement(JsrootEnv);
    await act(async () => root.render(tree()));
    Object.assign(environment, {
        pad: container.querySelector("#pad1"),
        async emit(name) {
            await act(async () => stream.next({ obj: name ? { name } : null }));
        },
        async settle(operation, error) {
            await act(async () => (error ? operation.reject(error) : operation.resolve()));
        },
        async rerender() {
            await act(async () => root.render(tree()));
        },
        async unmount() {
            if (!mounted.delete(environment)) return;
            await act(async () => root.unmount());
            container.remove();
        },
    });
    mounted.add(environment);
    return environment;
}

function timers(t) {
    const pending = new Map();
    let next = 0;
    t.mock.method(globalThis, "setTimeout", (callback) => {
        pending.set(++next, callback);
        return next;
    });
    t.mock.method(globalThis, "clearTimeout", (id) => pending.delete(id));
    return {
        pending,
        async tick() {
            await act(async () => {
                const callbacks = [...pending.values()];
                pending.clear();
                for (const callback of callbacks) callback();
            });
        },
    };
}

test("hidden JSROOT redraws share one retry and draw only the latest histogram", async (t) => {
    const clock = timers(t);
    const environment = await mount({ visible: false });
    await environment.emit("old");
    await environment.emit("latest");
    assert.equal(clock.pending.size, 1);
    assert.equal(environment.redraws.length, 0);
    environment.container.dataset.visible = "true";
    await clock.tick();
    assert.equal(environment.redraws.length, 1);
    assert.equal(environment.redraws[0].obj.name, "latest");
    assert.equal(environment.redraws[0].element, environment.pad);
    assert.equal(environment.redraws[0].options, "");
    await environment.settle(environment.redraws[0]);
    assert.equal(environment.redraws[0].handlers.length, 1);
});

test("a visible new emission draws immediately instead of waiting for its hidden retry", async (t) => {
    const clock = timers(t);
    const environment = await mount({ visible: false });
    await environment.emit("old");
    assert.equal(clock.pending.size, 1);
    environment.container.dataset.visible = "true";
    await environment.emit("latest");
    assert.equal(clock.pending.size, 0);
    assert.equal(environment.redraws.length, 1);
    assert.equal(environment.redraws[0].obj.name, "latest");
    await environment.settle(environment.redraws[0]);
});

test("unmount cancels hidden retries and unsubscribes before a same-ID remount", async (t) => {
    const clock = timers(t);
    const old = await mount({ visible: false });
    await old.emit("obsolete");
    assert.equal(clock.pending.size, 1);
    await old.unmount();
    assert.equal(clock.pending.size, 0);
    assert.equal(old.stream.observers.length, 0);
    const current = await mount();
    await current.emit("current");
    await clock.tick();
    await old.emit("late");
    assert.equal(old.redraws.length, 0);
    assert.equal(current.redraws.length, 1);
    await current.settle(current.redraws[0]);
    assert.equal(current.pad.dataset.drawn, "current");
});

test("visible redraws serialize and coalesce pending updates without stale click handlers", async (t) => {
    const log = t.mock.method(console, "log", () => {});
    const environment = await mount();
    await environment.emit("first");
    await environment.emit("middle");
    await environment.emit("latest");
    assert.equal(environment.redraws.length, 1);
    await environment.settle(environment.redraws[0]);
    assert.equal(environment.redraws[0].handlers.length, 0);
    assert.equal(environment.redraws.length, 2);
    assert.equal(environment.redraws[1].obj.name, "latest");
    await environment.settle(environment.redraws[1]);
    assert.equal(environment.pad.dataset.drawn, "latest");
    const handler = environment.redraws[1].handlers[0];
    handler({ bin: 7 });
    assert.deepEqual(log.mock.calls[0].arguments, ["click", { bin: 7 }]);
    await environment.unmount();
    handler({ bin: 8 });
    assert.equal(log.mock.calls.length, 1);
});

test("late retired draw completion cleans only its captured element after remount", async () => {
    const old = await mount();
    await old.emit("old");
    const operation = old.redraws[0];
    await old.unmount();
    const current = await mount();
    await current.emit("current");
    await current.settle(current.redraws[0]);
    await old.settle(operation);
    assert.notEqual(operation.element, current.pad);
    assert.equal(operation.handlers.length, 0);
    assert.equal(operation.element.dataset.drawn, undefined);
    assert.equal(current.pad.dataset.drawn, "current");
    assert.ok(harness.cleanups.includes(operation.element));
});

test("StrictMode replay reuses an in-flight element queue and ordinary rerenders keep ownership", async () => {
    const cleanupStart = harness.cleanups?.length ?? 0;
    const environment = await mount({ initial: { name: "initial" }, strict: true });
    assert.equal(environment.stream.observers.length, 1);
    assert.equal(environment.redraws.length, 1);
    await environment.settle(environment.redraws[0]);
    assert.equal(environment.redraws.length, 2);
    assert.equal(environment.redraws[0].handlers.length, 0);
    assert.equal(environment.redraws[1].element, environment.pad);
    assert.equal(harness.cleanups.length, cleanupStart);
    await environment.settle(environment.redraws[1]);
    await environment.rerender();
    assert.equal(environment.redraws.length, 2);
    assert.equal(environment.stream.observers.length, 1);
    assert.equal(environment.pad.dataset.drawn, "initial");
});

test("stale rejection is consumed and the latest queued redraw still runs", async (t) => {
    const warn = t.mock.method(console, "warn", () => {});
    const environment = await mount();
    await environment.emit("old");
    await environment.emit("latest");
    await environment.settle(environment.redraws[0], new Error("old draw failed"));
    assert.equal(warn.mock.calls.length, 0);
    assert.equal(environment.redraws.length, 2);
    await environment.settle(environment.redraws[1]);
    assert.equal(environment.pad.dataset.drawn, "latest");
    await environment.emit("failed");
    await environment.settle(environment.redraws[2], new Error("current draw failed"));
    assert.equal(warn.mock.calls.length, 1);
    await environment.emit("recovered");
    await environment.settle(environment.redraws[3]);
    assert.equal(environment.pad.dataset.drawn, "recovered");
});

test("clearing the histogram invalidates its hidden pending retry", async (t) => {
    const clock = timers(t);
    const environment = await mount({ visible: false });
    await environment.emit("old");
    await environment.emit(null);
    assert.equal(clock.pending.size, 0);
    environment.container.dataset.visible = "true";
    await clock.tick();
    assert.equal(environment.redraws.length, 0);
});
