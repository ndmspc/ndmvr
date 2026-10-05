import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { afterEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "https://ndmvr.test/",
});
Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
});

// Run both production services with real React effects and DOM message delivery.
const result = await build({
    stdin: {
        contents: `
            export { default as IframeService } from "./IframeService.tsx";
            export { default as IframeCernboxService } from "./IframeCernboxService.tsx";
        `,
        resolveDir: fileURLToPath(new URL("../src/lib/components/service/", import.meta.url)),
        loader: "ts",
    },
    bundle: true,
    packages: "external",
    platform: "node",
    format: "esm",
    write: false,
});
const cacheDirectory = new URL("../node_modules/.cache/ndmvr-tests/", import.meta.url);
const bundleUrl = new URL(`iframe-services-${process.pid}.mjs`, cacheDirectory);
await mkdir(cacheDirectory, { recursive: true });
await writeFile(bundleUrl, result.outputFiles[0].text);
let services;
try {
    services = await import(bundleUrl.href);
} finally {
    await unlink(bundleUrl);
}

let environment;
afterEach(async () => {
    await environment?.unmount();
    environment = null;
});

function observeMessages(t) {
    const listeners = new Set();
    const added = [];
    const removed = [];
    const posts = [];
    const add = window.addEventListener;
    const remove = window.removeEventListener;
    t.mock.method(window, "addEventListener", function (type, callback, ...args) {
        if (type === "message") {
            listeners.add(callback);
            added.push(callback);
        }
        return add.call(this, type, callback, ...args);
    });
    t.mock.method(window, "removeEventListener", function (type, callback, ...args) {
        if (type === "message") {
            listeners.delete(callback);
            removed.push(callback);
        }
        return remove.call(this, type, callback, ...args);
    });
    t.mock.method(window.parent, "postMessage", (message, origin) => {
        posts.push({ message, origin });
    });
    return { listeners, added, removed, posts };
}

const dispatchMessage = (data) =>
    window.dispatchEvent(new window.MessageEvent("message", { data }));

async function mountService(kind, props = {}, strict = false) {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    let mounted = true;
    const render = (nextProps) => {
        const content = React.createElement(services[kind], nextProps);
        root.render(strict ? React.createElement(React.StrictMode, null, content) : content);
    };
    await act(async () => render(props));
    return {
        async rerender(nextProps) {
            await act(async () => render(nextProps));
        },
        async message(data) {
            await act(async () => dispatchMessage(data));
        },
        async unmount() {
            if (!mounted) return;
            mounted = false;
            await act(async () => root.unmount());
            container.remove();
        },
    };
}

test("IframeService uses the latest callback without reconnecting or repeating init", async (t) => {
    const messages = observeMessages(t);
    const first = [];
    const second = [];
    const origin = "https://first.test";
    environment = await mountService("IframeService", {
        targetOrigin: origin,
        onMessage: (event) => first.push(event.data),
    });
    await environment.message({ action: "first", content: "one" });
    await environment.rerender({
        targetOrigin: "https://second.test",
        onMessage: (event) => second.push(event.data),
    });
    await environment.message({ action: "second", content: "two" });
    await environment.rerender({ targetOrigin: "https://third.test" });
    await environment.message({ action: "disabled", content: "three" });

    assert.deepEqual(first, [{ action: "first", content: "one" }]);
    assert.deepEqual(second, [{ action: "second", content: "two" }]);
    assert.deepEqual(messages.posts, [{ message: { event: "init" }, origin }]);
    assert.equal(messages.added.length, 1);
    assert.equal(messages.listeners.size, 1);
    assert.equal(messages.removed.length, 0);
    await environment.unmount();
    assert.equal(messages.listeners.size, 0);
    assert.deepEqual(messages.removed, messages.added);
    await environment.message({ action: "unmounted", content: "four" });
    assert.equal(second.length, 1);
});

test("IframeService can enable a callback after mounting without one", async (t) => {
    const messages = observeMessages(t);
    const received = [];
    environment = await mountService("IframeService");
    await environment.message({ action: "ignored", content: "before" });
    await environment.rerender({ onMessage: (event) => received.push(event.data) });
    await environment.message({ action: "received", content: "after" });
    assert.deepEqual(received, [{ action: "received", content: "after" }]);
    assert.equal(messages.added.length, 1);
    assert.equal(messages.posts.length, 1);
});

test("CERNBox saves the latest config and origin while preserving callback delivery", async (t) => {
    const messages = observeMessages(t);
    const first = [];
    const second = [];
    const config = { environment: { desktopSpeed: 7 } };
    const nextConfig = { environment: { desktopSpeed: 12 } };
    environment = await mountService("IframeCernboxService", {
        targetOrigin: "https://first.test",
        onConfigLoad: (value) => first.push(value),
    });
    await environment.message({ action: "load", content: JSON.stringify(config) });
    await environment.rerender({
        targetOrigin: "https://second.test",
        onConfigLoad: (value) => second.push(value),
    });
    assert.deepEqual(first, [config]);
    assert.deepEqual(second, [config], "a newly supplied callback still receives loaded config");
    await environment.message({ action: "init_save" });
    await environment.message({ action: "load", content: JSON.stringify(nextConfig) });
    await environment.message({ action: "init_save" });
    assert.deepEqual(first, [config]);
    assert.deepEqual(second, [config, nextConfig]);
    assert.deepEqual(messages.posts, [
        { message: { event: "init" }, origin: "https://first.test" },
        {
            message: { event: "upload", content: JSON.stringify(config) },
            origin: "https://second.test",
        },
        {
            message: { event: "upload", content: JSON.stringify(nextConfig) },
            origin: "https://second.test",
        },
    ]);
    assert.equal(messages.added.length, 1);
    assert.equal(messages.listeners.size, 1);
    assert.equal(messages.removed.length, 0);
});

test("CERNBox can save a load received before React commits its state", async (t) => {
    const messages = observeMessages(t);
    const config = { file: "latest.root" };
    environment = await mountService("IframeCernboxService");
    await act(async () => {
        dispatchMessage({ action: "load", content: JSON.stringify(config) });
        dispatchMessage({ action: "init_save" });
    });
    assert.deepEqual(messages.posts.at(-1), {
        message: { event: "upload", content: JSON.stringify(config) },
        origin: "*",
    });
});

test("CERNBox rejects invalid JSON without replacing the last valid config", async (t) => {
    const messages = observeMessages(t);
    const errors = [];
    const received = [];
    const config = { file: "retained.root" };
    t.mock.method(console, "error", (...args) => errors.push(args));
    environment = await mountService("IframeCernboxService", {
        onConfigLoad: (value) => received.push(value),
    });
    await environment.message({ action: "load", content: JSON.stringify(config) });
    await environment.message({ action: "load", content: "invalid JSON" });
    await environment.message({ action: "init_save" });
    assert.equal(errors.length, 1);
    assert.deepEqual(received, [config]);
    assert.equal(messages.posts.at(-1).message.content, JSON.stringify(config));
});

for (const kind of ["IframeService", "IframeCernboxService"]) {
    test(`${kind} releases its listener across StrictMode replay, unmount and remount`, async (t) => {
        const messages = observeMessages(t);
        const received = [];
        const props = {
            onMessage: (event) => received.push(event.data),
            onConfigLoad: (value) => received.push(value),
        };
        environment = await mountService(kind, props, true);
        assert.equal(messages.listeners.size, 1);
        assert.equal(messages.added.length, 2);
        assert.equal(messages.removed.length, 1);
        assert.equal(messages.posts.length, 2, "each StrictMode effect setup sends one init");
        const payload = { action: "load", content: '{"file":"one.root"}' };
        await environment.message(payload);
        assert.equal(received.length, 1);
        await environment.unmount();
        assert.equal(messages.listeners.size, 0);
        assert.deepEqual(messages.removed, messages.added);
        await environment.message(payload);
        assert.equal(received.length, 1);
        environment = await mountService(kind, props);
        assert.equal(messages.listeners.size, 1);
        assert.equal(messages.posts.length, 3);
        await environment.message(payload);
        assert.equal(received.length, 2);
        await environment.unmount();
        assert.equal(messages.listeners.size, 0);
        assert.deepEqual(messages.removed, messages.added);
    });
}
