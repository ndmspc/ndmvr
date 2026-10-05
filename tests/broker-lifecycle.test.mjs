import assert from "node:assert/strict";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { after, afterEach, before, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { JSDOM } from "jsdom";
import { brokerManagerGet } from "@ndmspc/ndmvr-core";

const result = await build({
    stdin: {
        contents: `
            export { useBrokerStore } from "./src/lib/stores/broker/store.ts";
            export { interceptWsProperty } from "./src/lib/stores/broker/helpers.ts";
        `,
        resolveDir: fileURLToPath(new URL("../", import.meta.url)),
        loader: "ts",
    },
    bundle: true,
    packages: "external",
    platform: "node",
    format: "esm",
    write: false,
});
const cacheDirectory = new URL("../node_modules/.cache/ndmvr-tests/", import.meta.url);
const bundleUrl = new URL(`broker-${process.pid}.mjs`, cacheDirectory);
await mkdir(cacheDirectory, { recursive: true });
await writeFile(bundleUrl, result.outputFiles[0].text);
let brokerModule;
try {
    brokerModule = await import(bundleUrl.href);
} finally {
    await unlink(bundleUrl);
}
const { useBrokerStore, interceptWsProperty } = brokerModule;

const { window } = new JSDOM();
class TestSocket extends window.EventTarget {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    static instances = [];

    readyState = TestSocket.CONNECTING;
    listeners = new Map();
    propertyHandlers = new Map();

    constructor(url) {
        super();
        this.url = url;
        TestSocket.instances.push(this);
    }

    addEventListener(type, callback, options) {
        super.addEventListener(type, callback, options);
        const capture = typeof options === "boolean" ? options : Boolean(options?.capture);
        const listeners = this.listeners.get(type) ?? new Map();
        listeners.set(callback, capture);
        this.listeners.set(type, listeners);
    }

    removeEventListener(type, callback, options) {
        super.removeEventListener(type, callback, options);
        this.listeners.get(type)?.delete(callback);
    }

    storeListeners(type) {
        return [...(this.listeners.get(type) ?? [])]
            .filter(([, capture]) => capture)
            .map(([callback]) => callback);
    }

    close() {
        this.readyState = TestSocket.CLOSING;
    }

    emit(type) {
        if (type === "open") this.readyState = TestSocket.OPEN;
        if (type === "close") this.readyState = TestSocket.CLOSED;
        this.dispatchEvent(
            type === "close"
                ? new window.CloseEvent(type, { code: 1000, reason: "test" })
                : new window.Event(type)
        );
    }
}

// Match native property-handler registration order so tests exercise Core's
// onclose clearing broker.ws as well as the store's addEventListener callbacks.
for (const type of ["open", "error", "close", "message"]) {
    Object.defineProperty(TestSocket.prototype, `on${type}`, {
        get() {
            return this.propertyHandlers.get(type) ?? null;
        },
        set(callback) {
            const previous = this.propertyHandlers.get(type);
            if (previous) this.removeEventListener(type, previous);
            this.propertyHandlers.set(type, callback);
            if (callback) this.addEventListener(type, callback);
        },
    });
}

const originalWebSocket = globalThis.WebSocket;
const manager = brokerManagerGet();
const urls = new Set();
let nextUrl = 0;
function brokerUrl() {
    const url = `ws://broker-lifecycle-${++nextUrl}.test`;
    urls.add(url);
    return url;
}

before(() => {
    globalThis.WebSocket = TestSocket;
});
beforeEach((context) => {
    context.mock.timers.enable({ apis: ["setTimeout"] });
    TestSocket.instances = [];
});
afterEach(() => {
    useBrokerStore.getState().disconnect();
    for (const url of urls) manager.removeBrokerByUrl(url);
    urls.clear();
});
after(() => {
    globalThis.WebSocket = originalWebSocket;
    window.close();
});

test("disconnect removes store listeners and stale callbacks cannot update a new URL", async () => {
    await useBrokerStore.getState().connect(brokerUrl());
    const oldSocket = TestSocket.instances.at(-1);
    const staleCallbacks = ["open", "error", "close"].flatMap((type) =>
        oldSocket.storeListeners(type)
    );
    oldSocket.emit("open");
    assert.equal(useBrokerStore.getState().connectionStatus, "connected");

    const newUrl = brokerUrl();
    await useBrokerStore.getState().connect(newUrl);
    const state = useBrokerStore.getState();
    for (const type of ["open", "error", "close"]) {
        assert.equal(oldSocket.storeListeners(type).length, 0);
        oldSocket.emit(type);
    }
    for (const callback of staleCallbacks) callback();
    assert.strictEqual(useBrokerStore.getState(), state);
    assert.equal(state.wsUrl, newUrl);
    assert.equal(state.connectionStatus, "connecting");
});

test("reconnect detaches the closed socket and attaches one listener set to its replacement", async (context) => {
    const url = brokerUrl();
    await useBrokerStore.getState().connect(url);
    const broker = manager.getBrokerByUrl(url, false);
    const oldSocket = broker.ws;
    const staleClose = oldSocket.storeListeners("close")[0];
    oldSocket.emit("open");
    oldSocket.emit("close");
    assert.equal(useBrokerStore.getState().connectionStatus, "reconnecting");
    assert.equal(broker.ws, null);
    assert.equal(oldSocket.storeListeners("close").length, 0);

    context.mock.timers.tick(500);
    const replacement = broker.ws;
    assert.notStrictEqual(replacement, oldSocket);
    for (const type of ["open", "error", "close"]) {
        assert.equal(replacement.storeListeners(type).length, 1);
    }
    broker.ws = replacement;
    assert.equal(replacement.storeListeners("open").length, 1);
    replacement.emit("open");
    staleClose();
    context.mock.timers.tick(60000);
    assert.equal(useBrokerStore.getState().connectionStatus, "connected");
    assert.equal(useBrokerStore.getState().reconnectTimeoutId, null);
});

test("taking ownership of an already-open socket observes connection and later close", async () => {
    const url = brokerUrl();
    const broker = manager.getBrokerByUrl(url, false);
    broker.connect();
    const socket = broker.ws;
    socket.emit("open");

    await useBrokerStore.getState().connect(url);
    assert.strictEqual(broker.ws, socket);
    assert.equal(useBrokerStore.getState().connectionStatus, "connected");
    socket.emit("close");
    assert.equal(useBrokerStore.getState().connectionStatus, "reconnecting");
    assert.equal(socket.storeListeners("close").length, 0);
});

test("disconnect and immediate same-URL reconnect ignore the old delayed close", async () => {
    const url = brokerUrl();
    await useBrokerStore.getState().connect(url);
    const oldSocket = TestSocket.instances.at(-1);
    oldSocket.emit("open");
    useBrokerStore.getState().disconnect();
    await useBrokerStore.getState().connect(url);
    const broker = manager.getBrokerByUrl(url, false);
    const replacement = broker.ws;
    oldSocket.emit("close");
    assert.strictEqual(broker.ws, replacement);
    replacement.emit("open");
    assert.equal(useBrokerStore.getState().connectionStatus, "connected");
});

test("clearError does not leave the previous socket owned when a new connection starts", async () => {
    await useBrokerStore.getState().connect(brokerUrl());
    const oldSocket = TestSocket.instances.at(-1);
    useBrokerStore.getState().clearError();
    assert.equal(useBrokerStore.getState().connectionStatus, "idle");
    await useBrokerStore.getState().connect(brokerUrl());
    assert.equal(oldSocket.readyState, TestSocket.CLOSING);
    assert.equal(oldSocket.storeListeners("open").length, 0);
});

test("repeated interception replaces ownership and disposal restores a normal ws property", () => {
    const socket = new TestSocket(brokerUrl());
    const broker = { ws: socket };
    let state = {
        connectionStatus: "connecting",
        error: null,
        reconnectTimeoutId: null,
        isManualDisconnect: false,
    };
    const set = (partial) => {
        state = { ...state, ...partial };
    };
    const firstDispose = interceptWsProperty(broker, socket.url, set, () => state);
    const staleOpen = socket.storeListeners("open")[0];
    const dispose = interceptWsProperty(broker, socket.url, set, () => state);
    firstDispose();
    assert.equal(socket.storeListeners("open").length, 1);
    staleOpen();
    assert.equal(state.connectionStatus, "connecting");
    socket.emit("open");
    assert.equal(state.connectionStatus, "connected");
    dispose();
    dispose();
    assert.equal(socket.storeListeners("open").length, 0);
    assert.strictEqual(Object.getOwnPropertyDescriptor(broker, "ws").value, socket);
});
