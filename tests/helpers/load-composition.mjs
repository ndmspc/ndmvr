import { build } from "esbuild";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { setTimeout as waitForTimer } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import React, {
    act,
    createContext,
    useContext,
    useEffect,
    useImperativeHandle,
    useLayoutEffect,
    useRef,
    useSyncExternalStore,
} from "react";
import { createRoot } from "react-dom/client";
import { jsx as reactJsx, jsxs as reactJsxs } from "react/jsx-runtime";
import { JSDOM } from "jsdom";
import * as THREE from "three";
import { createXRStore } from "@pmndrs/xr/internals";

// Production composition, input, stores, spatial mechanics and SDK XROrigin
// run with real React effects. Substitutions only render Canvas/UIKit/styled
// primitives and replace heavyweight painter/panel bodies. These contexts are
// test-only assertions for the existing Canvas/XR ancestry and Three parents.
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    pretendToBeVisual: true,
    url: "https://ndmvr.test/",
});
Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    CustomEvent: dom.window.CustomEvent,
    sessionStorage: dom.window.sessionStorage,
    IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
const harness = { current: null };
globalThis.__ndmvrCompositionTestHarness = harness;
const CanvasContext = createContext(false);
const XRContext = createContext(false);
const ParentContext = createContext(null);

function useFrame(callback, priority = 0) {
    const environment = harness.current;
    if (!useContext(CanvasContext)) throw new Error("useFrame outside Canvas");
    const record = useRef({ callback, priority });
    record.current.callback = callback;
    useLayoutEffect(() => {
        environment.frames.add(record.current);
        return () => environment.frames.delete(record.current);
    }, [environment]);
}

function useThree(selector) {
    if (!useContext(CanvasContext)) throw new Error("useThree outside Canvas");
    const state = harness.current.scene;
    return selector ? selector(state) : state;
}

function useXR(selector = (state) => state) {
    if (!useContext(XRContext)) throw new Error("useXR outside XR");
    const store = harness.current.store;
    return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}

function Canvas({ children, ...props }) {
    const environment = harness.current;
    environment.canvasProps = props;
    useEffect(() => {
        environment.canvasMounts++;
        props.onCreated?.(environment.scene);
    }, []);
    return React.createElement(
        CanvasContext.Provider,
        { value: true },
        React.createElement(
            ParentContext.Provider,
            { value: environment.scene.scene },
            React.createElement("div", { "data-canvas": "true" }, children)
        )
    );
}

function XRFrame() {
    useFrame((state) => harness.current.store.onBeforeFrame(state.scene, state.camera), -1000);
    return null;
}

function XR({ store, children }) {
    harness.current.usedStore = store;
    return React.createElement(
        XRContext.Provider,
        { value: true },
        React.createElement("div", { "data-xr": "true" }, React.createElement(XRFrame), children)
    );
}

function ThreeNode({ kind, children, ref, position, rotation, ...props }) {
    const environment = harness.current;
    const parent = useContext(ParentContext);
    const record = useRef({ object: new THREE.Group(), kind, props });
    record.current.props = props;
    // R3F applies transforms on prop changes, not on every component render.
    useLayoutEffect(() => {
        if (position) record.current.object.position.fromArray(position);
        if (rotation) record.current.object.rotation.fromArray(rotation);
    }, [position?.[0], position?.[1], position?.[2], rotation?.[0], rotation?.[1], rotation?.[2]]);
    useImperativeHandle(ref, () => record.current.object, []);
    useLayoutEffect(() => {
        parent?.add(record.current.object);
        environment.nodes.add(record.current);
        return () => {
            environment.nodes.delete(record.current);
            record.current.object.removeFromParent();
        };
    }, [environment, parent]);
    return React.createElement(
        ParentContext.Provider,
        { value: record.current.object },
        React.createElement("div", { "data-three": kind }, children)
    );
}

function PerspectiveCamera({ ref, position, fov }) {
    const environment = harness.current;
    const camera = environment.scene.camera;
    useImperativeHandle(ref, () => camera, [camera]);
    useLayoutEffect(() => {
        camera.position.fromArray(position);
        camera.fov = fov;
    }, [camera, position[0], position[1], position[2], fov]);
    return null;
}

function UIKitContainer({ children, ref, ...props }) {
    const environment = harness.current;
    const parent = useContext(ParentContext);
    const record = useRef({ group: new THREE.Group(), props: { ...props, ref } });
    record.current.props = { ...props, ref };
    useImperativeHandle(ref, () => record.current.group, []);
    useLayoutEffect(() => {
        parent?.add(record.current.group);
        environment.ui.add(record.current);
        return () => {
            environment.ui.delete(record.current);
            record.current.group.removeFromParent();
        };
    }, [environment, parent]);
    return React.createElement("div", { "data-uikit": "true" }, children);
}

function Fullscreen({ children }) {
    return React.createElement("div", { "data-uikit-fullscreen": "true" }, children);
}

function styledTag(tag) {
    return () =>
        function StyledPrimitive({ children, ...props }) {
            const allowed = Object.fromEntries(
                Object.entries(props).filter(
                    ([key]) =>
                        /^(on[A-Z]|aria-|data-)/.test(key) ||
                        ["src", "alt", "style", "type", "checked"].includes(key)
                )
            );
            return React.createElement(tag, allowed, children);
        };
}

function HistogramWrapper({ id }) {
    useXR();
    return React.createElement("div", { "data-histogram": id });
}

function FileBrowser(props) {
    useXR();
    harness.current.browserProps = props;
    return React.createElement(
        "div",
        { "data-file-browser": "true" },
        harness.current.realFileBrowser ? React.createElement(harness.RealFileBrowser, props) : null
    );
}

function SceneProbe({ name = "custom", position = [20, 0, -5] }) {
    useXR();
    useThree();
    return harness.jsx("group", { name, position });
}

Object.assign(harness, {
    useFrame,
    useThree,
    useXR,
    Canvas,
    XR,
    PerspectiveCamera,
    UIKitContainer,
    Fullscreen,
    HistogramWrapper,
    FileBrowser,
    SceneProbe,
    styled: new Proxy({}, { get: (_, tag) => styledTag(tag) }),
    jsx: (type, props, key) =>
        reactJsx(
            typeof type === "string" &&
                !["div", "span", "button", "img", "input", "label"].includes(type)
                ? ThreeNode
                : type,
            typeof type === "string" &&
                !["div", "span", "button", "img", "input", "label"].includes(type)
                ? { ...props, kind: type }
                : props,
            key
        ),
    jsxs: (type, props, key) =>
        reactJsxs(
            typeof type === "string" &&
                !["div", "span", "button", "img", "input", "label"].includes(type)
                ? ThreeNode
                : type,
            typeof type === "string" &&
                !["div", "span", "button", "img", "input", "label"].includes(type)
                ? { ...props, kind: type }
                : props,
            key
        ),
});

const rootDirectory = fileURLToPath(new URL("../../", import.meta.url));
const modules = new Map([
    [
        "@react-three/fiber",
        "export const Canvas=h.Canvas, useFrame=h.useFrame, useThree=h.useThree;",
    ],
    ["@react-three/drei", "export const PerspectiveCamera=h.PerspectiveCamera;"],
    [
        "@react-three/xr",
        `
        export const XR=h.XR, useXR=h.useXR;
        export const useXRStore=()=>h.current.store;
        export const useXRInputSourceState=(_,hand)=>useXR(s=>s.inputSourceStates.find(c=>c.inputSource.handedness===hand));
        export const createXRStore=options=>{ h.xrOptions=options; return new Proxy({}, {
            get:(_,key)=>{const value=h.current.store[key]; return typeof value==='function'?value.bind(h.current.store):value;}
        }); };
        export { XROrigin } from "${rootDirectory.replaceAll("\\", "/")}node_modules/@react-three/xr/dist/origin.js";
    `,
    ],
    [
        "@react-three/uikit",
        `
        export const Container=h.UIKitContainer, Fullscreen=h.Fullscreen;
        export const Text=({children,onClick})=>h.jsx('span',{children,onClick});
        export const canvasInputProps={events:'test-only-input-props'};
    `,
    ],
    [
        "@react-three/uikit-default",
        `
        export const Label=h.UIKitContainer, RadioGroup=h.UIKitContainer, RadioGroupItem=h.UIKitContainer;
    `,
    ],
    ["@react-three/uikit-lucide", "export const MousePointer2=()=>null;"],
    ["styled-components", "export default h.styled;"],
    ["../../styles/uikit-styles", ""],
    ["./HistogramWrapper.tsx", "export default h.HistogramWrapper;"],
    [
        "./FileBrowser.tsx",
        `import RealFileBrowser from "${rootDirectory.replaceAll("\\", "/")}src/lib/components/ui/shared/browser/FileBrowser.tsx";
        h.RealFileBrowser=RealFileBrowser; export default h.FileBrowser;`,
    ],
    ["../connections/WebsocketBanner", "export default ()=>null;"],
    [
        "jsroot",
        `
        export const redraw=(...args)=>{h.current.redraws.push(args);return Promise.resolve({configureUserClickHandler(){}});};
        export const setDefaultDrawOpt=()=>{};
        export class HierarchyPainter {
            constructor(){this.h={_name:'test-file'};h.current.browserPainters.push(this);this.resizeCalls=0;}
            expandItem(){return Promise.resolve();}
            display(path,opt){h.current.browserDisplays.push(path);h.current.browserDisplayCalls.push({path,opt});return Promise.resolve();}
            getObject(path){return Promise.resolve({obj:{_typename:'TH1F',name:path}});}
            openRootFile(){return Promise.resolve({disp_kind:this.layout??'simple'});}
            setDisplay(layout){this.layout=layout;}
            checkResize(){this.resizeCalls++;}
        }
    `,
    ],
    [
        "../ui/shared/browser/BrowserRootFileMenu.tsx",
        "export default ()=>h.jsx('div',{'data-root-file-input':'true'});",
    ],
    [
        "composition-test-jsx/jsx-runtime",
        `
        export const jsx=h.jsx, jsxs=h.jsxs;
        export { Fragment } from 'react';
    `,
    ],
    [
        "react/jsx-runtime",
        `
        export const jsx=h.jsx, jsxs=h.jsxs;
        export { Fragment } from 'react';
    `,
    ],
]);
// Keep standard Menu item identities/metadata visible to the production Menu.
// Panel bodies are tested separately and need not open transport/browser UI here.
for (const [file, name, label] of [
    ["Demo", "demo", "Demo"],
    ["BinInfo", "bin-info", "Bin Info"],
    ["DrawOptions", "draw-options", "Draw Options"],
    ["SettingsPanel", "settings", "Settings"],
]) {
    const directory = file === "SettingsPanel" ? "menu/panels/settings" : "menu/panels";
    modules.set(
        `../ui/shared/${directory}/${file}.tsx`,
        `
        function Panel(){return h.jsx('div',{'data-panel':'${name}'});}
        Panel.menuName='${name}'; Panel.menuLabel='${label}'; export default Panel;
    `
    );
}
modules.set(
    "../ui/shared/menu/panels/ConnectionMenu.tsx",
    `
    export const HttpConnectionMenu=()=>null;
    HttpConnectionMenu.menuName='http'; HttpConnectionMenu.menuLabel='HTTP Connection';
    export const WsConnectionMenu=()=>null;
    WsConnectionMenu.menuName='ws'; WsConnectionMenu.menuLabel='WS Connection';
`
);

const result = await build({
    stdin: {
        contents: `
            export { default as NdmvrBase } from './src/lib/components/env/NdmvrBase';
            export { default as NdmvrEnv } from './src/lib/components/env/NdmvrEnv';
            export { default as NdmvrContent } from './src/lib/components/scene/NdmvrContent';
            export { default as NdmspcEnv } from './src/lib/components/env/NdmspcEnv';
            export { default as NdmspcDefaultBrowserEnv } from './src/lib/components/env/NdmspcDefaultBrowserEnv';
            export { default as JsrootEnv } from './src/lib/components/env/JsrootEnv';
            export { default as Menu } from './src/lib/components/ui/shared/menu/Menu';
            export { useHistogramWorkspace } from './src/lib/stores/histogramWorkspace';
            export { useMenuStore } from './src/lib/stores/menu/store';
            export { useKeyboardStore } from './src/lib/stores/keyboard/store';
            export { useSceneModeStore } from './src/lib/stores/sceneMode/store';
        `,
        resolveDir: rootDirectory,
        loader: "tsx",
    },
    bundle: true,
    packages: "external",
    platform: "node",
    format: "esm",
    jsx: "automatic",
    jsxImportSource: "composition-test-jsx",
    tsconfigRaw: { compilerOptions: { jsx: "react-jsx", jsxImportSource: "composition-test-jsx" } },
    loader: { ".svg": "dataurl", ".css": "empty" },
    write: false,
    plugins: [
        {
            name: "composition-rendering",
            setup(builder) {
                builder.onResolve({ filter: /.*/ }, ({ path, importer }) => {
                    if (path === "./xr.js" && importer.endsWith("origin.js")) {
                        return { path: "@react-three/xr", namespace: "test-composition" };
                    }
                    return modules.has(path) ? { path, namespace: "test-composition" } : undefined;
                });
                builder.onLoad({ filter: /.*/, namespace: "test-composition" }, ({ path }) => ({
                    contents: `const h=globalThis.__ndmvrCompositionTestHarness;\n${modules.get(path)}`,
                    resolveDir: rootDirectory,
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
const bundleUrl = new URL(`composition-${process.pid}.mjs`, cacheDirectory);
await mkdir(cacheDirectory, { recursive: true });
await writeFile(bundleUrl, result.outputFiles[0].text);
let components;
try {
    components = await import(bundleUrl.href);
} finally {
    await unlink(bundleUrl);
}

export const { useHistogramWorkspace, useMenuStore, useKeyboardStore, useSceneModeStore } =
    components;
export const element = React.createElement;
export const { Menu, NdmvrContent } = components;
export const Probe = SceneProbe;

export async function mountComposition({
    kind = "base",
    props = {},
    children,
    strict = false,
    touch = false,
    realFileBrowser = false,
} = {}) {
    sessionStorage.clear();
    window.localStorage.clear();
    Object.defineProperty(window.navigator, "maxTouchPoints", {
        configurable: true,
        value: touch ? 1 : 0,
    });
    window.matchMedia = () => ({ matches: touch });
    useMenuStore.getState().setMenuExists(false);
    useKeyboardStore.getState().clearKeys();
    useSceneModeStore.getState().clearModeToolsNotification();
    useSceneModeStore.setState({ activeMode: "default", binBoxEnabled: true, vrEnabled: true });
    const animationFrames = new Map();
    let nextFrame = 0;
    window.requestAnimationFrame = (callback) => {
        animationFrames.set(++nextFrame, callback);
        return nextFrame;
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
    const canvasElement = document.createElement("canvas");
    const container = document.createElement("div");
    document.body.appendChild(container);
    const camera = new THREE.PerspectiveCamera();
    const xrCamera = new THREE.PerspectiveCamera();
    const environment = {
        store,
        manager,
        session: null,
        container,
        canvasMounts: 0,
        scene: {
            scene: new THREE.Scene(),
            camera,
            gl: { domElement: canvasElement, xr: { getCamera: () => xrCamera } },
            size: { width: 1000, height: 800 },
        },
        frames: new Set(),
        nodes: new Set(),
        ui: new Set(),
        redraws: [],
        browserPainters: [],
        browserDisplays: [],
        browserDisplayCalls: [],
        realFileBrowser,
    };
    harness.current = environment;
    const root = createRoot(container);
    let mounted = true;
    let currentProps = props;
    let currentChildren = children;
    function tree() {
        const component = {
            base: components.NdmvrBase,
            env: components.NdmvrEnv,
            ndmspc: components.NdmspcEnv,
            browser: components.NdmspcDefaultBrowserEnv,
            jsroot: components.JsrootEnv,
        }[kind];
        const content = React.createElement(component, currentProps, currentChildren);
        return strict ? React.createElement(React.StrictMode, null, content) : content;
    }
    await act(async () => root.render(tree()));
    const runtimeOrigin = () =>
        [...environment.nodes].find((node) => node.object.children.includes(xrCamera))?.object;
    return Object.assign(environment, {
        origin: runtimeOrigin,
        xrCamera,
        xrOptions: harness.xrOptions,
        async act(callback) {
            await act(async () => callback());
        },
        async frame(delta = 0.016) {
            await act(async () => {
                const state = store.getState().session
                    ? { ...environment.scene, camera: xrCamera }
                    : environment.scene;
                for (const { callback } of [...environment.frames].sort(
                    (a, b) => a.priority - b.priority
                ))
                    callback(state, delta);
            });
        },
        async flushOverlay() {
            for (let pass = 0; pass < 2; pass++)
                await act(async () => {
                    const callbacks = [...animationFrames.values()];
                    animationFrames.clear();
                    for (const callback of callbacks) callback(performance.now());
                });
        },
        async key(type, code, options = {}) {
            await act(async () =>
                window.dispatchEvent(
                    new window.KeyboardEvent(type, { code, bubbles: true, ...options })
                )
            );
        },
        async pointer(target, type, pointerId = 1) {
            await act(async () => {
                const event = new window.Event(type, { bubbles: true });
                Object.assign(event, { pointerId });
                target.dispatchEvent(event);
            });
        },
        async click(target) {
            await act(async () => target.click());
        },
        async enter({ left = {}, right = {} } = {}) {
            await act(async () => {
                const session = new window.EventTarget();
                Object.assign(session, {
                    inputSources: [],
                    visibilityState: "visible",
                    environmentBlendMode: "opaque",
                });
                environment.session = session;
                manager.isPresenting = true;
                manager.dispatchEvent({ type: "sessionstart" });
                const controllers = ["left", "right"].map((hand) => ({
                    type: "controller",
                    inputSource: { handedness: hand },
                    gamepad: hand === "left" ? left : right,
                }));
                session.inputSources.push(...controllers.map((c) => c.inputSource));
                store.setState({ inputSourceStates: controllers });
            });
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
            children: nextChildren = currentChildren,
        } = {}) {
            currentProps = nextProps;
            currentChildren = nextChildren;
            await act(async () => root.render(tree()));
        },
        async unmount() {
            if (!mounted) return;
            mounted = false;
            await act(async () => root.unmount());
            await waitForTimer(0);
            store.destroy();
            container.remove();
        },
    });
}
