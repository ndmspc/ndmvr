import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import * as THREE from "three";
import { mesh, mountWrapper } from "./helpers/load-histogram-wrapper.mjs";

let environment;
let originalLog;
let originalWarn;
let originalError;
let messages;

beforeEach(() => {
    messages = [];
    originalLog = console.log;
    originalWarn = console.warn;
    originalError = console.error;
    console.log = (...args) => messages.push(args);
    console.warn = (...args) => messages.push(args);
    console.error = (...args) => messages.push(args);
});

afterEach(async () => {
    await environment?.unmount();
    environment = null;
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
});

function assertDisposed(object) {
    assert.ok(object.userData.geometryDisposals > 0, `${object.name} geometry disposed`);
    assert.ok(object.userData.materialDisposals > 0, `${object.name} material disposed`);
}

function assertNestedRetired(painter) {
    assert.equal(painter.removeCalls, 1);
    for (const name of ["functionSub", "configSub", "dispatchSub", "stateSub"]) {
        assert.equal(painter[name].closed, true, `${name} unsubscribed`);
    }
    assert.equal(painter.wireframe.stateSub.closed, true);
    assert.equal(environment.primitives.has(painter.mesh.uuid), false);
    assert.equal(environment.primitives.has(painter.wireframe.wireframe.uuid), false);
}

test("pending JSROOT replacement cannot publish through the replacement painter", async () => {
    environment = await mountWrapper();
    await environment.emit("jsroot");
    const retired = environment.jsrootPainters[0];
    await environment.emit("jsroot");
    const current = environment.jsrootPainters[1];
    assert.ok(current, "pending update creates a replacement painter");
    assert.equal(retired.removeCalls, 1);

    await environment.settle(retired.operations[0]);
    assert.equal(retired.getMeshCalls, 0);
    assert.equal(current.getMeshCalls, 0, "old completion never reads the new instance");
    assert.equal(environment.primitives.size, 0);
    assert.equal(document.getElementById(current.dummyEl.id), current.dummyEl);

    await environment.settle(current.operations[0]);
    assert.equal(current.getMeshCalls, 1);
    assert.ok(environment.primitives.has(current.histogramGroup.uuid));
    assert.deepEqual(environment.frame.position.toArray(), [3, 4, 5]);
    assert.deepEqual(environment.frame.scale.toArray(), [6, 7, 8]);
});

test("settled JSROOT updates reuse the painter and preserve error recovery", async () => {
    environment = await mountWrapper();
    await environment.emit("jsroot");
    const painter = environment.jsrootPainters[0];
    await environment.settle(painter.operations[0]);
    await environment.emit("jsroot");
    assert.equal(environment.jsrootPainters.length, 1);
    await environment.settle(painter.operations[1], { reject: new Error("build failed") });
    assert.equal(environment.errorVisible(), true);

    await environment.emit("jsroot");
    await environment.settle(painter.operations[2]);
    assert.equal(environment.errorVisible(), false);
    assert.ok(environment.primitives.has(painter.histogramGroup.uuid));
});

test("retired JSROOT resolves and rejections cannot alter the THn branch", async () => {
    environment = await mountWrapper();
    await environment.emit("jsroot");
    const resolving = environment.jsrootPainters[0];
    await environment.emit("nested");
    const nested = environment.nestedPainters[0];
    await environment.settle(nested.operations[0]);
    await environment.settle(resolving.operations[0]);
    assert.equal(resolving.getMeshCalls, 0);
    assert.ok(environment.primitives.has(nested.mesh.uuid));

    await environment.emit("jsroot");
    const rejecting = environment.jsrootPainters[1];
    await environment.emit("nested");
    const replacement = environment.nestedPainters[1];
    await environment.settle(replacement.operations[0]);
    const frame = environment.frame;
    await environment.settle(rejecting.operations[0], { reject: new Error("retired build") });
    assert.equal(environment.errorVisible(), false);
    assert.equal(environment.frame, frame);
    assert.ok(environment.primitives.has(replacement.mesh.uuid));
});

test("pending THn replacement guards completion, interception, and old-mesh raycasts", async () => {
    environment = await mountWrapper();
    await environment.emit("nested");
    const retired = environment.nestedPainters[0];
    await environment.emit("nested");
    const current = environment.nestedPainters[1];
    assert.ok(current, "pending render is replaced");
    assert.equal(retired.removeCalls, 1);
    await environment.act(() => retired.pushVisibleInstances());
    assert.equal(retired.pushCalls, 0, "retired interception skips the original Core mutation");

    await environment.settle(current.operations[0]);
    const currentFrame = environment.frame;
    await environment.settle(retired.operations[0]);
    assert.ok(environment.primitives.has(current.mesh.uuid));
    assert.equal(environment.primitives.has(retired.mesh.uuid), false);
    assert.equal(environment.frame, currentFrame);

    const oldMesh = current.mesh;
    await environment.emit("nested");
    await environment.emit("nested");
    const replacement = environment.nestedPainters.at(-1);
    await environment.settle(replacement.operations[0]);
    oldMesh.raycast(environment.scene.raycaster, []);
    assert.equal(current.raycastCalls, 0);
    assert.equal(replacement.raycastCalls, 0, "old mesh cannot raycast using the new painter");
});

test("settled THn updates reuse the painter and publish only after the owned operation", async () => {
    environment = await mountWrapper();
    await environment.emit("nested");
    const painter = environment.nestedPainters[0];
    await environment.settle(painter.operations[0]);
    const previousMesh = painter.mesh;
    await environment.emit("nested");
    assert.equal(environment.nestedPainters.length, 1);
    assert.equal(painter.operations[1].kind, "update");

    painter.nextMesh = mesh("updated-nested");
    await environment.act(() => painter.pushVisibleInstances());
    assert.equal(painter.pushCalls, 1);
    assert.ok(environment.primitives.has(previousMesh.uuid));
    assert.equal(
        environment.primitives.has(painter.mesh.uuid),
        false,
        "interception defers publication while updating"
    );
    await environment.settle(painter.operations[1]);
    assert.ok(environment.primitives.has(painter.mesh.uuid));
    assert.equal(environment.primitives.has(previousMesh.uuid), false);
});

test("THn creation and update rejections are handled without stale error state", async () => {
    environment = await mountWrapper();
    await environment.emit("nested");
    const creation = environment.nestedPainters[0];
    await environment.settle(creation.operations[0], { reject: new Error("render rejected") });
    assert.equal(environment.errorVisible(), false);
    assertNestedRetired(creation);
    assert.ok(messages.some((entry) => entry.some((value) => value instanceof Error)));

    await environment.emit("nested");
    const painter = environment.nestedPainters.at(-1);
    await environment.settle(painter.operations.at(-1));
    await environment.emit("nested");
    await environment.settle(painter.operations.at(-1), { reject: new Error("update rejected") });
    assert.equal(environment.errorVisible(), false);
    assertNestedRetired(painter);
});

test("retired THn rejection is consumed without changing the current JSROOT scene", async () => {
    environment = await mountWrapper();
    await environment.emit("nested");
    const retired = environment.nestedPainters[0];
    await environment.emit("jsroot");
    const current = environment.jsrootPainters[0];
    await environment.settle(current.operations[0]);
    const frame = environment.frame;
    const rejection = new Error("retired nested render rejected");
    await environment.settle(retired.operations[0], { reject: rejection });
    assert.ok(environment.primitives.has(current.histogramGroup.uuid));
    assert.equal(environment.frame, frame);
    assert.equal(environment.errorVisible(), false);
    assert.equal(
        messages.some((entry) => entry.includes(rejection)),
        false
    );
});

test("live nested mesh replacements and wireframe resources are cleaned on unmount", async () => {
    environment = await mountWrapper();
    await environment.emit("nested");
    const painter = environment.nestedPainters[0];
    await environment.settle(painter.operations[0]);
    painter.nextMesh = mesh("live-replacement");
    await environment.act(() => painter.pushVisibleInstances());
    const liveMesh = painter.mesh;
    const wireframe = painter.wireframe.wireframe;
    await environment.unmount();
    assert.equal(painter.removeCalls, 1);
    assertDisposed(liveMesh);
    assertDisposed(wireframe);
    assert.equal(painter.wireframe.stateSub.closed, true);
    assert.equal(environment.primitives.size, 0);
});

test("nested redraw keeps its reused material alive until final retirement", async () => {
    environment = await mountWrapper();
    await environment.emit("nested");
    const painter = environment.nestedPainters[0];
    await environment.settle(painter.operations[0]);
    const originalMesh = painter.mesh;
    const redrawnMesh = mesh("redrawn-with-shared-material");
    redrawnMesh.material.dispose();
    redrawnMesh.material = originalMesh.material;
    painter.nextMesh = redrawnMesh;
    await environment.act(() => painter.pushVisibleInstances());
    assert.ok(environment.primitives.has(redrawnMesh.uuid));
    assert.ok(originalMesh.userData.geometryDisposals > 0);
    assert.equal(originalMesh.userData.materialDisposals, 0, "shared live material is preserved");
    await environment.unmount();
    assert.ok(
        originalMesh.userData.materialDisposals > 0,
        "retirement disposes the shared material"
    );
});

test("nested redraw keeps reused geometry and an unchanged wireframe helper alive", async () => {
    environment = await mountWrapper();
    await environment.emit("nested");
    const painter = environment.nestedPainters[0];
    await environment.settle(painter.operations[0]);
    const originalMesh = painter.mesh;
    const originalWireframe = painter.wireframe;
    const redrawnMesh = mesh("redrawn-with-shared-geometry");
    redrawnMesh.geometry.dispose();
    redrawnMesh.geometry = originalMesh.geometry;
    painter.nextMesh = redrawnMesh;
    await environment.act(() => painter.pushVisibleInstances());
    assert.ok(environment.primitives.has(redrawnMesh.uuid));
    assert.equal(originalMesh.userData.geometryDisposals, 0, "shared live geometry is preserved");
    assert.equal(painter.wireframe, originalWireframe);
    assert.equal(originalWireframe.stateSub.closed, false);
    await environment.unmount();
    assert.ok(originalMesh.userData.geometryDisposals > 0);
    assert.equal(originalWireframe.stateSub.closed, true);
});

test("settled THn updates release replaced wireframe helpers without disposing the new one", async () => {
    environment = await mountWrapper();
    await environment.emit("nested");
    const painter = environment.nestedPainters[0];
    await environment.settle(painter.operations[0]);
    const previous = painter.wireframe;
    const replacement = {
        ...previous,
        wireframe: mesh("replacement-wireframe"),
        stateSub: {
            closed: false,
            unsubscribe() {
                this.closed = true;
            },
        },
    };
    replacement.instGeom = replacement.wireframe.geometry;
    replacement.material = replacement.wireframe.material;
    painter.nextWireframe = replacement;
    await environment.emit("nested");
    assert.equal(previous.stateSub.closed, true);
    assertDisposed(previous.wireframe);
    assert.equal(replacement.stateSub.closed, false);
    assert.equal(replacement.wireframe.userData.materialDisposals, 0);
    await environment.settle(painter.operations[1]);
    assert.ok(environment.primitives.has(replacement.wireframe.uuid));
    await environment.unmount();
    assert.equal(replacement.stateSub.closed, true);
    assertDisposed(replacement.wireframe);
});

test("old primitive events cannot call the replacement painter while current events still work", async () => {
    environment = await mountWrapper();
    await environment.emit("nested");
    const retired = environment.nestedPainters[0];
    await environment.settle(retired.operations[0]);
    const oldPrimitive = environment.primitives.get(retired.mesh.uuid);
    await environment.emit("jsroot");
    await environment.emit("nested");
    const current = environment.nestedPainters[1];
    await environment.settle(current.operations[0]);
    const event = (object) => ({
        type: "dblclick",
        object,
        intersections: [{ object, index: [], range: [], point: new THREE.Vector3() }],
        nativeEvent: {},
    });
    await environment.act(() => oldPrimitive.onDoubleClick(event(retired.mesh)));
    assert.equal(current.intersectionCalls.length, 0);
    assert.equal(retired.intersectionCalls.length, 0);
    assert.equal(environment.activations.length, 0);
    await environment.act(() =>
        environment.primitives.get(current.mesh.uuid).onDoubleClick(event(current.mesh))
    );
    assert.equal(current.intersectionCalls.length, 1);
    assert.equal(current.intersectionCalls[0].source, "mousedbclick");
    assert.deepEqual(environment.activations, ["pad-1"]);
});

test("THn cleanup fallbacks survive Core removal failure and remove both keyup bindings", async () => {
    environment = await mountWrapper();
    await environment.emit("nested");
    const painter = environment.nestedPainters[0];
    await environment.settle(painter.operations[0]);
    painter.removeError = new Error("Core removal failed");
    await environment.unmount();
    for (const name of ["functionSub", "configSub", "dispatchSub", "stateSub"]) {
        assert.equal(painter[name].closed, true, `${name} unsubscribed`);
    }
    assert.equal(painter.wireframe.stateSub.closed, true);
    window.dispatchEvent(new window.KeyboardEvent("keydown"));
    window.dispatchEvent(new window.KeyboardEvent("keyup"));
    assert.equal(painter.keyUpCalls, 0);
    assertDisposed(painter.mesh);
    assertDisposed(painter.wireframe.wireframe);
});

test("detached JSROOT cleanup closes subscriptions, removes DOM, and disposes bin-info", async () => {
    environment = await mountWrapper();
    await environment.emit("jsroot");
    const painter = environment.jsrootPainters[0];
    await environment.settle(painter.operations[0]);
    const histogramMesh = painter.histogramGroup.children[0];
    const binInfoMesh = painter.binInfoComponent.group.children[0];
    painter.histogramGroup.removeFromParent();
    await environment.emit("nested");
    assert.equal(painter.removeCalls, 1);
    assert.equal(painter.configSub.closed, true);
    assert.equal(painter.sub.closed, true);
    assert.equal(painter.dummyEl.isConnected, false);
    assert.equal(painter.binInfoComponent.queueSub.closed, true);
    assert.equal(painter.binInfoComponent.group.parent, null);
    assertDisposed(histogramMesh);
    assertDisposed(binInfoMesh);
});

test("late retired JSROOT resources are disposed without removing replacement DOM", async () => {
    environment = await mountWrapper();
    await environment.emit("jsroot");
    const retired = environment.jsrootPainters[0];
    await environment.emit("jsroot");
    const current = environment.jsrootPainters[1];
    const lateMesh = mesh("late-jsroot-build");
    await environment.settle(retired.operations[0], {
        before: () => retired.histogramGroup.add(lateMesh),
    });
    assertDisposed(lateMesh);
    assert.equal(retired.removeCalls, 1, "Core.remove is never called twice on old ID");
    assert.equal(document.getElementById(current.dummyEl.id), current.dummyEl);
});

test("late retired THn resources are disposed without publishing them", async () => {
    environment = await mountWrapper();
    await environment.emit("nested");
    const retired = environment.nestedPainters[0];
    await environment.emit("jsroot");
    const lateMesh = mesh("late-nested-render");
    await environment.settle(retired.operations[0], {
        before: () => {
            retired.mesh = lateMesh;
            retired.instGeom = lateMesh.geometry;
            retired.material = lateMesh.material;
        },
    });
    assertDisposed(lateMesh);
    assert.equal(retired.removeCalls, 1);
    assert.equal(environment.primitives.has(lateMesh.uuid), false);
});

test("id, camera, and scene changes retire the owned instances and resubscribe", async () => {
    environment = await mountWrapper();
    await environment.emit("nested");
    const first = environment.nestedPainters[0];
    await environment.settle(first.operations[0]);
    await environment.rerender({ id: "pad-2" });
    assert.equal(first.removeCalls, 1);
    await environment.emit("nested", "pad-1");
    assert.equal(environment.nestedPainters.length, 1);

    await environment.emit("nested");
    const second = environment.nestedPainters[1];
    await environment.rerender({ camera: new THREE.PerspectiveCamera() });
    assert.equal(second.removeCalls, 1);
    const third = environment.nestedPainters[2];
    assert.ok(third, "replay belongs to the new camera effect");
    await environment.rerender({ scene: new THREE.Scene() });
    assert.equal(third.removeCalls, 1);
    const fourth = environment.nestedPainters[3];
    assert.ok(fourth, "replay belongs to the new scene effect");
    await environment.settle(second.operations[0]);
    await environment.settle(third.operations[0]);
    assert.equal(environment.primitives.size, 0);
    await environment.settle(fourth.operations[0]);
    assert.ok(environment.primitives.has(fourth.mesh.uuid));
});

test("unmount prevents pending publication and later stream emissions", async () => {
    environment = await mountWrapper();
    await environment.emit("jsroot");
    const painter = environment.jsrootPainters[0];
    await environment.unmount();
    await environment.settle(painter.operations[0]);
    await environment.emit("nested");
    assert.equal(painter.getMeshCalls, 0);
    assert.equal(painter.removeCalls, 1);
    assert.equal(environment.nestedPainters.length, 0);
    assert.equal(environment.primitives.size, 0);
});

test("StrictMode replay retires the first instance without invalidating its replacement", async () => {
    environment = await mountWrapper({ strict: true, initialRenderer: "nested" });
    const [retired, current] = environment.nestedPainters;
    assert.ok(current);
    assert.equal(retired.removeCalls, 1);
    await environment.settle(retired.operations[0]);
    assert.equal(environment.primitives.size, 0);
    await environment.settle(current.operations[0]);
    assert.ok(environment.primitives.has(current.mesh.uuid));
    await environment.unmount();
    assert.equal(retired.removeCalls, 1);
    assert.equal(current.removeCalls, 1);
});

test("delayed single clicks are canceled when the painter is retired", async (context) => {
    context.mock.timers.enable({ apis: ["setTimeout"] });
    environment = await mountWrapper();
    await environment.emit("nested");
    const painter = environment.nestedPainters[0];
    await environment.settle(painter.operations[0]);
    const primitive = environment.primitives.get(painter.mesh.uuid);
    const hit = { object: painter.mesh, index: [], range: [], point: new THREE.Vector3() };
    await environment.act(() =>
        primitive.onClick({
            type: "click",
            object: painter.mesh,
            intersections: [hit],
            nativeEvent: { detail: 1 },
        })
    );
    await environment.emit("jsroot");
    await environment.act(() => context.mock.timers.tick(301));
    assert.equal(painter.intersectionCalls.length, 0);
    assert.deepEqual(environment.activations, ["pad-1"]);
});
