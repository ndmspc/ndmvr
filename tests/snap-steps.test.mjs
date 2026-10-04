import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { configSubjectGet } from "@ndmspc/ndmvr-core";
import { getShiftScaleStep } from "./helpers/load-bounds.mjs";

const subject = configSubjectGet();

beforeEach(() => {
    subject.next({
        config: {
            environment: {
                shiftScale: { enabled: true, step: { x: 11, y: 12, z: 13 } },
                histogramPads: [],
            },
        },
    });
});

test("schema-defined snap axes preserve configured values", () => {
    assert.deepEqual(
        getShiftScaleStep({
            config: {
                environment: {
                    shiftScale: {
                        step: { x: 2, y: 3, z: 4 },
                    },
                },
            },
        }),
        { x: 2, y: 3, z: 4 }
    );

    // The reader preserves zero/negative values; existing frame rules decide their behavior.
    assert.deepEqual(
        getShiftScaleStep({
            config: {
                environment: { shiftScale: { step: { x: 0, y: -2, z: 3 } } },
            },
        }),
        { x: 0, y: -2, z: 3 }
    );
});

test("missing schema-defined snap axes use the existing default", () => {
    assert.deepEqual(
        getShiftScaleStep({
            config: { environment: { shiftScale: { step: { x: 2 } } } },
        }),
        { x: 2, y: 10, z: 10 }
    );
    assert.deepEqual(
        getShiftScaleStep({ config: { environment: { shiftScale: {} } } }),
        { x: 10, y: 10, z: 10 }
    );
    assert.deepEqual(getShiftScaleStep({}), { x: 10, y: 10, z: 10 });
});

test("current canonical Core values supply normalized snap steps before interaction", () => {
    const current = subject.getValue();
    assert.equal(current.config.environment.shiftScale.step.isVector3, true);
    assert.deepEqual(getShiftScaleStep(current), { x: 11, y: 12, z: 13 });
});

test("Core replay and external same-root emissions produce fresh snap snapshots", () => {
    const snapshots = [];
    const subscription = subject
        .getObservable()
        .subscribe((config) => snapshots.push(getShiftScaleStep(config)));
    try {
        assert.deepEqual(snapshots, [{ x: 11, y: 12, z: 13 }]);

        subject.next({
            config: { environment: { shiftScale: { step: { x: 21, y: 22, z: 23 } } } },
        });
        assert.deepEqual(snapshots.at(-1), { x: 21, y: 22, z: 23 });

        const canonical = subject.getValue();
        canonical.config.environment.shiftScale.step.set(31, 32, 33);
        subject.appendPads(["snap-refresh"], "simple", {
            scale: { x: 4, y: 6, z: 8 },
            padding: { x: 0, y: 0, z: 0 },
            origin: { x: 1, y: 2, z: 3 },
        });

        assert.strictEqual(subject.getValue(), canonical);
        assert.deepEqual(snapshots, [
            { x: 11, y: 12, z: 13 },
            { x: 21, y: 22, z: 23 },
            { x: 31, y: 32, z: 33 },
        ]);
        assert.notStrictEqual(snapshots[1], snapshots[2]);
    } finally {
        subscription.unsubscribe();
    }
});
