import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { beforeEach, test } from "node:test";
import { configSubjectGet } from "@ndmspc/ndmvr-core";

const subject = configSubjectGet();
const pad = (id) => ({
    id,
    position: { x: 1, y: 2, z: 3 },
    scale: { x: 4, y: 5, z: 6 },
});

beforeEach(() => {
    subject.next({
        config: {
            environment: {
                desktopSpeed: 7,
                vrSpeed: 3,
                camera: { position: { x: 1, y: 2, z: 3 } },
                histogramPads: [pad("contract-a"), pad("contract-b")],
            },
            histogram: { scale: { default: { min: 0.1, max: 0.9 } } },
        },
    });
});

test("configuration contracts use the installed pinned Core artifact", async () => {
    const project = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
    const installed = JSON.parse(
        await readFile(
            new URL("../package.json", import.meta.resolve("@ndmspc/ndmvr-core")),
            "utf8"
        )
    );

    // An upgrade requires deliberately rechecking these observed contracts.
    assert.equal(project.dependencies["@ndmspc/ndmvr-core"], "1.2.0-rc.4");
    assert.equal(installed.version, project.dependencies["@ndmspc/ndmvr-core"]);
});

test("configuration subscribers immediately receive the canonical current value", () => {
    const emissions = [];
    const subscription = subject.getObservable().subscribe((value) => emissions.push(value));
    try {
        assert.equal(emissions.length, 1);
        assert.strictEqual(emissions[0], subject.getValue());

        const published = subject.next({ config: { environment: { desktopSpeed: 11 } } });
        assert.equal(emissions.length, 2);
        assert.strictEqual(emissions[1], published);
        assert.strictEqual(published, subject.getValue());
    } finally {
        subscription.unsubscribe();
    }

    subject.next({ config: { environment: { desktopSpeed: 12 } } });
    assert.equal(emissions.length, 2);
});

test("scalar patches preserve configured pads and unrelated configuration", () => {
    const previous = subject.getValue();
    const previousPads = previous.config.environment.histogramPads;
    const published = subject.next({ config: { environment: { desktopSpeed: 13 } } });

    assert.notStrictEqual(published, previous);
    assert.equal(previous.config.environment.desktopSpeed, 7);
    assert.equal(published.config.environment.desktopSpeed, 13);
    assert.equal(published.config.environment.vrSpeed, 3);
    assert.deepEqual(published.config.environment.histogramPads, previousPads);
    assert.deepEqual(
        published.config.histogram.scale.default,
        previous.config.histogram.scale.default
    );
});

test("an explicit pad array replaces the previous array", () => {
    const published = subject.next({
        config: { environment: { histogramPads: [pad("replacement")] } },
    });

    assert.deepEqual(
        published.config.environment.histogramPads.map(({ id }) => id),
        ["replacement"]
    );
    assert.equal(published.config.environment.desktopSpeed, 7);
});

test("Core normalizes complete coordinates and grid recipes with the supplied prefix", () => {
    const published = subject.next({
        config: {
            environment: {
                camera: { position: { x: 4, y: 5, z: 6 } },
                histogramPads: {
                    type: "grid2x1x1",
                    prefix: "contract-",
                    scale: { x: 12, y: 8, z: 6 },
                    padding: { x: 0, y: 0, z: 0 },
                    origin: { x: 1, y: 2, z: 5 },
                },
            },
        },
    });
    const environment = published.config.environment;

    assert.equal(environment.camera.position.isVector3, true);
    assert.deepEqual(environment.camera.position.toArray(), [4, 5, 6]);
    assert.deepEqual(
        environment.histogramPads.map(({ id }) => id),
        ["contract-1", "contract-2"]
    );
    assert.deepEqual(
        environment.histogramPads.map(({ position }) => position.toArray()),
        [
            [4, 6, 2],
            [10, 6, 2],
        ]
    );
    for (const configuredPad of environment.histogramPads) {
        assert.equal(configuredPad.scale.isVector3, true);
        assert.deepEqual(configuredPad.scale.toArray(), [6, 8, 6]);
    }
});

test("partial coordinates replace normalized vectors, so publishers need complete triples", () => {
    assert.equal(subject.getValue().config.environment.camera.position.isVector3, true);
    const published = subject.next({ config: { environment: { camera: { position: { x: 9 } } } } });
    const position = published.config.environment.camera.position;

    assert.equal(position.x, 9);
    assert.equal(position.y, undefined);
    assert.equal(position.z, undefined);
    assert.notEqual(position.isVector3, true);
});

test("appendPads mutates and re-emits the same canonical root", () => {
    const previous = subject.getValue();
    const emissions = [];
    const subscription = subject.getObservable().subscribe((value) => emissions.push(value));
    try {
        subject.appendPads(["appended"], "simple", {
            scale: { x: 4, y: 6, z: 8 },
            padding: { x: 0, y: 0, z: 0 },
            origin: { x: 1, y: 2, z: 3 },
        });

        assert.equal(emissions.length, 2);
        assert.strictEqual(emissions[1], previous);
        assert.strictEqual(subject.getValue(), previous);
        assert.deepEqual(
            previous.config.environment.histogramPads.map(({ id }) => id),
            ["contract-a", "contract-b", "appended"]
        );
        const appended = previous.config.environment.histogramPads.at(-1);
        assert.deepEqual(appended.position, { x: 3, y: 5, z: -1 });
        assert.deepEqual(appended.scale, { x: 4, y: 6, z: 8 });
    } finally {
        subscription.unsubscribe();
    }
});
