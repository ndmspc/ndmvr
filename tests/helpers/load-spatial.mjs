import { build } from "esbuild";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import React, {
    act,
    useImperativeHandle,
    useLayoutEffect,
    useRef,
    useSyncExternalStore,
} from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import * as THREE from "three";
import { createXRStore } from "@pmndrs/xr/internals";

// Mount the production components, hooks, spatial helpers and SDK XROrigin.
// Only Canvas/UIKit rendering and semantic input delivery are substituted.
// The installed XR store owns session binding and frame-time origin discovery.
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    pretendToBeVisual: true,
    url: "https://ndmvr.test/",
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.sessionStorage = dom.window.sessionStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const harness = { current: null };
globalThis.__ndmvrSpatialTestHarness = harness;

function useFrame(callback, priority = 0) {
    const environment = harness.current;
    const record = useRef({ callback, priority });
    record.current.callback = callback;
    useLayoutEffect(() => {
        environment.frames.add(record.current);
        return () => environment.frames.delete(record.current);
    }, [environment]);
}

function useInputBinding(options) {
    const environment = harness.current;
    const record = useRef({ options });
    record.current.options = options;
    useLayoutEffect(() => {
        environment.bindings.add(record.current);
        return () => environment.bindings.delete(record.current);
    }, [environment]);
}

function useXR(selector = (state) => state) {
    const store = harness.current.store;
    return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}

function MotionContainer(props) {
    const environment = harness.current;
    const record = useRef({ group: new THREE.Group(), props });
    record.current.props = props;
    useImperativeHandle(props.ref, () => record.current.group, []);
    useLayoutEffect(() => {
        environment.scene.scene.add(record.current.group);
        environment.containers.add(record.current);
        return () => {
            environment.containers.delete(record.current);
            record.current.group.removeFromParent();
        };
    }, [environment]);
    return React.createElement("div", { "data-motion-container": "true" }, props.children);
}

function ThreeGroup({ children, position = [0, 0, 0], ref }) {
    const environment = harness.current;
    const group = useRef(new THREE.Group());
    group.current.position.fromArray(position);
    useImperativeHandle(ref, () => group.current, []);
    useLayoutEffect(() => {
        environment.scene.scene.add(group.current);
        environment.runtimeOrigin = group.current;
        return () => group.current.removeFromParent();
    }, [environment]);
    return React.createElement("div", { "data-xr-origin": "true" }, children);
}

function UIKitContainer(props) {
    const environment = harness.current;
    const record = useRef({ props });
    record.current.props = props;
    useLayoutEffect(() => {
        environment.ui.add(record.current);
        return () => environment.ui.delete(record.current);
    }, [environment]);
    return React.createElement("div", {}, props.children);
}

function Fullscreen({ children }) {
    return React.createElement("div", { "data-fullscreen": "true" }, children);
}

function Text({ children }) {
    return React.createElement("span", {}, children);
}

Object.assign(harness, {
    useFrame,
    useInputBinding,
    useXR,
    MotionContainer,
    UIKitContainer,
    Fullscreen,
    Text,
    jsx: (type, props) => React.createElement(type === "group" ? ThreeGroup : type, props),
    jsxs: (type, { children, ...props }) =>
        React.createElement(type === "group" ? ThreeGroup : type, props, ...children),
    Fragment: React.Fragment,
});

const rootDirectory = fileURLToPath(new URL("../../", import.meta.url));
const modules = new Map([
    [
        "@react-three/fiber",
        `
        export const useFrame = h.useFrame;
        export const useThree = selector => selector ? selector(h.current.scene) : h.current.scene;
    `,
    ],
    [
        "@react-three/xr",
        `
        export const useXR = h.useXR;
        export const useXRStore = () => h.current.store;
        export const useXRInputSourceState = () => h.current.leftController;
    `,
    ],
    [
        "../input/useInputBinding",
        `
        export const useInputBinding = h.useInputBinding;
        export const controllerGamepad = () => h.current.gamepad;
    `,
    ],
    [
        "../../../../interactions/input/useInputBinding",
        "export const useInputBinding = h.useInputBinding;",
    ],
    ["./InteractionContainer", "export default h.MotionContainer;"],
    ["../common/InteractionContainer", "export default h.MotionContainer;"],
    [
        "@react-three/uikit",
        `
        export const Container = h.UIKitContainer;
        export const Text = h.Text;
        export const Fullscreen = h.Fullscreen;
    `,
    ],
    [
        "@react-three/uikit-default",
        `
        export const Label = h.UIKitContainer;
        export const RadioGroup = h.UIKitContainer;
        export const RadioGroupItem = h.UIKitContainer;
    `,
    ],
    ["@react-three/uikit-lucide", "export const MousePointer2 = () => null;"],
    [
        "../../../../stores/sceneMode/store.ts",
        `
        export const useSceneModeStore = selector => selector(h.current.mode);
        export const selectSceneMode = mode => h.current.mode.activeMode = mode;
    `,
    ],
    ["../connections/WebsocketBanner", "export default () => null;"],
    [
        "spatial-test-jsx/jsx-runtime",
        `
        export const jsx = (type, props, key) => h.jsx(type, {...props, key});
        export const jsxs = (type, props, key) => h.jsxs(type, {...props, key});
        export const Fragment = h.Fragment;
    `,
    ],
    [
        "react/jsx-runtime",
        `
        export const jsx = (type, props, key) => h.jsx(type, {...props, key});
        export const jsxs = (type, props, key) => h.jsxs(type, {...props, key});
        export const Fragment = h.Fragment;
    `,
    ],
]);

const result = await build({
    stdin: {
        contents: `
            import React from "react";
            import { useFrame } from "@react-three/fiber";
            import { useXR } from "@react-three/xr";
            import { useMoveAndRotation } from "./src/lib/interactions/spatial/useMoveAndRotation";
            import MotionContainer from "./InteractionContainer";
            export { default as Menu } from "./src/lib/components/ui/shared/menu/Menu";
            export { default as ModeToolsPanel } from "./src/lib/components/ui/shared/panels/ModeToolsPanel";
            export { default as FloatingContainer } from "./src/lib/components/ui/shared/common/FloatingContainer";
            export { XROrigin } from "./node_modules/@react-three/xr/dist/origin.js";
            export function SpatialProbe(props) {
                const result = useMoveAndRotation(props);
                return React.createElement(MotionContainer, {
                    ref: result.groupRef,
                    classList: ["spatial-probe"],
                    onPointerDown: result.handlePointerDown,
                    onPointerMove: result.handlePointerMove,
                    onPointerUp: result.handlePointerUp,
                });
            }
            export function XRFrame() {
                const h = globalThis.__ndmvrSpatialTestHarness;
                useFrame(state => h.current.store.onBeforeFrame(state.scene, state.camera, undefined), -1000);
                return null;
            }
            export function OriginSibling(props) {
                const session = useXR(state => state.session);
                return React.createElement(XROrigin, {...props, disabled: !session});
            }
            import { XROrigin } from "./node_modules/@react-three/xr/dist/origin.js";
        `,
        resolveDir: rootDirectory,
        loader: "tsx",
    },
    bundle: true,
    packages: "external",
    platform: "node",
    format: "esm",
    jsx: "automatic",
    jsxImportSource: "spatial-test-jsx",
    tsconfigRaw: { compilerOptions: { jsx: "react-jsx", jsxImportSource: "spatial-test-jsx" } },
    write: false,
    plugins: [
        {
            name: "spatial-controlled-rendering",
            setup(builder) {
                builder.onResolve({ filter: /.*/ }, ({ path, importer }) => {
                    if (path === "./xr.js" && importer.endsWith("origin.js")) {
                        return { path: "@react-three/xr", namespace: "test-spatial" };
                    }
                    return modules.has(path) ? { path, namespace: "test-spatial" } : undefined;
                });
                builder.onLoad({ filter: /.*/, namespace: "test-spatial" }, ({ path }) => ({
                    contents: `const h = globalThis.__ndmvrSpatialTestHarness;\n${modules.get(path)}`,
                }));
                builder.onLoad({ filter: /\.tsx?$/ }, async ({ path }) => ({
                    contents: await readFile(path, "utf8"),
                    loader: path.endsWith(".tsx") ? "tsx" : "ts",
                }));
            },
        },
    ],
});

const cacheDirectory = new URL("../../node_modules/.cache/ndmvr-tests/", import.meta.url);
const bundleUrl = new URL(`spatial-${process.pid}.mjs`, cacheDirectory);
await mkdir(cacheDirectory, { recursive: true });
await writeFile(bundleUrl, result.outputFiles[0].text);
let components;
try {
    components = await import(bundleUrl.href);
} finally {
    await unlink(bundleUrl);
}

export function origin(x, y, z) {
    const object = new THREE.Group();
    object.position.set(x, y, z);
    return object;
}

export async function mountSpatial({
    kind = "floating",
    props = {},
    xr = true,
    position = [10, 2, 3],
    strict = false,
} = {}) {
    sessionStorage.clear();
    window.localStorage.clear();
    const animationFrames = new Map();
    let nextAnimationFrame = 0;
    window.requestAnimationFrame = (callback) => {
        animationFrames.set(++nextAnimationFrame, callback);
        return nextAnimationFrame;
    };
    window.cancelAnimationFrame = (id) => animationFrames.delete(id);
    const store = createXRStore({
        emulate: false,
        offerSession: false,
        enterGrantedSession: false,
    });
    const manager = new THREE.EventDispatcher();
    Object.assign(manager, {
        isPresenting: false,
        getSession: () => environment.session,
        getReferenceSpace: () => undefined,
        setReferenceSpaceType() {},
    });
    store.setWebXRManager(manager);
    const camera = new THREE.PerspectiveCamera();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const environment = {
        store,
        manager,
        session: null,
        scene: {
            scene: new THREE.Scene(),
            camera,
            gl: { xr: { getCamera: () => camera } },
            size: { width: 1000, height: 800 },
        },
        frames: new Set(),
        bindings: new Set(),
        containers: new Set(),
        ui: new Set(),
        gamepad: { "xr-standard-thumbstick": { xAxis: 0, yAxis: 0 } },
        leftController: {},
        mode: {
            activeMode: "inspect",
            modesConfig: { inspect: {} },
            getOnClickEvent: () => [],
            getOnHoverEvent: () => [],
            modeToolsNotification: null,
        },
        container,
    };
    harness.current = environment;
    const root = createRoot(container);
    let mounted = true;
    let currentProps = props;
    let originPosition = position;
    function element() {
        const content =
            kind === "ui"
                ? React.createElement(
                      React.Fragment,
                      null,
                      React.createElement(components.Menu, {
                          defaultOpen: true,
                          ...currentProps.menu,
                      }),
                      React.createElement(components.ModeToolsPanel, currentProps.modeTools)
                  )
                : React.createElement(
                      kind === "probe" ? components.SpatialProbe : components.FloatingContainer,
                      currentProps
                  );
        const tree = React.createElement(
            React.Fragment,
            null,
            React.createElement(components.XRFrame),
            React.createElement(components.OriginSibling, { position: originPosition }),
            content
        );
        return strict ? React.createElement(React.StrictMode, null, tree) : tree;
    }
    function startSession() {
        const session = new window.EventTarget();
        Object.assign(session, {
            inputSources: [],
            environmentBlendMode: "opaque",
            visibilityState: "visible",
            frameRate: 90,
        });
        environment.session = session;
        manager.isPresenting = true;
        manager.dispatchEvent({ type: "sessionstart" });
        return session;
    }
    if (xr) startSession();
    await act(async () => root.render(element()));
    return Object.assign(environment, {
        async act(callback) {
            await act(async () => callback());
        },
        async frame(delta = 0.016, { sdk = true } = {}) {
            await act(async () => {
                for (const { callback, priority } of [...environment.frames].sort(
                    (a, b) => a.priority - b.priority
                )) {
                    if (!sdk && priority === -1000) continue;
                    callback(environment.scene, delta);
                }
            });
        },
        async flushOverlay() {
            for (let pass = 0; pass < 2; pass++) {
                await act(async () => {
                    const callbacks = [...animationFrames.values()];
                    animationFrames.clear();
                    for (const callback of callbacks) callback(performance.now());
                });
            }
        },
        async input(match, method, value) {
            await act(async () => {
                for (const { options } of environment.bindings) {
                    if (match(options)) options[method]?.(value);
                }
            });
        },
        async enter() {
            let session;
            await act(async () => {
                session = startSession();
            });
            return session;
        },
        async exit() {
            await act(async () => {
                environment.session.dispatchEvent(new window.Event("end"));
                environment.session = null;
                manager.isPresenting = false;
            });
        },
        async rerender({
            props: nextProps = currentProps,
            position: nextPosition = originPosition,
        } = {}) {
            currentProps = nextProps;
            originPosition = nextPosition;
            await act(async () => root.render(element()));
        },
        async unmount() {
            if (!mounted) return;
            mounted = false;
            await act(async () => root.unmount());
            store.destroy();
            container.remove();
        },
    });
}
