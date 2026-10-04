import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { configSubjectGet, histogramSubjectGet } from "@ndmspc/ndmvr-core";
import {
    element,
    Menu,
    mountComposition,
    NdmvrContent,
    Probe,
    useHistogramWorkspace,
    useKeyboardStore,
    useMenuStore,
    useSceneModeStore,
} from "./helpers/load-composition.mjs";

let environment;
let originalConfig;
afterEach(async () => {
    await environment?.unmount();
    environment = null;
    if (originalConfig) configSubjectGet().next(originalConfig);
    originalConfig = null;
    useHistogramWorkspace.getState().reset();
});

function configure(t, pads = ["composition-a", "composition-b"]) {
    t.mock.method(console, "log", () => {});
    originalConfig = structuredClone(configSubjectGet().getValue());
    configSubjectGet().next({
        config: {
            environment: {
                camera: { position: { x: 3, y: 4, z: 8 } },
                desktopSpeed: 7,
                vrSpeed: 3,
                histogramPads: pads.map((id) => ({ id })),
            },
        },
    });
}

const dom = () => environment.container;
const workspace = () => useHistogramWorkspace.getState();
const padIds = () => workspace().pads.map((pad) => pad.id);
const images = (alt) => [...dom().querySelectorAll("img")].filter((img) => img.alt === alt);
const menuToggle = () => images("Show menu")[0] ?? images("Close menu")[0];
const panel = (className) =>
    [...environment.ui].find(({ props }) => props.classList?.includes(className));
const menuXR = () =>
    [...environment.ui].find(({ props }) => props.renderOrder === 5000 && props.ref);
const browserActions = () =>
    [...environment.ui]
        .map(({ props }) => props.value)
        .filter((value) => value === "open-browser" || value === "close-browser");

async function selectMenuAction(name) {
    assert.ok(browserActions().includes(name));
    const radioGroup = [...environment.ui].find(
        ({ props }) => typeof props.onValueChange === "function"
    );
    await environment.act(() => radioGroup.props.onValueChange(name));
}

function vector(actual, expected) {
    actual
        .toArray()
        .forEach((value, index) =>
            assert.ok(
                Math.abs(value - expected[index]) < 1e-8,
                `${actual.toArray()} equals ${expected}`
            )
        );
}

test("empty Base supplies usable runtime without retaining histograms or mounting Menu", async (t) => {
    configure(t);
    let windowKeyCollectors = 0;
    const add = window.addEventListener;
    t.mock.method(window, "addEventListener", function (type, callback, ...args) {
        if (type === "keydown" && callback.name === "down") windowKeyCollectors++;
        return add.call(this, type, callback, ...args);
    });
    environment = await mountComposition();
    assert.deepEqual(padIds(), []);
    assert.equal(useMenuStore.getState().menuExists, false);
    assert.equal(menuToggle(), undefined);
    assert.equal(images("Fullscreen Button").length, 1);
    assert.equal(dom().querySelector("input[type=checkbox]"), null, "Switch belongs outside Base");
    assert.equal(windowKeyCollectors, 1);
    vector(environment.scene.camera.position, [3, 4, 8]);
    assert.equal(environment.scene.camera.fov, 75);
    assert.equal(environment.canvasProps.style.touchAction, "none");
    assert.equal(environment.canvasProps.gl.localClippingEnabled, true);
    assert.equal(environment.scene.gl.toneMappingExposure, 1);
    assert.ok([...environment.nodes].some(({ kind }) => kind === "ambientLight"));
    assert.ok([...environment.nodes].some(({ kind }) => kind === "directionalLight"));
    assert.ok([...environment.nodes].some(({ kind }) => kind === "planeGeometry"));
    assert.equal(environment.xrOptions.controller.left.rayPointer, false);
    await environment.key("keydown", "KeyW");
    await environment.frame(1);
    vector(environment.origin().position, [3, 4, 1]);
    vector(environment.scene.camera.position, [3, 4, 1]);
    await environment.key("keyup", "KeyW");
    await environment.frame(1);
    vector(environment.origin().position, [3, 4, 1]);
});

test("Base children retain XR ancestry and scene coordinates as siblings of XROrigin", async (t) => {
    configure(t);
    environment = await mountComposition({ children: element(Probe, { name: "custom" }) });
    const probe = [...environment.nodes].find(({ props }) => props.name === "custom");
    assert.equal(probe.object.parent, environment.scene.scene);
    assert.equal(environment.origin().parent, environment.scene.scene);
    vector(probe.object.getWorldPosition(probe.object.position.clone()), [20, 0, -5]);
    await environment.key("keydown", "KeyW");
    await environment.frame(1);
    vector(probe.object.getWorldPosition(probe.object.position.clone()), [20, 0, -5]);
    assert.equal(environment.canvasMounts, 1);
});

test("Base applies external canonical camera and desktop/VR speed updates", async (t) => {
    configure(t);
    environment = await mountComposition();
    await environment.act(() =>
        configSubjectGet().next({
            config: {
                environment: {
                    camera: { position: { x: -2, y: 6, z: 20 } },
                    desktopSpeed: 2,
                    vrSpeed: 4,
                },
            },
        })
    );
    vector(environment.scene.camera.position, [-2, 6, 20]);
    vector(environment.origin().position, [-2, 6, 20]);
    await environment.key("keydown", "KeyW");
    await environment.frame(1);
    vector(environment.scene.camera.position, [-2, 6, 18]);
    await environment.key("keyup", "KeyW");
    await environment.enter({ left: { "xr-standard-thumbstick": { xAxis: 0, yAxis: -1 } } });
    await environment.frame(1);
    vector(environment.origin().position, [-2, 6, 14]);
    await environment.exit();
    vector(environment.scene.camera.position, [-2, 6, 14]);
    assert.equal(environment.canvasMounts, 1);
});

test("Base refreshes runtime values on same-reference canonical Core emissions", async (t) => {
    configure(t);
    environment = await mountComposition();
    const subject = configSubjectGet();
    const canonical = subject.getValue();
    canonical.config.environment.camera.position.set(-4, 7, 30);
    canonical.config.environment.desktopSpeed = 9;
    canonical.config.environment.vrSpeed = 6;
    await environment.act(() =>
        subject.appendPads(["composition-appended"], "simple", {
            scale: { x: 4, y: 6, z: 8 },
            padding: { x: 0, y: 0, z: 0 },
            origin: { x: 1, y: 2, z: 3 },
        })
    );
    assert.equal(subject.getValue(), canonical);
    vector(environment.scene.camera.position, [-4, 7, 30]);
    vector(environment.origin().position, [-4, 7, 30]);
    await environment.key("keydown", "KeyW");
    await environment.frame(1);
    vector(environment.scene.camera.position, [-4, 7, 21]);
    await environment.key("keyup", "KeyW");
    await environment.enter({ left: { "xr-standard-thumbstick": { xAxis: 0, yAxis: -1 } } });
    await environment.frame(1);
    vector(environment.origin().position, [-4, 7, 15]);
    assert.equal(environment.canvasMounts, 1);
    assert.deepEqual(
        padIds(),
        [],
        "Base does not start histogram ownership while receiving configuration"
    );
});

test("ref-free custom Menu uses Base runtime and drives the existing DOM toggle", async (t) => {
    configure(t);
    environment = await mountComposition({ children: element(Menu, { defaultOpen: true }) });
    await environment.flushOverlay();
    assert.equal(useMenuStore.getState().menuExists, true);
    assert.equal(images("Close menu").length, 1);
    assert.equal(dom().querySelectorAll("[data-uikit-fullscreen]").length, 1);
    assert.deepEqual(padIds(), []);
    await environment.key("keydown", "KeyM");
    assert.equal(useMenuStore.getState().showMenu, false);
    assert.equal(images("Show menu").length, 1);
    await environment.key("keyup", "KeyM");
    await environment.click(menuToggle().parentElement);
    assert.equal(useMenuStore.getState().showMenu, true);
    await environment.enter();
    await environment.frame();
    vector(menuXR().group.position, [3, 5.2, 4]);
    await environment.exit();
    await environment.flushOverlay();
    assert.equal(dom().querySelectorAll("[data-uikit-fullscreen]").length, 1);
    await environment.rerender({ children: null });
    assert.equal(useMenuStore.getState().menuExists, false);
    assert.equal(menuToggle(), undefined);
    assert.equal(images("Fullscreen Button").length, 1);
});

test("standard Env composes configured histogram bundle, existing Menu panels, and caller children", async (t) => {
    configure(t);
    let collectors = 0;
    const add = window.addEventListener;
    t.mock.method(window, "addEventListener", function (type, ...args) {
        if (type === "keydown") collectors++;
        return add.call(this, type, ...args);
    });
    environment = await mountComposition({
        kind: "env",
        children: element(Probe, { name: "consumer" }),
    });
    await environment.flushOverlay();
    assert.deepEqual(padIds(), ["composition-a", "composition-b"]);
    assert.deepEqual(
        [...dom().querySelectorAll("[data-histogram]")].map((item) => item.dataset.histogram),
        padIds()
    );
    assert.equal(collectors, 1, "Content does not install another keyboard collector");
    assert.ok(panel("ModeToolsPanelWrapper"));
    assert.equal(dom().querySelectorAll("[data-uikit-fullscreen]").length, 2);
    const text = dom().textContent;
    for (const label of [
        "Demo",
        "HTTP Connection",
        "WS Connection",
        "Bin Info",
        "Draw Options",
        "Settings",
    ])
        assert.ok(text.includes(label), label);
    assert.deepEqual(browserActions(), [], "no browser action without a browser owner");
    const probe = [...environment.nodes].find(({ props }) => props.name === "consumer");
    assert.equal(probe.object.parent, environment.scene.scene);
    assert.equal([...environment.nodes].filter(({ kind }) => kind === "ambientLight").length, 1);
    assert.equal([...environment.nodes].filter(({ kind }) => kind === "planeGeometry").length, 1);
    await environment.key("keydown", "ControlLeft");
    await environment.key("keydown", "KeyM", { ctrlKey: true });
    assert.equal(useSceneModeStore.getState().activeMode, "modify");
    assert.equal(useMenuStore.getState().showMenu, true);
    await environment.key("keyup", "KeyM");
    await environment.key("keyup", "ControlLeft");
    const before = useSceneModeStore.getState().binBoxEnabled;
    await environment.key("keydown", "KeyB");
    assert.equal(useSceneModeStore.getState().binBoxEnabled, !before);
});

test("removing Content releases workspace while sibling Menu and Base runtime remain usable", async (t) => {
    configure(t);
    const children = [
        element(NdmvrContent, { key: "content" }),
        element(Menu, { key: "menu", defaultOpen: true }),
    ];
    environment = await mountComposition({ children });
    assert.deepEqual(padIds(), ["composition-a", "composition-b"]);
    await environment.rerender({ children: children.slice(1) });
    await environment.act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    assert.deepEqual(padIds(), []);
    assert.equal(useMenuStore.getState().menuExists, true);
    assert.equal(panel("ModeToolsPanelWrapper"), undefined);
    await environment.key("keydown", "KeyW");
    await environment.frame(1);
    vector(environment.scene.camera.position, [3, 4, 1]);
    const mode = useSceneModeStore.getState().activeMode;
    await environment.key("keydown", "ControlLeft");
    await environment.key("keydown", "KeyM", { ctrlKey: true });
    assert.equal(
        useSceneModeStore.getState().activeMode,
        mode,
        "unmounted histogram shortcuts are gone"
    );
});

test("histogram bundle includes ModeTools across desktop and XR", async (t) => {
    configure(t);
    environment = await mountComposition({ children: element(NdmvrContent) });
    assert.ok(panel("ModeToolsPanelWrapper"));
    await environment.enter();
    await environment.frame();
    assert.equal(panel("ModeToolsPanelWrapper"), undefined);
    vector(panel("ModeToolsPanelXR").group.position, [3, 2, 3.85]);
    assert.equal(panel("ModeToolsPanelXR").group.parent, environment.scene.scene);
    await environment.exit();
    assert.ok(panel("ModeToolsPanelWrapper"));
    assert.equal(dom().querySelectorAll("[data-uikit-fullscreen]").length, 1);
});

test("mobile DOM controls stay beside Canvas and route independent holds through existing desktop mechanics", async (t) => {
    configure(t);
    environment = await mountComposition({ touch: true });
    const canvas = dom().querySelector("[data-canvas]");
    const buttons = [...dom().querySelectorAll("button")];
    const forward = buttons.find(
        (button) =>
            button.querySelector("img") &&
            !button.querySelector('img[alt="Fullscreen Button"]') &&
            button.textContent !== "Hide"
    );
    assert.ok(forward);
    assert.equal(forward.closest("[data-canvas]"), null);
    assert.equal(canvas.parentElement.contains(forward), true);
    await environment.pointer(forward, "pointerdown");
    await environment.frame(1);
    vector(environment.scene.camera.position, [3, 4, 1]);
    await environment.key("keydown", "KeyW");
    await environment.pointer(forward, "pointerup");
    await environment.frame(1);
    vector(environment.scene.camera.position, [3, 4, -6]);
    await environment.key("keyup", "KeyW");
    await environment.frame(1);
    vector(environment.scene.camera.position, [3, 4, -6]);
    await environment.pointer(forward, "pointerdown", 2);
    await environment.enter();
    await environment.exit();
    await environment.frame(1);
    vector(
        environment.scene.camera.position,
        [3, 4, -6],
        "desktop controller clears its old mobile hold"
    );
});

test("Env forwards browserConfig and preserves browser scene and input placement", async (t) => {
    configure(t);
    const selected = [];
    const setBrowser = () => {};
    const setRendererMode = () => {};
    const rootNode = { _name: "test.root" };
    const browserConfig = {
        browser: true,
        hierarchy: { h: rootNode, expandItem: async () => {}, openRootFile: async () => {} },
        rootNode,
        hierarchyDocRef: { current: document.createElement("div") },
        onSelectItem: (path) => selected.push(path),
        setBrowser,
        rendererMode: "ndmvr",
        setRendererMode,
        inputMenu: element("span", {}, "Custom browser input"),
    };
    environment = await mountComposition({ kind: "env", props: { browserConfig } });
    await environment.flushOverlay();
    assert.equal(dom().querySelectorAll("[data-file-browser]").length, 1);
    assert.deepEqual(browserActions(), ["close-browser"]);
    assert.ok(dom().textContent.includes("Back to Object"));
    assert.ok(dom().textContent.includes("Custom browser input"));
    assert.equal(environment.browserProps.hierarchy, browserConfig.hierarchy);
    assert.equal(environment.browserProps.root, rootNode);
    assert.equal(environment.browserProps.doc, browserConfig.hierarchyDocRef);
    assert.equal(environment.browserProps.rendererMode, "ndmvr");
    assert.equal(environment.browserProps.setRendererMode, setRendererMode);
    environment.browserProps.onSelect("/histogram");
    assert.deepEqual(selected, ["/histogram"]);
    const browserGroup = [...environment.nodes].find(({ object }) => object.position.x === -12);
    assert.equal(browserGroup.object.parent, environment.scene.scene);
    vector(browserGroup.object.position, [-12, 2, 0]);
    await environment.frame();
    const inputPanel = [...environment.ui].find(
        ({ props }) => props.classList?.includes("menuContainer") && props.ref
    );
    vector(inputPanel.group.position, [3, 5.2, 4]);
    await environment.rerender({ props: { browserConfig: { ...browserConfig, browser: false } } });
    assert.equal(dom().querySelector("[data-file-browser]"), null);
    assert.deepEqual(browserActions(), ["open-browser"]);
    assert.ok(dom().textContent.includes("Browser"));
    await environment.rerender({ props: { browserConfig: { ...browserConfig, setBrowser: undefined } } });
    assert.deepEqual(browserActions(), [], "scene data alone does not enable browser actions");
    assert.ok(dom().querySelector("[data-file-browser]"));
});

test("partial browserConfig keeps controls usable and waits for a real tree document", async (t) => {
    configure(t);
    const rootNode = { _name: "partial.root" };
    const hierarchy = { h: rootNode, expandItem: async () => {}, openRootFile: async () => {} };
    const updates = [];
    const controls = {
        browser: true,
        setBrowser: (update) => updates.push(update),
        inputMenu: element("span", {}, "Independent browser input"),
    };
    environment = await mountComposition({
        kind: "env",
        realFileBrowser: true,
        props: { browserConfig: { ...controls, hierarchy, rootNode } },
    });
    const browser = dom().querySelector("[data-file-browser]");
    const inputPanel = [...environment.ui].find(
        ({ props }) => props.classList?.includes("menuContainer") && props.ref
    );
    const hasTree = () => [...dom().querySelectorAll("span")].some((text) => text.textContent === rootNode._name);
    for (const data of [
        { hierarchy, rootNode },
        { hierarchy, rootNode, hierarchyDocRef: { current: null } },
        { hierarchy, rootNode: null, hierarchyDocRef: { current: document.createElement("div") } },
        { hierarchy: null, rootNode },
        {},
    ]) {
        await environment.rerender({ props: { browserConfig: { ...controls, ...data } } });
        await environment.flushOverlay();
        assert.equal(hasTree(), false, "incomplete tree data never mounts TreeViewer");
        assert.equal(dom().querySelector("[data-file-browser]"), browser, "renderer controls remain mounted");
        assert.equal(environment.browserProps.doc, data.hierarchyDocRef ?? null, "no substitute document ref is manufactured");
        assert.ok(dom().textContent.includes("Renderer:"));
        assert.ok(dom().textContent.includes("Independent browser input"));
        assert.ok(environment.ui.has(inputPanel));
        assert.deepEqual(browserActions(), ["close-browser"]);
        assert.deepEqual(updates, []);
    }
    const hierarchyDocRef = { current: null };
    const browserConfig = { ...controls, hierarchy, rootNode, hierarchyDocRef };
    await environment.rerender({ props: { browserConfig } });
    assert.equal(hasTree(), false);
    hierarchyDocRef.current = document.createElement("div");
    await environment.rerender({ props: { browserConfig } });
    assert.equal(hasTree(), true, "the same ref becomes usable when its real document is attached");
    assert.equal(environment.browserProps.doc, hierarchyDocRef);
    await environment.rerender({ props: { browserConfig: { ...browserConfig, hierarchy: null } } });
    assert.equal(hasTree(), true, "a static root with a document does not require an expandable hierarchy");
    await environment.act(() => useMenuStore.getState().setShowMenu(false));
    assert.equal(hasTree(), true);
    assert.ok(environment.ui.has(inputPanel));
});

test("browser content stays mounted when Menu is hidden or another panel is selected", async (t) => {
    configure(t);
    const updates = [];
    environment = await mountComposition({
        kind: "env",
        props: {
            menuDefaultOpen: false,
            browserConfig: {
                browser: true,
                setBrowser: (update) => updates.push(update),
                inputMenu: element("span", {}, "Persistent browser input"),
            },
        },
    });
    const browser = dom().querySelector("[data-file-browser]");
    const browserGroup = [...environment.nodes].find(({ object }) => object.position.x === -12);
    const inputPanel = [...environment.ui].find(
        ({ props }) => props.classList?.includes("menuContainer") && props.ref
    );
    const assertBrowserScene = () => {
        assert.equal(dom().querySelector("[data-file-browser]"), browser);
        assert.equal(browserGroup.object.parent, environment.scene.scene);
        vector(browserGroup.object.position, [-12, 2, 0]);
        assert.ok(environment.ui.has(inputPanel));
        assert.ok(dom().textContent.includes("Persistent browser input"));
        assert.deepEqual(updates, [], "mounting the content does not run its Menu action");
    };
    assertBrowserScene();
    assert.deepEqual(browserActions(), []);
    await environment.act(() => useMenuStore.getState().setShowMenu(true));
    await environment.flushOverlay();
    assert.deepEqual(browserActions(), ["close-browser"]);
    const radioGroup = [...environment.ui].find(
        ({ props }) => typeof props.onValueChange === "function"
    );
    await environment.act(() => radioGroup.props.onValueChange("demo"));
    assert.ok(dom().querySelector('[data-panel="demo"]'));
    assertBrowserScene();
    await environment.act(() => useMenuStore.getState().setShowMenu(false));
    assertBrowserScene();
    await environment.enter();
    await environment.frame();
    vector(inputPanel.group.position, [3, 5.2, 4]);
    assertBrowserScene();
    await environment.act(() => useMenuStore.getState().setShowMenu(true));
    await environment.frame();
    assert.deepEqual(browserActions(), ["close-browser"]);
    assertBrowserScene();
    await environment.exit();
    await environment.flushOverlay();
    assertBrowserScene();
});

test("BrowserMenu changes the owner config only when selected and keeps distinct open/close actions", async (t) => {
    configure(t);
    for (const browser of [false, true]) {
        const updates = [];
        const browserConfig = { browser, setBrowser: (update) => updates.push(update) };
        environment = await mountComposition({ kind: "env", props: { browserConfig } });
        await environment.flushOverlay();
        assert.equal(updates.length, 0);
        await selectMenuAction(browser ? "close-browser" : "open-browser");
        assert.equal(updates.length, 1);
        assert.deepEqual(updates[0]({ file: "kept.root", renderer: "ndmvr" }), {
            file: "kept.root",
            renderer: "ndmvr",
            type: browser ? "object" : "browser",
        });
        assert.deepEqual(updates[0](null), { type: browser ? "object" : "browser" });
        await environment.rerender({ props: { browserConfig: { ...browserConfig, browser: !browser } } });
        assert.equal(updates.length, 1, "changing browser state unmounts the completed action");
        await environment.act(() => useMenuStore.getState().setShowMenu(false));
        await environment.act(() => useMenuStore.getState().setShowMenu(true));
        await environment.flushOverlay();
        assert.deepEqual(browserActions(), [browser ? "open-browser" : "close-browser"]);
        await environment.unmount();
    }
});

for (const [browser, outcome] of [[false, "resolves"], [true, "rejects"]]) {
    test(`BrowserMenu waits for XR session ending and switches when it ${outcome}`, async (t) => {
        configure(t);
        const updates = [];
        const browserConfig = { browser, setBrowser: (update) => updates.push(update) };
        environment = await mountComposition({ kind: "env", props: { browserConfig } });
        await environment.enter();
        let finish;
        const ending = new Promise((resolve, reject) => {
            finish = outcome === "resolves" ? resolve : reject;
        });
        let endCalls = 0;
        environment.session.end = () => {
            endCalls++;
            return ending;
        };
        await selectMenuAction(browser ? "close-browser" : "open-browser");
        assert.equal(endCalls, 1);
        assert.equal(updates.length, 0);
        await environment.rerender({ props: { browserConfig: { ...browserConfig } } });
        assert.equal(endCalls, 1, "a new config object does not restart the pending action");
        await environment.act(() => finish(outcome === "rejects" ? new Error("end failed") : undefined));
        assert.equal(updates.length, 1);
        assert.deepEqual(updates[0](null), { type: browser ? "object" : "browser" });
        await environment.exit();
    });
}

test("closing Menu cancels a browser switch while XR session ending is pending", async (t) => {
    configure(t);
    const updates = [];
    environment = await mountComposition({
        kind: "env",
        props: { browserConfig: { setBrowser: (update) => updates.push(update) } },
    });
    await environment.enter();
    let finish;
    environment.session.end = () => new Promise((resolve) => { finish = resolve; });
    await selectMenuAction("open-browser");
    await environment.act(() => useMenuStore.getState().setShowMenu(false));
    await environment.act(() => finish());
    assert.deepEqual(updates, []);
    await environment.exit();
});

test("Ndmspc switches mounted renderers and exposes one visible fullscreen/menu pair", async (t) => {
    configure(t);
    const browserUpdates = [];
    environment = await mountComposition({
        kind: "ndmspc",
        props: { setBrowser: (update) => browserUpdates.push(update) },
    });
    await environment.flushOverlay();
    const switchInput = dom().querySelector("input[type=checkbox]");
    assert.ok(switchInput);
    assert.equal(
        images("Fullscreen Button").length,
        1,
        "outer controls omitted while Base is visible"
    );
    assert.equal(images("Close menu").length, 1);
    const canvas = dom().querySelector("[data-canvas]");
    const canvasBranch = canvas.parentElement.parentElement;
    assert.equal(canvasBranch.style.display, "flex");
    const jsrootPad = dom().querySelector("#pad1");
    assert.ok(jsrootPad);
    await environment.click(switchInput);
    assert.equal(canvasBranch.style.display, "none");
    assert.equal(environment.canvasMounts, 1);
    assert.equal(dom().querySelector("#pad1"), jsrootPad);
    const outsideCanvasBranch = (image) => !canvasBranch.contains(image);
    assert.equal(images("Fullscreen Button").filter(outsideCanvasBranch).length, 1);
    assert.equal(images("Close menu").filter(outsideCanvasBranch).length, 1);
    assert.equal(useSceneModeStore.getState().vrEnabled, false);
    await environment.click(switchInput);
    assert.equal(canvasBranch.style.display, "flex");
    assert.equal(images("Fullscreen Button").length, 1);
    assert.equal(environment.canvasMounts, 1);
    assert.equal(useSceneModeStore.getState().vrEnabled, true);
    await environment.flushOverlay();
    await selectMenuAction("open-browser");
    assert.equal(browserUpdates.length, 1);
    assert.deepEqual(browserUpdates[0](null), { type: "browser" });
});

test("browser selection displays once per click and preserves pad rotation and renderer changes", async (t) => {
    configure(t, []);
    environment = await mountComposition({
        kind: "browser",
        props: { file: "test.root", layout: "grid2x2", opt: "hist", renderer: "jsroot" },
    });
    const emissions = [];
    const subject = histogramSubjectGet();
    const next = subject.next;
    t.mock.method(subject, "next", function (value) {
        emissions.push(value);
        return next.call(this, value);
    });
    const displayCount = environment.browserDisplays.length;
    const emissionCount = emissions.length;
    await environment.act(() => environment.browserProps.onSelect("h1"));
    assert.deepEqual(environment.browserDisplays.slice(displayCount), ["h1"], "a changed selection allocates one display");
    assert.deepEqual(emissions.slice(emissionCount).map(({ id }) => id), ["pad1"]);
    await environment.act(() => environment.browserProps.onSelect("h1"));
    await environment.act(() => environment.browserProps.onSelect("h2"));
    await environment.act(() => Promise.all([
        environment.browserProps.onSelect("h3"),
        environment.browserProps.onSelect("h4"),
    ]));
    assert.deepEqual(environment.browserDisplays.slice(displayCount), ["h1", "h1", "h2", "h3", "h4"]);
    assert.deepEqual(emissions.slice(emissionCount).map(({ id }) => id), ["pad1", "pad2", "pad3", "pad4", "pad1"]);
    assert.deepEqual(environment.browserDisplayCalls.slice(displayCount).map(({ opt }) => opt), Array(5).fill("hist"));
    assert.deepEqual(
        ["pad1", "pad2", "pad3", "pad4"].map((id) => workspace().histogramsByPad[id].obj.name),
        ["h4", "h1", "h2", "h3"]
    );
    const beforeRenderer = emissions.length;
    await environment.act(() => environment.browserProps.setRendererMode("ndmvr"));
    assert.equal(environment.browserDisplays.length - displayCount, 5, "renderer changes re-publish pads without another display");
    assert.deepEqual(emissions.slice(beforeRenderer).map(({ id }) => id), ["pad1", "pad2", "pad3", "pad4"]);
    assert.ok(emissions.slice(beforeRenderer).every(({ opts }) => opts.render === "ndmvr"));
    await environment.act(() => environment.browserProps.onSelect("h5"));
    assert.equal(emissions.at(-1).id, "pad2", "renderer changes do not reset pad rotation");
    assert.equal(emissions.at(-1).opts.render, "ndmvr");
    assert.equal(environment.browserDisplayCalls.at(-1).opt, "hist");
    assert.equal(environment.canvasMounts, 1);
    assert.equal(environment.browserPainters.length, 1);
});

test("default browser preserves mounted VR/renderer switching and visible control ownership", async (t) => {
    configure(t, ["pad1"]);
    environment = await mountComposition({
        kind: "browser",
        props: { file: "test.root", item: "h1", renderer: "jsroot" },
    });
    assert.equal(environment.browserPainters.length, 1);
    assert.equal(environment.browserProps.hierarchy, environment.browserPainters[0]);
    assert.equal(workspace().histogramsByPad.pad1.opts.render, "jsroot");
    assert.ok(environment.browserDisplayCalls.length > 0, "the initial item still displays");
    assert.ok(environment.browserDisplayCalls.every(({ path, opt }) => path === "h1" && opt === null));
    const initialDisplays = environment.browserDisplays.length;
    await environment.act(() => environment.browserPainters[0].display("programmatic", "lego"));
    assert.equal(environment.browserDisplays.length, initialDisplays + 1);
    assert.equal(workspace().histogramsByPad.pad1.obj.name, "programmatic");
    assert.deepEqual(environment.browserDisplayCalls.at(-1), { path: "programmatic", opt: "lego" });
    await environment.act(() => environment.browserProps.onSelect("h2"));
    assert.equal(environment.browserDisplays.length, initialDisplays + 2);
    assert.deepEqual(environment.browserDisplayCalls.at(-1), { path: "h2", opt: "" }, "clicks retain the initial null-option fallback");
    assert.equal(images("Fullscreen Button").length, 1);
    assert.equal(images("Show menu").length, 1);
    const canvas = dom().querySelector("[data-canvas]");
    const canvasBranch = canvas.parentElement.parentElement;
    const browserTree = dom().querySelector("#myTreeDiv");
    const browserMain = dom().querySelector("#myMainDiv");
    const switchInput = dom().querySelector("input[type=checkbox]");
    await environment.act(() => environment.browserProps.setRendererMode("ndmvr"));
    assert.equal(workspace().histogramsByPad.pad1.opts.render, "ndmvr");
    assert.equal(environment.canvasMounts, 1);
    await environment.click(switchInput);
    assert.equal(canvasBranch.style.display, "none");
    assert.equal(dom().querySelector("#myTreeDiv"), browserTree);
    assert.equal(dom().querySelector("#myMainDiv"), browserMain);
    assert.ok(environment.browserPainters[0].resizeCalls > 0);
    const outsideBase = (image) => !canvasBranch.contains(image);
    assert.equal(images("Fullscreen Button").filter(outsideBase).length, 1);
    assert.equal(images("Show menu").filter(outsideBase).length, 1);
    await environment.click(switchInput);
    assert.equal(canvasBranch.style.display, "flex");
    assert.equal(images("Fullscreen Button").length, 1);
    assert.equal(environment.canvasMounts, 1);
    assert.equal(environment.browserPainters.length, 1);
});

test("JsrootEnv retains its ordinary histogram Canvas without the cinema tab/stream", async (t) => {
    configure(t);
    environment = await mountComposition({ kind: "jsroot" });
    assert.equal(dom().querySelectorAll("button").length, 1);
    assert.equal(dom().querySelector("button").textContent, "Canvas");
    assert.equal(dom().querySelector("#cinema"), null);
    const pad = dom().querySelector("#pad1");
    Object.defineProperty(pad, "offsetParent", { configurable: true, value: dom() });
    const histogram = { id: "pad1", obj: { _typename: "TH1F", title: "ordinary" } };
    await environment.act(() => histogramSubjectGet().next(histogram));
    assert.equal(environment.redraws.length, 1);
    assert.equal(environment.redraws[0][0], "pad1");
    assert.equal(environment.redraws[0][1], histogram.obj);
});

test("StrictMode replay leaves one active keyboard collector and releases Content workspace on unmount", async (t) => {
    configure(t);
    const keyCollectors = new Set();
    const add = window.addEventListener;
    const remove = window.removeEventListener;
    t.mock.method(window, "addEventListener", function (type, callback, ...args) {
        if (type === "keydown") keyCollectors.add(callback);
        return add.call(this, type, callback, ...args);
    });
    t.mock.method(window, "removeEventListener", function (type, callback, ...args) {
        if (type === "keydown") keyCollectors.delete(callback);
        return remove.call(this, type, callback, ...args);
    });
    environment = await mountComposition({ kind: "env", strict: true });
    assert.equal(keyCollectors.size, 1);
    assert.deepEqual(padIds(), ["composition-a", "composition-b"]);
    await environment.key("keydown", "KeyW");
    assert.equal(useKeyboardStore.getState().keys.KeyW, true);
    await environment.unmount();
    assert.equal(keyCollectors.size, 0);
    assert.deepEqual(useKeyboardStore.getState().keys, {});
    assert.deepEqual(padIds(), []);
    assert.equal(useMenuStore.getState().menuExists, false);
});
