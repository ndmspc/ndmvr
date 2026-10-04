import assert from "node:assert/strict";
import { setTimeout as waitForTimer } from "node:timers/promises";
import test from "node:test";
import { Observable } from "rxjs";
import { configSubjectGet, histogramSubjectGet, stateSubjectGet } from "@ndmspc/ndmvr-core";
import { retainHistogramWorkspace, useHistogramWorkspace } from "./helpers/load-workspace.mjs";

const workspace = () => useHistogramWorkspace.getState();
const padIds = () => workspace().pads.map((pad) => pad.id);
const histogram = (id) => ({ id, obj: { label: id }, opts: { render: "ndmvr" } });

function assertEmptyWorkspace() {
    assert.deepEqual(padIds(), []);
    assert.equal(workspace().activePadId, null);
    assert.deepEqual(workspace().histogramsByPad, {});
    assert.deepEqual(workspace().statesByPad, {});
}

// Wrap public observable methods without replacing their real Core/RxJS sources.
function adapterFixture(t, ids) {
    // Core logs every stream lookup/publication; keep TAP output readable.
    t.mock.method(console, "log", () => {});
    workspace().reset();
    const config = configSubjectGet();
    const originalPads = config.getValue().config.environment.histogramPads;
    const counters = new Map();
    const restorations = [];
    const releases = [];

    const counter = (key) => {
        if (!counters.has(key)) counters.set(key, { started: 0, active: 0 });
        return counters.get(key);
    };
    const track = (key, source) =>
        new Observable((subscriber) => {
            const count = counter(key);
            count.started += 1;
            count.active += 1;
            const subscription = source.subscribe({
                next: (value) => subscriber.next(value),
                error: (error) => subscriber.error(error),
                complete: () => subscriber.complete(),
            });
            return () => {
                subscription.unsubscribe();
                count.active -= 1;
            };
        });

    const instrument = (target, method, key) => {
        const descriptor = Object.getOwnPropertyDescriptor(target, method);
        const original = target[method];
        target[method] = function (...args) {
            const label = typeof key === "function" ? key(...args) : key;
            return track(label, original.apply(this, args));
        };
        restorations.push(() => {
            if (descriptor) Object.defineProperty(target, method, descriptor);
            else delete target[method];
        });
    };

    instrument(config, "getObservable", "config");
    instrument(histogramSubjectGet(), "getStream", (id) => `histogram:${id}`);
    for (const id of ids) instrument(stateSubjectGet(id), "getObservable", `state:${id}`);

    t.after(async () => {
        for (const release of releases) release();
        await waitForTimer(0);
        for (const restore of restorations.reverse()) restore();
        config.next({ config: { environment: { histogramPads: originalPads } } });
        workspace().reset();
    });

    const configure = (nextIds) =>
        config.next({ config: { environment: { histogramPads: nextIds.map((id) => ({ id })) } } });
    configure(ids);

    return {
        counter,
        configure,
        retain() {
            const release = retainHistogramWorkspace();
            releases.push(release);
            return release;
        },
        assertSubscriptions(expectedActive, expectedStarted = 1, trackedIds = ids) {
            assert.deepEqual(counter("config"), {
                started: expectedStarted,
                active: expectedActive,
            });
            for (const id of trackedIds) {
                for (const kind of ["histogram", "state"]) {
                    assert.deepEqual(counter(`${kind}:${id}`), {
                        started: expectedStarted,
                        active: expectedActive,
                    });
                }
            }
        },
    };
}

test("configured pads keep the first unique ID and preserve a valid active selection", () => {
    workspace().reset();
    const first = { id: "a", position: { x: 1, y: 2, z: 3 } };
    const second = { id: "b" };
    workspace().replacePads([null, {}, { id: "" }, first, { id: "a" }, second]);

    assert.deepEqual(workspace().pads, [first, second]);
    assert.equal(workspace().activePadId, "a");

    workspace().activatePad("b");
    workspace().replacePads([{ id: "c" }, second, first]);
    assert.equal(workspace().activePadId, "b");
    workspace().activatePad("missing");
    assert.equal(workspace().activePadId, "b");

    workspace().replacePads([first, { id: "c" }]);
    assert.equal(workspace().activePadId, "a");
    workspace().replacePads([]);
    assertEmptyWorkspace();
});

test("data updates preserve user selection and ignore unconfigured pad IDs", () => {
    workspace().reset();
    workspace().replacePads([{ id: "a" }, { id: "b" }]);
    workspace().activatePad("b");
    const data = histogram("a");
    const state = { selectedArray: "error" };
    workspace().receiveHistogram("a", data);
    workspace().receivePadState("a", state);

    assert.equal(workspace().activePadId, "b");
    assert.strictEqual(workspace().histogramsByPad.a, data);
    assert.deepEqual(workspace().statesByPad.a, state);

    const beforeUnknownUpdates = workspace();
    workspace().receiveHistogram("missing", histogram("missing"));
    workspace().receivePadState("missing", { selectedArray: "content" });
    assert.strictEqual(workspace(), beforeUnknownUpdates);
    workspace().reset();
});

test("drawing-state mirrors detach the envelope while sharing nested Core values", () => {
    workspace().reset();
    workspace().replacePads([{ id: "a" }]);
    const arrays = ["content", "error"];
    const state = { selectedArray: "content", arrays, currentLayer: 1 };
    workspace().receivePadState("a", state);
    const first = workspace().statesByPad.a;

    assert.notStrictEqual(first, state);
    assert.strictEqual(first.arrays, arrays);
    state.currentLayer = 2;
    assert.equal(first.currentLayer, 1);
    workspace().receivePadState("a", state);
    assert.notStrictEqual(workspace().statesByPad.a, first);
    assert.equal(workspace().statesByPad.a.currentLayer, 2);
    assert.strictEqual(workspace().statesByPad.a.arrays, arrays);

    workspace().receivePadState("a", undefined);
    assert.equal(workspace().statesByPad.a, undefined);
    assert.equal(workspace().activePadId, "a");
    workspace().reset();
});

test("pad reconciliation prunes removed caches and rejects late updates", () => {
    workspace().reset();
    workspace().replacePads([{ id: "a" }, { id: "b" }]);
    const retainedHistogram = histogram("b");
    const retainedState = { selectedArray: "error", currentLayer: 2 };
    workspace().receiveHistogram("a", histogram("a"));
    workspace().receiveHistogram("b", retainedHistogram);
    workspace().receivePadState("a", { selectedArray: "content" });
    workspace().receivePadState("b", retainedState);
    workspace().activatePad("a");

    workspace().replacePads([{ id: "b" }, { id: "c" }]);
    assert.equal(workspace().activePadId, "b");
    assert.deepEqual(workspace().histogramsByPad, { b: retainedHistogram });
    assert.deepEqual(workspace().statesByPad, { b: retainedState });

    const afterRemoval = workspace();
    workspace().receiveHistogram("a", histogram("a"));
    workspace().receivePadState("a", { currentLayer: 99 });
    assert.strictEqual(workspace(), afterRemoval);
    workspace().replacePads([]);
    assertEmptyWorkspace();
});

test("the adapter replays Core data and reconciles subscriptions without changing selection", async (t) => {
    const [a, b, c] = ["workspace-replay-a", "workspace-replay-b", "workspace-replay-c"];
    const fixture = adapterFixture(t, [a, b, c]);
    fixture.configure([a, b]);
    const seededState = { ...stateSubjectGet(a).getValue(), currentLayer: 3 };
    stateSubjectGet(a).next(seededState);
    const seededHistogram = histogram(a);
    await histogramSubjectGet().next(seededHistogram);
    const release = fixture.retain();

    assert.deepEqual(padIds(), [a, b]);
    assert.equal(workspace().activePadId, a);
    assert.deepEqual(workspace().statesByPad[a], seededState);
    assert.strictEqual(workspace().histogramsByPad[a], seededHistogram);
    fixture.assertSubscriptions(1, 1, [a, b]);
    assert.deepEqual(fixture.counter(`state:${c}`), { started: 0, active: 0 });

    workspace().activatePad(b);
    const retainedHistogram = histogram(b);
    await histogramSubjectGet().next(retainedHistogram);
    assert.strictEqual(workspace().histogramsByPad[b], retainedHistogram);
    assert.equal(workspace().activePadId, b);
    fixture.configure([c, b]);

    assert.deepEqual(padIds(), [c, b]);
    assert.equal(workspace().activePadId, b);
    assert.deepEqual(workspace().histogramsByPad, { [b]: retainedHistogram });
    assert.equal(workspace().statesByPad[a], undefined);
    for (const kind of ["histogram", "state"]) {
        assert.deepEqual(fixture.counter(`${kind}:${a}`), { started: 1, active: 0 });
        assert.deepEqual(fixture.counter(`${kind}:${b}`), { started: 1, active: 1 });
        assert.deepEqual(fixture.counter(`${kind}:${c}`), { started: 1, active: 1 });
    }

    stateSubjectGet(a).next({ ...seededState, currentLayer: 99 });
    await histogramSubjectGet().next(histogram(a));
    assert.equal(workspace().statesByPad[a], undefined);
    assert.equal(workspace().histogramsByPad[a], undefined);
    const updatedState = { ...stateSubjectGet(b).getValue(), currentLayer: 4 };
    stateSubjectGet(b).next(updatedState);
    assert.deepEqual(workspace().statesByPad[b], updatedState);
    assert.equal(workspace().activePadId, b);

    release();
    await waitForTimer(0);
    fixture.assertSubscriptions(0);
    assertEmptyWorkspace();
});

test("two owners share subscriptions and idempotent release stops only after the final owner", async (t) => {
    const id = "workspace-shared-owner";
    const fixture = adapterFixture(t, [id]);
    const releaseFirst = fixture.retain();
    const releaseSecond = fixture.retain();
    fixture.assertSubscriptions(1);

    releaseFirst();
    releaseFirst();
    await waitForTimer(0);
    fixture.assertSubscriptions(1);
    assert.deepEqual(padIds(), [id]);

    releaseSecond();
    releaseSecond();
    fixture.assertSubscriptions(1);
    assert.deepEqual(padIds(), [id]);
    await waitForTimer(0);
    fixture.assertSubscriptions(0);
    assertEmptyWorkspace();

    const releaseRestarted = fixture.retain();
    fixture.assertSubscriptions(1, 2);
    assert.deepEqual(padIds(), [id]);
    releaseRestarted();
    await waitForTimer(0);
    fixture.assertSubscriptions(0, 2);
    assertEmptyWorkspace();
});

test("same-object Core emissions notify drawing-state selectors without changing workspace lifetime", (t) => {
    const [a, b] = ["workspace-mirror-a", "workspace-mirror-b"];
    const fixture = adapterFixture(t, [a, b]);
    fixture.retain();
    workspace().activatePad(b);
    const arrays = ["content", "error"];
    const source = {
        ...stateSubjectGet(a).getValue(),
        arrays,
        selectedArray: "content",
        currentLayer: 1,
    };
    stateSubjectGet(a).next(source);
    const first = workspace().statesByPad[a];

    const notifications = [];
    let selected = first;
    const unsubscribe = useHistogramWorkspace.subscribe((state) => {
        const next = state.statesByPad[a];
        if (!Object.is(selected, next)) {
            notifications.push(next);
            selected = next;
        }
    });
    t.after(unsubscribe);

    source.currentLayer = 4;
    source.selectedArray = "error";
    stateSubjectGet(a).next(source);
    const second = workspace().statesByPad[a];

    assert.strictEqual(stateSubjectGet(a).getValue(), source);
    assert.notStrictEqual(second, source);
    assert.notStrictEqual(second, first);
    assert.equal(first.currentLayer, 1);
    assert.equal(second.currentLayer, 4);
    assert.equal(second.selectedArray, "error");
    assert.strictEqual(second.arrays, arrays);
    assert.deepEqual(notifications, [second]);

    stateSubjectGet(a).next(source);
    assert.equal(notifications.length, 2);
    assert.notStrictEqual(notifications[0], notifications[1]);
    assert.equal(workspace().activePadId, b);
    fixture.assertSubscriptions(1);
});

test("immediate reacquisition cancels teardown and preserves selection and cached data", async (t) => {
    const ids = ["workspace-remount-a", "workspace-remount-b"];
    const fixture = adapterFixture(t, ids);
    const releaseInitial = fixture.retain();
    const data = histogram(ids[0]);
    workspace().receiveHistogram(ids[0], data);
    workspace().activatePad(ids[1]);

    releaseInitial();
    const releaseReplacement = fixture.retain();
    await waitForTimer(0);

    fixture.assertSubscriptions(1);
    assert.equal(workspace().activePadId, ids[1]);
    assert.strictEqual(workspace().histogramsByPad[ids[0]], data);

    releaseReplacement();
    await waitForTimer(0);
    fixture.assertSubscriptions(0);
    assertEmptyWorkspace();
});
