import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import * as THREE from "three";
import { mountSpatial, origin } from "./helpers/load-spatial.mjs";

let environment;
afterEach(async () => {
    await environment?.unmount();
    environment = null;
});

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

function floating() {
    return [...environment.containers].filter((record) => record.props.ref);
}

function menuPanel() {
    return floating().find((record) => record.props.renderOrder === 5000);
}

function modeToolsPanel() {
    return floating().find((record) => record.props.classList?.includes("ModeToolsPanelXR"));
}

const grip = (options) => options.vr?.button === "xr-standard-squeeze";
const follow = (options) => options.vr?.button === "a-button";
const reset = (options) => options.keyboard === "KeyR";

function pointerTarget() {
    const held = new Set();
    return {
        captures: [],
        releases: [],
        setPointerCapture(id) {
            held.add(id);
            this.captures.push(id);
        },
        hasPointerCapture(id) {
            return held.has(id);
        },
        releasePointerCapture(id) {
            held.delete(id);
            this.releases.push(id);
        },
    };
}

function pointer(target, position, pointerId = 1) {
    return {
        target,
        pointerId,
        ray: new THREE.Ray(new THREE.Vector3(...position), new THREE.Vector3(0, 0, -1)),
    };
}

test("ref-free Menu and ModeToolsPanel siblings use the installed XROrigin runtime", async () => {
    environment = await mountSpatial({ kind: "ui" });
    assert.equal(
        environment.scene.camera.parent,
        environment.runtimeOrigin,
        "the real SDK XROrigin effect attaches the camera"
    );
    await environment.frame();
    assert.equal(environment.store.getState().origin, environment.runtimeOrigin);
    const menu = menuPanel();
    const modeTools = modeToolsPanel();
    assert.equal(floating().length, 2);
    vector(menu.group.position, [10, 3.2, -1]);
    vector(modeTools.group.position, [10, 0, -1.15]);
    assert.deepEqual(modeTools.props.classList, ["ModeToolsPanelXR"]);
    assert.equal(environment.container.querySelectorAll("[data-fullscreen]").length, 0);

    environment.runtimeOrigin.position.set(17, 4, 8);
    await environment.frame();
    vector(menu.group.position, [17, 5.2, 4]);
    vector(modeTools.group.position, [17, 2, 3.85]);
});

test("runtime origin replacement is observed in the same frame without remounting children", async () => {
    environment = await mountSpatial({ kind: "probe", props: { offset: { x: 1, y: 2, z: -3 } } });
    await environment.frame();
    const panel = floating()[0];
    const replacement = origin(-10, 6, 13);
    environment.scene.scene.add(replacement);
    replacement.add(environment.scene.camera);
    await environment.frame();
    assert.equal(environment.store.getState().origin, replacement);
    assert.equal(floating()[0], panel);
    vector(panel.group.position, [-9, 8, 10]);
    assert.equal(
        environment.runtimeOrigin.xrSpace,
        undefined,
        "SDK origin replacement clears the previous origin reference space"
    );
});

test("missing runtime origin waits for discovery and cannot start drag or toggle follow", async () => {
    environment = await mountSpatial({ kind: "probe" });
    const panel = floating()[0];
    const target = pointerTarget();
    await environment.input(grip, "onChange", true);
    await environment.frame(0.016, { sdk: false });
    await environment.input(follow, "onPress");
    await environment.act(() => panel.props.onPointerDown(pointer(target, [0, 1, 10])));
    vector(panel.group.position, [0, 0, 0]);
    assert.deepEqual(target.captures, []);
    assert.equal(sessionStorage.getItem("menuFollow"), null);
    await environment.frame();
    vector(panel.group.position, [10, 3.2, -1]);
    await environment.act(() => panel.props.onPointerDown(pointer(target, [10, 3.2, 10])));
    assert.deepEqual(target.captures, [1]);
});

test("ref-free follow toggle keeps placement, tracks the live origin, and reset restores defaults", async () => {
    environment = await mountSpatial({ kind: "probe" });
    await environment.frame();
    const panel = floating()[0];
    await environment.input(follow, "onPress");
    assert.equal(sessionStorage.getItem("menuFollow"), "false");
    assert.deepEqual(JSON.parse(sessionStorage.getItem("menuAnchor")), { x: 10, y: 2, z: 3 });
    environment.runtimeOrigin.position.set(20, 7, 8);
    await environment.frame();
    vector(panel.group.position, [10, 3.2, -1]);
    await environment.input(follow, "onPress");
    assert.equal(sessionStorage.getItem("menuFollow"), "true");
    assert.equal(sessionStorage.getItem("menuAnchor"), null);
    await environment.frame();
    vector(panel.group.position, [10, 3.2, -1]);
    environment.runtimeOrigin.position.set(21, 8, 9);
    await environment.frame();
    vector(panel.group.position, [11, 4.2, 0]);
    await environment.input(reset, "onPress");
    await environment.frame();
    vector(panel.group.position, [21, 9.2, 5]);
    assert.equal(sessionStorage.getItem("menuFollow"), "true");
    assert.deepEqual(JSON.parse(sessionStorage.getItem("menuOffset")), { x: 0, y: 1.2, z: -4 });
});

test("drag offsets resolve the current runtime origin and preserve pointer capture and persistence", async () => {
    environment = await mountSpatial({ kind: "probe", props: { offset: { x: 1, y: 2, z: -4 } } });
    await environment.frame();
    const panel = floating()[0];
    const target = pointerTarget();
    await environment.input(grip, "onChange", true);
    await environment.act(() => panel.props.onPointerDown(pointer(target, [11, 4, 10])));
    assert.deepEqual(target.captures, [1]);
    environment.runtimeOrigin.position.set(20, 3, 5);
    await environment.act(() => panel.props.onPointerMove(pointer(target, [15, 5, 10])));
    await environment.frame();
    vector(panel.group.position, [15, 5, -1]);
    await environment.act(() => panel.props.onPointerUp(pointer(target, [15, 5, 10])));
    assert.deepEqual(target.releases, [1]);
    assert.deepEqual(JSON.parse(sessionStorage.getItem("menuOffset")), { x: -5, y: 2, z: -6 });
    environment.runtimeOrigin.position.set(21, 4, 6);
    await environment.frame();
    vector(panel.group.position, [16, 6, 0]);
});

test("XR session exit cancels spatial drag and restores Menu overlay and ModeTools fullscreen", async () => {
    environment = await mountSpatial({ kind: "ui", xr: false });
    await environment.flushOverlay();
    assert.equal(environment.container.querySelectorAll("[data-fullscreen]").length, 2);
    assert.equal(floating().length, 0);
    const overlay = [...environment.containers][0];
    assert.equal(overlay.props.positionLeft, 16);
    assert.equal(overlay.props.positionTop, 16);
    assert.equal(overlay.props.transformScaleX, 1);

    await environment.enter();
    await environment.frame();
    assert.equal(floating().length, 2);
    assert.equal(environment.container.querySelectorAll("[data-fullscreen]").length, 0);
    const menu = menuPanel();
    const modeTools = modeToolsPanel();
    const target = pointerTarget();
    await environment.input(grip, "onChange", true);
    await environment.act(() => modeTools.props.onPointerDown(pointer(target, [10, 0, 10])));
    assert.deepEqual(target.captures, [1]);
    await environment.exit();
    await environment.flushOverlay();
    assert.deepEqual(target.releases, [1]);
    assert.equal(floating().length, 0);
    assert.equal(environment.container.querySelectorAll("[data-fullscreen]").length, 2);
    assert.equal(environment.store.getState().session, undefined);

    await environment.enter();
    await environment.frame();
    assert.equal(floating().length, 2);
    vector(menuPanel().group.position, menu.group.position.toArray());
    vector(modeToolsPanel().group.position, [10, 0, -1.15]);
});

test("floating desktop placement remains camera-relative with the camera quaternion", async () => {
    environment = await mountSpatial({ xr: false, props: { offset: { x: 1, y: 2, z: -3 } } });
    const camera = environment.scene.camera;
    camera.position.set(4, 5, 6);
    camera.rotation.set(0, Math.PI / 2, 0);
    await environment.frame();
    const panel = floating()[0];
    const expected = new THREE.Vector3(1, 2, -3)
        .applyQuaternion(camera.quaternion)
        .add(camera.position);
    vector(panel.group.position, expected.toArray());
    assert.ok(panel.group.quaternion.angleTo(camera.quaternion) < 1e-8);
    assert.equal(
        environment.store.getState().origin,
        environment.scene.scene,
        "the SDK still stores a desktop scene origin"
    );
});

test("non-facing desktop uses zero origin", async () => {
    environment = await mountSpatial({ xr: false, props: { faceUser: false } });
    environment.scene.scene.position.set(30, 40, 50);
    environment.scene.camera.position.set(100, 100, 100);
    await environment.frame();
    const panel = floating()[0];
    vector(panel.group.position, [0, 1.2, -4]);
});

test("persistent FloatingContainer switches between desktop and XR using the current session", async () => {
    environment = await mountSpatial({ xr: false });
    environment.scene.camera.position.set(2, 3, 4);
    await environment.frame();
    const panel = floating()[0];
    vector(panel.group.position, [2, 4.2, 0]);
    await environment.enter();
    await environment.frame();
    assert.equal(floating()[0], panel);
    vector(panel.group.position, [10, 3.2, -1]);
    await environment.exit();
    await environment.frame();
    vector(panel.group.position, [2, 4.2, 0]);
});

test("ModeToolsPanel follows and resets independently with its existing XR offset", async () => {
    environment = await mountSpatial({ kind: "ui" });
    await environment.frame();
    const modeTools = modeToolsPanel();
    await environment.input(follow, "onPress");
    environment.runtimeOrigin.position.set(15, 6, 9);
    await environment.frame();
    vector(modeTools.group.position, [10, 0, -1.15]);
    assert.equal(sessionStorage.getItem("modeToolsPanelFollow"), "false");
    await environment.input(reset, "onPress");
    await environment.frame();
    vector(modeTools.group.position, [15, 4, 4.85]);
    assert.deepEqual(JSON.parse(sessionStorage.getItem("modeToolsPanelOffset")), {
        x: 0,
        y: -2,
        z: -4.15,
    });
});

test("StrictMode replay leaves one origin/frame binding per composed spatial child", async () => {
    environment = await mountSpatial({ kind: "ui", strict: true });
    await environment.frame();
    assert.equal(floating().length, 2);
    assert.equal(environment.frames.size, 3);
    assert.equal([...environment.bindings].filter(({ options }) => follow(options)).length, 2);
    vector(menuPanel().group.position, [10, 3.2, -1]);
    vector(modeToolsPanel().group.position, [10, 0, -1.15]);
});
