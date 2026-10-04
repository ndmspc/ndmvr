import { build } from "esbuild";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import React, { act, useImperativeHandle, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { BehaviorSubject, ReplaySubject, Subject } from "rxjs";
import * as THREE from "three";

// Keep real React effects and Three.js objects. Substitute only the surrounding
// scene/UI and Core painters so each asynchronous operation can be completed in
// a chosen order without requiring WebGL, JSROOT rendering, or an XR session.
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const harness = { current: null };
globalThis.__ndmvrHistogramTestHarness = harness;

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
}

function subscription() {
    return {
        closed: false,
        unsubscribe() {
            this.closed = true;
        },
    };
}

export function mesh(name) {
    const object = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    object.name = name;
    object.userData.geometryDisposals = 0;
    object.userData.materialDisposals = 0;
    object.geometry.addEventListener("dispose", () => object.userData.geometryDisposals++);
    object.material.addEventListener("dispose", () => object.userData.materialDisposals++);
    return object;
}

class THnPainter {
    constructor(histo, id) {
        this.id = id;
        this.rootObj = histo.obj;
        this.mesh = mesh(`nested-${id}`);
        this.instGeom = this.mesh.geometry;
        this.material = this.mesh.material;
        this.wireframe = {
            wireframe: mesh(`wireframe-${id}`),
            stateSub: subscription(),
            dispose() {
                this.wireframe.parent.remove(this.wireframe);
                this.wireframe.geometry.dispose();
            },
        };
        this.wireframe.instGeom = this.wireframe.wireframe.geometry;
        this.wireframe.material = this.wireframe.wireframe.material;
        this.limits = {
            position: { x: 0, y: 1, z: 2 },
            scale: { x: 2, y: 3, z: 4 },
        };
        this.functionSub = subscription();
        this.configSub = subscription();
        this.dispatchSub = subscription();
        this.stateSub = subscription();
        this.operations = [];
        this.totalInstances = 1;
        this.removeCalls = 0;
        this.pushCalls = 0;
        this.intersectionCalls = [];
        this.raycastCalls = 0;
        this.keyUpCalls = 0;
        this.keyDownHandler = () => {};
        this.keyUpHandler = () => this.keyUpCalls++;
        // Reproduce the installed Core binding typo: keyUpHandler is registered
        // on keydown. The local fallback must also handle a real keyup binding.
        window.addEventListener("keydown", this.keyDownHandler);
        window.addEventListener("keydown", this.keyUpHandler);
        window.addEventListener("keyup", this.keyUpHandler);
        harness.current.nestedPainters.push(this);
    }

    operation(kind) {
        const operation = { kind, ...deferred() };
        this.operations.push(operation);
        return operation.promise;
    }

    renderHistogram() {
        return this.operation("render");
    }

    updateHistogram(histo) {
        this.rootObj = histo.obj;
        if (this.nextWireframe) {
            this.wireframe = this.nextWireframe;
            this.nextWireframe = null;
        }
        return this.operation("update");
    }

    pushVisibleInstances() {
        this.pushCalls++;
        if (this.nextMesh) {
            this.mesh = this.nextMesh;
            this.instGeom = this.mesh.geometry;
            this.material = this.mesh.material;
            this.nextMesh = null;
        }
    }

    checkIntersectionBVH() {
        this.raycastCalls++;
        return [];
    }

    intersectionHandler(hit, source) {
        this.intersectionCalls.push({ hit, source });
    }

    remove() {
        this.removeCalls++;
        if (this.removeError) throw this.removeError;
        this.functionSub.unsubscribe();
        this.configSub.unsubscribe();
        this.dispatchSub.unsubscribe();
        window.removeEventListener("keydown", this.keyDownHandler);
        window.removeEventListener("keydown", this.keyUpHandler);
        this.instGeom.dispose();
        if (this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
            this.wireframe.dispose();
        }
        this.stateSub.unsubscribe();
    }
}

class HistogramJsrootClass {
    constructor(id, obj, camera) {
        this.id = id;
        this.rootObj = obj;
        this.camera = camera;
        this.histogramGroup = new THREE.Group();
        this.histogramGroup.add(mesh(`jsroot-${id}`));
        this.configSub = subscription();
        this.sub = subscription();
        this.dummyEl = document.createElement("div");
        this.dummyEl.id = `dummyDiv${id}`;
        document.body.appendChild(this.dummyEl);
        const binInfoGroup = new THREE.Group();
        binInfoGroup.add(mesh(`bininfo-${id}`));
        camera.add(binInfoGroup);
        this.binInfoComponent = {
            queueSub: subscription(),
            group: binInfoGroup,
            dispose() {
                this.queueSub.unsubscribe();
                for (const child of [...this.group.children]) {
                    child.geometry?.dispose();
                    child.material?.dispose();
                    this.group.remove(child);
                }
            },
        };
        this.removeCalls = 0;
        this.getMeshCalls = 0;
        this.operations = [];
        this.startBuild();
        harness.current.jsrootPainters.push(this);
    }

    startBuild() {
        const operation = deferred();
        this.operations.push(operation);
        this.buildPromise = operation.promise;
    }

    updateHistogram(obj) {
        this.rootObj = obj;
        this.startBuild();
    }

    getHistogramMesh() {
        this.getMeshCalls++;
        return this.histogramGroup;
    }

    remove() {
        this.removeCalls++;
        // Installed Core throws here when its group was detached for React.
        this.histogramGroup.parent.remove(this.histogramGroup);
        this.dummyEl.remove();
        this.configSub.unsubscribe();
        this.sub.unsubscribe();
    }
}

function Primitive(props) {
    const environment = harness.current;
    useImperativeHandle(props.ref, () => props.object, [props.object]);
    useLayoutEffect(() => {
        environment.scene.scene.add(props.object);
        environment.primitives.set(props.object.uuid, props);
        return () => {
            environment.primitives.delete(props.object.uuid);
            props.object.removeFromParent();
        };
    }, [environment, props]);
    return React.createElement("div", { "data-primitive": props.object.uuid });
}

function Text({ visible }) {
    return React.createElement("div", { "data-error-visible": String(visible) });
}

function BoundingFrameBox(props) {
    const environment = harness.current;
    useLayoutEffect(() => {
        environment.frame = props;
        return () => {
            environment.frame = null;
        };
    }, [environment, props]);
    return null;
}

harness.THnPainter = THnPainter;
harness.HistogramJsrootClass = HistogramJsrootClass;
harness.Text = Text;
harness.BoundingFrameBox = BoundingFrameBox;
harness.jsx = (type, props, ...children) => {
    if (type === "primitive") type = Primitive;
    else if (type === "group") type = "div";
    return React.createElement(type, props, ...children);
};

const wrapperPath = fileURLToPath(
    new URL("../../src/lib/components/scene/HistogramWrapper.tsx", import.meta.url)
);
const modules = new Map([
    [
        "@ndmspc/ndmvr-core",
        `export const THnPainter = h.THnPainter;
         export const HistogramJsrootClass = h.HistogramJsrootClass;
         export const configSubjectGet = () => h.current.config;
         export const histogramSubjectGet = () => h.current.histograms;
         export const functionSubjectGet = () => h.current.functions;
         export const binInfoSubjectGet = () => h.current.binInfo;`,
    ],
    ["@react-three/fiber", "export const useThree = () => h.current.scene;"],
    ["@react-three/xr", "export const useXR = selector => selector({session: null});"],
    ["@react-three/drei", "export const Text = h.Text;"],
    ["../../interactions/input/useInputBinding", "export const isInputBlocked = () => false;"],
    [
        "../../utils/helper-functions.ts",
        "export const vector3ToArray = v => [v?.x ?? 0, v?.y ?? 0, v?.z ?? 0];",
    ],
    [
        "../../stores/sceneMode/store.ts",
        `export const useSceneModeStore = selector => selector(h.current.mode);
         export const histogramEvents = ["mouseclick", "mousemove"];`,
    ],
    [
        "../../stores/histogramWorkspace",
        `export const activateHistogramPad = id => h.current.activations.push(id);
         export const prepareHistogramPadState = () => {};`,
    ],
    ["./BoundingFrameBox", "export default h.BoundingFrameBox;"],
    ["./BinBox", "export default () => null;"],
    [
        "histogram-test-jsx/jsx-runtime",
        `export const jsx = (type, props, key) => h.jsx(type, {...props, key});
         export const jsxs = jsx;`,
    ],
]);

const result = await build({
    entryPoints: [wrapperPath],
    bundle: true,
    packages: "external",
    platform: "node",
    format: "esm",
    jsx: "automatic",
    jsxImportSource: "histogram-test-jsx",
    tsconfigRaw: { compilerOptions: { jsx: "react-jsx", jsxImportSource: "histogram-test-jsx" } },
    write: false,
    plugins: [
        {
            name: "histogram-wrapper-controlled-scene",
            setup(builder) {
                builder.onResolve({ filter: /.*/ }, ({ path }) =>
                    modules.has(path) ? { path, namespace: "test-scene" } : undefined
                );
                builder.onLoad({ filter: /.*/, namespace: "test-scene" }, ({ path }) => ({
                    contents: `const h = globalThis.__ndmvrHistogramTestHarness;\n${modules.get(path)}`,
                }));
                builder.onLoad({ filter: /HistogramWrapper\.tsx$/ }, async () => ({
                    contents: await readFile(wrapperPath, "utf8"),
                    loader: "tsx",
                }));
            },
        },
    ],
});

const cacheDirectory = new URL("../../node_modules/.cache/ndmvr-tests/", import.meta.url);
const bundleUrl = new URL(`histogram-wrapper-${process.pid}.mjs`, cacheDirectory);
await mkdir(cacheDirectory, { recursive: true });
await writeFile(bundleUrl, result.outputFiles[0].text);
let HistogramWrapper;
try {
    ({ default: HistogramWrapper } = await import(bundleUrl.href));
} finally {
    await unlink(bundleUrl);
}

export async function mountWrapper({ id = "pad-1", strict = false, initialRenderer } = {}) {
    const configSource = new BehaviorSubject({
        config: {
            environment: {
                histogramPads: [
                    {
                        id,
                        position: { x: 3, y: 4, z: 5 },
                        scale: { x: 6, y: 7, z: 8 },
                    },
                ],
            },
        },
    });
    const streams = new Map();
    const binInfoSource = new Subject();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const environment = {
        scene: {
            scene: new THREE.Scene(),
            camera: new THREE.PerspectiveCamera(),
            raycaster: new THREE.Raycaster(),
        },
        config: {
            getValue: () => configSource.value,
            getObservable: () => configSource,
            next: (value) => configSource.next(value),
        },
        histograms: {
            getStream(padId) {
                if (!streams.has(padId)) streams.set(padId, new ReplaySubject(1));
                return streams.get(padId);
            },
        },
        functions: {
            removeFunctions() {},
            addFunctions() {},
        },
        binInfo: { getObservable: () => binInfoSource },
        mode: {
            activeMode: "modify",
            modesConfig: { modify: { histogramEvents: {} } },
            binBoxEnabled: false,
        },
        nestedPainters: [],
        jsrootPainters: [],
        primitives: new Map(),
        activations: [],
        frame: null,
        container,
    };
    harness.current = environment;
    if (initialRenderer) {
        environment.histograms.getStream(id).next({
            id,
            obj: {},
            opts: { render: initialRenderer },
        });
    }
    const root = createRoot(container);
    let mounted = true;
    let currentId = id;
    function element() {
        const wrapper = React.createElement(HistogramWrapper, { id: currentId });
        return strict ? React.createElement(React.StrictMode, null, wrapper) : wrapper;
    }
    await act(async () => root.render(element()));

    return Object.assign(environment, {
        async emit(renderer = "nested", padId = currentId) {
            await act(async () =>
                environment.histograms.getStream(padId).next({
                    id: padId,
                    obj: {},
                    opts: { render: renderer },
                })
            );
        },
        async settle(operation, { reject, before } = {}) {
            await act(async () => {
                before?.();
                if (reject) operation.reject(reject);
                else operation.resolve();
                await operation.promise.catch(() => {});
                await Promise.resolve();
            });
        },
        async rerender({ id: nextId = currentId, camera, scene } = {}) {
            currentId = nextId;
            if (camera) environment.scene.camera = camera;
            if (scene) environment.scene.scene = scene;
            await act(async () => root.render(element()));
        },
        async act(callback) {
            await act(async () => callback());
        },
        async unmount() {
            if (!mounted) return;
            mounted = false;
            await act(async () => root.unmount());
            container.remove();
        },
        errorVisible() {
            return container.querySelector('[data-error-visible="true"]') !== null;
        },
    });
}
