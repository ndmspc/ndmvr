import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";

// Exercise the production hook/menu effects with controllable network completion.
// Only heavyweight UI and Core publication are substituted; fetch ignores abort
// deliberately, so ownership checks are tested independently of cancellation.
const dom = new JSDOM("<!doctype html><html><body></body></html>");
Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
});
const harness = { cards: {}, published: [], parsed: [], connections: [] };
globalThis.__ndmvrAsyncRequests = harness;
const modules = new Map([
    [
        "@ndmspc/ndmvr-core",
        `export const histogramSubjectGet=()=>({next: value=>h.published.push(value)});
         export const stateSubjectGet=()=>({getObservable:()=>({subscribe:()=>({unsubscribe(){}})}),getValue:()=>({}),next(){}});`,
    ],
    [
        "jsroot",
        `export const parse=value=>{h.parsed.push(value);return typeof value==='string'?JSON.parse(value):value;};`,
    ],
    [
        "@react-three/uikit",
        `import React from 'react';
         export const Container=({children})=>React.createElement('div',null,children);
         export const Text=Container;`,
    ],
    [
        "@react-three/uikit-default",
        `import React from 'react';
         export const Label=({children})=>React.createElement('div',null,children);
         export const RadioGroupItem=Label;
         export const RadioGroup=props=>{h.renderer=props;return React.createElement(Label,props);};`,
    ],
    ["@react-three/uikit-horizon", "export const Divider=()=>null;"],
    ["Checkbox.tsx", "export default ()=>null;"],
    [
        "Dropdown.tsx",
        "export default ()=>null; export const DropdownProvider=({children})=>children;",
    ],
    ["InputCard.tsx", "export default props=>{h.cards[props.type]=props;return null;};"],
    ["WebsocketBanner.tsx", "export default ()=>null;"],
    [
        "store.ts",
        "export const useBrokerStore=()=>({connectionStatus:'idle',error:null,connect:value=>h.connections.push(value)});",
    ],
]);
const projectDirectory = fileURLToPath(new URL("../", import.meta.url));
const bundled = await build({
    stdin: {
        contents: `export {default as useNdmspcConfig} from './src/lib/hooks/useNdmspcConfig.ts';
                   export {HttpConnectionMenu,WsConnectionMenu} from './src/lib/components/ui/shared/menu/panels/ConnectionMenu.tsx';`,
        resolveDir: projectDirectory,
        loader: "tsx",
    },
    bundle: true,
    packages: "external",
    platform: "node",
    format: "esm",
    jsx: "automatic",
    write: false,
    plugins: [
        {
            name: "async-request-boundaries",
            setup(builder) {
                builder.onResolve({ filter: /.*/ }, ({ path }) => {
                    const name = path.split("/").at(-1);
                    const key = modules.has(path) ? path : name;
                    return modules.has(key) ? { path: key, namespace: "async-test" } : undefined;
                });
                builder.onLoad({ filter: /.*/, namespace: "async-test" }, ({ path }) => ({
                    contents: `const h=globalThis.__ndmvrAsyncRequests;\n${modules.get(path)}`,
                    resolveDir: projectDirectory,
                }));
            },
        },
    ],
});
const cacheDirectory = new URL("../node_modules/.cache/ndmvr-tests/", import.meta.url);
const bundleUrl = new URL(`async-requests-${process.pid}.mjs`, cacheDirectory);
await mkdir(cacheDirectory, { recursive: true });
await writeFile(bundleUrl, bundled.outputFiles[0].text);
let components;
try {
    components = await import(bundleUrl.href);
} finally {
    await unlink(bundleUrl);
}
const { useNdmspcConfig, HttpConnectionMenu, WsConnectionMenu } = components;

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
    });
    return { promise, resolve, reject };
}

let requests;
let environment;
beforeEach((t) => {
    requests = [];
    Object.assign(harness, {
        cards: {},
        published: [],
        parsed: [],
        connections: [],
        renderer: null,
    });
    t.mock.method(globalThis, "fetch", (url, options) => {
        const request = { url, signal: options.signal, ...deferred() };
        requests.push(request);
        return request.promise;
    });
});
afterEach(async () => {
    await environment?.unmount();
    environment = null;
});

function ConfigOwner({ config }) {
    return useNdmspcConfig(config);
}

async function mount(Component, props = {}, strict = false) {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    let mounted = true;
    const render = async (NextComponent, nextProps = {}) => {
        const element = React.createElement(NextComponent, nextProps);
        await act(() =>
            root.render(strict ? React.createElement(React.StrictMode, null, element) : element)
        );
    };
    environment = {
        render,
        async unmount() {
            if (!mounted) return;
            mounted = false;
            await act(() => root.unmount());
            container.remove();
        },
    };
    await render(Component, props);
    return environment;
}

const objectConfig = (file) => ({ type: "object", file });
const textResponse = (obj) => ({ text: async () => JSON.stringify(obj) });
const jsonResponse = (obj) => ({ ok: true, json: async () => obj });
async function submitHttp() {
    let pending;
    await act(() => {
        pending = harness.cards.http.onSubmit();
    });
    return { pending };
}

test("config changes abort and invalidate old fetches even if they finish after the new one", async () => {
    await mount(ConfigOwner, { config: objectConfig("old.json") });
    await environment.render(ConfigOwner, { config: objectConfig("new.json") });
    assert.equal(requests[0].signal.aborted, true);
    await act(() => requests[1].resolve(textResponse({ name: "new" })));
    let oldBodyReads = 0;
    await act(() =>
        requests[0].resolve({
            text() {
                oldBodyReads++;
                return '{"name":"old"}';
            },
        })
    );
    assert.deepEqual(harness.published, [
        { id: "pad1", opts: { render: "" }, obj: { name: "new" } },
    ]);
    assert.equal(harness.parsed.length, 1);
    assert.equal(oldBodyReads, 0);
});

test("config body completion and cancellation errors cannot publish after unmount", async (t) => {
    const errors = t.mock.method(console, "error", () => {});
    const body = deferred();
    await mount(ConfigOwner, { config: objectConfig("old.json") });
    await act(() => requests[0].resolve({ text: () => body.promise }));
    await environment.unmount();
    assert.equal(requests[0].signal.aborted, true);
    await act(() => body.resolve('{"name":"stale"}'));
    assert.deepEqual(harness.published, []);
    assert.deepEqual(harness.parsed, []);
    await mount(ConfigOwner, { config: objectConfig("cancelled.json") });
    await environment.render(ConfigOwner, { config: null });
    await act(() => requests[1].reject(new Error("aborted")));
    assert.equal(errors.mock.callCount(), 0);
});

test("StrictMode config replay keeps only the live request and still reports real failures", async (t) => {
    const errors = t.mock.method(console, "error", () => {});
    await mount(ConfigOwner, { config: objectConfig("object.json") }, true);
    assert.equal(requests.length, 2);
    assert.equal(requests[0].signal.aborted, true);
    assert.equal(requests[1].signal.aborted, false);
    await act(() => requests[0].resolve(textResponse({ name: "stale" })));
    await act(() => requests[1].reject(new Error("network failed")));
    assert.deepEqual(harness.published, []);
    assert.equal(errors.mock.callCount(), 1);
});

test("HTTP loading rejects duplicate submissions and uses the renderer selected during the request", async () => {
    await mount(HttpConnectionMenu);
    let first;
    await act(() => {
        first = harness.cards.http.onSubmit();
        harness.cards.http.onSubmit();
    });
    assert.equal(requests.length, 1);
    assert.equal(harness.cards.http.loading, true);
    await act(() => harness.cards.http.onChange(requests[0].url));
    assert.equal(requests[0].signal.aborted, false);
    await act(() => harness.renderer.onValueChange("jsroot"));
    await act(async () => {
        requests[0].resolve(jsonResponse({ arr: [{ name: "histogram" }] }));
        await first;
    });
    assert.deepEqual(harness.published, [
        { id: "pad1", opts: { render: "jsroot" }, obj: { name: "histogram" } },
    ]);
    assert.equal(harness.cards.http.loading, false);
    assert.equal(harness.cards.http.loaded, true);
});

test("editing the HTTP URL invalidates pending body work without changing a newer request's state", async () => {
    await mount(HttpConnectionMenu);
    const first = await submitHttp();
    const oldBody = deferred();
    await act(() => requests[0].resolve({ ok: true, json: () => oldBody.promise }));
    await act(() => harness.cards.http.onChange("https://new.test/histogram.json"));
    assert.equal(requests[0].signal.aborted, true);
    const second = await submitHttp();
    assert.equal(requests[1].url, "https://new.test/histogram.json");
    await act(async () => {
        oldBody.resolve({ name: "stale" });
        await first.pending;
    });
    assert.equal(harness.cards.http.loading, true);
    assert.deepEqual(harness.published, []);
    await act(async () => {
        requests[1].resolve(jsonResponse({ name: "new" }));
        await second.pending;
    });
    assert.equal(harness.published[0].obj.name, "new");
    assert.equal(harness.cards.http.loaded, true);
});

test("old HTTP completions cannot publish into a remounted menu or clear its loading state", async (t) => {
    const errors = t.mock.method(console, "error", () => {});
    await mount(HttpConnectionMenu);
    const old = await submitHttp();
    await environment.unmount();
    assert.equal(requests[0].signal.aborted, true);
    await mount(HttpConnectionMenu);
    const current = await submitHttp();
    await act(async () => {
        requests[0].reject(new Error("old request"));
        await old.pending;
    });
    assert.equal(errors.mock.callCount(), 0);
    assert.equal(harness.cards.http.loading, true);
    await act(async () => {
        requests[1].resolve(jsonResponse({ name: "current" }));
        await current.pending;
    });
    assert.deepEqual(
        harness.published.map(({ obj }) => obj.name),
        ["current"]
    );
});

test("HTTP failures still update validation, while switching to WebSocket cancels HTTP ownership", async (t) => {
    const errors = t.mock.method(console, "error", () => {});
    await mount(HttpConnectionMenu);
    const failed = await submitHttp();
    await act(async () => {
        requests[0].resolve({ ok: false, status: 500 });
        await failed.pending;
    });
    assert.equal(harness.cards.http.status, "error");
    assert.equal(harness.cards.http.loading, false);
    assert.equal(errors.mock.callCount(), 1);
    const old = await submitHttp();
    await environment.render(WsConnectionMenu);
    assert.equal(requests[1].signal.aborted, true);
    await act(() => harness.cards.ws.onSubmit());
    assert.deepEqual(harness.connections, ["ws://localhost:8080/ws/root.websocket"]);
    await act(async () => {
        requests[1].resolve(jsonResponse({ name: "stale" }));
        await old.pending;
    });
    assert.deepEqual(harness.published, []);
});
