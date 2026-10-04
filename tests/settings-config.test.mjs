import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { beforeEach, test } from "node:test";
import { configSubjectGet } from "@ndmspc/ndmvr-core";
import {
    buildEnvironmentFromSettings,
    buildSettingsImport,
    createValidator,
    flattenSchema,
    getSettingsDefaults,
    readSettings,
} from "./helpers/load-settings.mjs";

const schema = JSON.parse(
    await readFile(new URL("../src/lib/config/ndmvrConfigOpenApi.json", import.meta.url), "utf8")
);
const allFields = flattenSchema(schema.components.schemas.Config.properties.environment);
const scalarFields = Object.fromEntries(
    Object.entries(allFields).filter(([path]) => !path.startsWith("histogramPads."))
);
const gridFields = Object.fromEntries(
    Object.entries(allFields).filter(([path]) => path.startsWith("histogramPads."))
);
const validate = createValidator(schema);
const subject = configSubjectGet();
const environment = () => subject.getValue().config.environment;
const pad = (id) => ({
    id,
    position: { x: 1, y: 2, z: 3 },
    scale: { x: 4, y: 5, z: 6 },
});

function publishEdit(path, value) {
    const patch = buildEnvironmentFromSettings(
        scalarFields,
        { [path]: value },
        environment(),
        validate
    );
    return subject.next({ config: { environment: patch } });
}

function publishGrid(changes = {}) {
    const patch = buildEnvironmentFromSettings(
        allFields,
        { ...getSettingsDefaults(gridFields), ...changes },
        environment(),
        validate
    );
    return subject.next({ config: { environment: patch } });
}

function publishImport(json, gridDraft = getSettingsDefaults(gridFields)) {
    const imported = buildSettingsImport(allFields, json, environment(), gridDraft, validate);
    if (Object.keys(imported.environment).length > 0) {
        subject.next({ config: { environment: imported.environment } });
    }
    return imported;
}

beforeEach(() => {
    subject.next({
        config: {
            environment: {
                dbClickTimeout: 234,
                desktopSpeed: 7,
                vrSpeed: 3,
                camera: { position: { x: 9, y: 8, z: 7 } },
                canvas: {
                    position: { x: 1, y: 2, z: 3 },
                    rotation: { x: 4, y: 5, z: 6 },
                    scale: { x: 7, y: 8, z: 9 },
                },
                shiftScale: { enabled: true, step: { x: 11, y: 12, z: 13 } },
                histogramPads: [pad("settings-custom-a"), pad("settings-custom-b")],
                producerOwned: "keep me",
            },
            histogram: { TH1ZScale: { default: 0.67 } },
        },
    });
});

test("Settings scalar edits publish one accepted branch without regenerating custom pads", () => {
    const previous = subject.getValue();
    const patch = buildEnvironmentFromSettings(
        scalarFields,
        { desktopSpeed: "12.5" },
        environment(),
        validate
    );
    assert.deepEqual(patch, { desktopSpeed: 12.5 });
    const next = subject.next({ config: { environment: patch } });

    assert.equal(next.config.environment.desktopSpeed, 12.5);
    assert.equal(next.config.environment.vrSpeed, 3);
    assert.equal(next.config.environment.producerOwned, "keep me");
    assert.deepEqual(
        next.config.environment.histogramPads,
        previous.config.environment.histogramPads
    );
    assert.deepEqual(next.config.environment.camera, previous.config.environment.camera);
    assert.deepEqual(next.config.histogram, previous.config.histogram);
});

test("Settings coordinate edits preserve the complete canonical triple and unrelated branches", () => {
    assert.equal(environment().canvas.position.isVector3, true);
    const previous = subject.getValue();
    const patch = buildEnvironmentFromSettings(
        scalarFields,
        { "canvas.position.x": "22" },
        environment(),
        validate
    );
    assert.deepEqual(patch, { canvas: { position: { x: 22, y: 2, z: 3 } } });
    const next = subject.next({ config: { environment: patch } });

    assert.equal(next.config.environment.canvas.position.isVector3, true);
    assert.deepEqual(next.config.environment.canvas.position.toArray(), [22, 2, 3]);
    assert.deepEqual(next.config.environment.canvas.rotation.toArray(), [4, 5, 6]);
    assert.deepEqual(next.config.environment.canvas.scale.toArray(), [7, 8, 9]);
    assert.deepEqual(
        next.config.environment.histogramPads,
        previous.config.environment.histogramPads
    );

    publishEdit("shiftScale.step.y", "-2.5");
    assert.deepEqual(environment().shiftScale.step.toArray(), [11, -2.5, 13]);
});

test("Settings rejects unfinished and invalid numeric, integer, and boolean drafts atomically", () => {
    const emissions = [];
    const subscription = subject.getObservable().subscribe((value) => emissions.push(value));
    const previous = subject.getValue();
    try {
        const invalidDrafts = [
            ["desktopSpeed", ""],
            ["desktopSpeed", " "],
            ["desktopSpeed", "-"],
            ["desktopSpeed", "."],
            ["desktopSpeed", "1e"],
            ["desktopSpeed", "1e-"],
            ["desktopSpeed", "Infinity"],
            ["desktopSpeed", "NaN"],
            ["desktopSpeed", "0x10"],
            ["desktopSpeed", "12junk"],
            ["desktopSpeed", Number.POSITIVE_INFINITY],
            ["desktopSpeed", null],
            ["dbClickTimeout", "2.5"],
            ["shiftScale.enabled", "yes"],
            ["shiftScale.enabled", "0"],
        ];
        for (const [path, value] of invalidDrafts) {
            assert.throws(() => publishEdit(path, value), `${path}=${String(value)}`);
            assert.strictEqual(subject.getValue(), previous);
        }
        assert.throws(() =>
            buildEnvironmentFromSettings(
                scalarFields,
                { desktopSpeed: "25", vrSpeed: "unfinished" },
                environment(),
                validate
            )
        );
        assert.equal(emissions.length, 1);
    } finally {
        subscription.unsubscribe();
    }
});

test("Settings accepts finite decimals, complete exponents, integers and exact booleans", () => {
    publishEdit("desktopSpeed", "-1.25e2");
    assert.equal(environment().desktopSpeed, -125);
    publishEdit("dbClickTimeout", "450");
    assert.equal(environment().dbClickTimeout, 450);
    publishEdit("shiftScale.enabled", "false");
    assert.equal(environment().shiftScale.enabled, false);
    publishEdit("shiftScale.enabled", true);
    assert.equal(environment().shiftScale.enabled, true);
});

test("Settings validates the unwrapped environment patch instead of the Core envelope", () => {
    const validated = [];
    const inspectShape = (value) => {
        validated.push(value);
        return validate(value);
    };
    const patch = buildEnvironmentFromSettings(
        scalarFields,
        { desktopSpeed: "14" },
        environment(),
        inspectShape
    );
    assert.deepEqual(patch, { desktopSpeed: 14 });
    assert.deepEqual(validated, [{ environment: { desktopSpeed: 14 } }]);
});

test("Settings refreshes scalar drafts on same-reference Core emissions", () => {
    const drafts = [];
    const roots = [];
    const replacementGridDraft = {
        ...getSettingsDefaults(gridFields),
        "histogramPads.prefix": "next-layout-",
    };
    const gridBefore = { ...replacementGridDraft };
    const subscription = subject.getObservable().subscribe((value) => {
        roots.push(value);
        drafts.push(readSettings(scalarFields, value.config.environment));
    });
    try {
        // Core appendPads deliberately mutates and re-emits the canonical root.
        environment().desktopSpeed = 31;
        subject.appendPads(["settings-appended"], "simple", {
            scale: { x: 1, y: 1, z: 1 },
            padding: { x: 0, y: 0, z: 0 },
            origin: { x: 0, y: 0, z: 0 },
        });
        assert.equal(drafts.length, 2);
        assert.strictEqual(roots[0], roots[1]);
        assert.notStrictEqual(drafts[0], drafts[1]);
        assert.equal(drafts[0].desktopSpeed, 7);
        assert.equal(drafts[1].desktopSpeed, 31);
        assert.equal(drafts[1]["canvas.position.y"], 2);
        assert.equal(drafts[1]["histogramPads.type"], undefined);
        assert.deepEqual(replacementGridDraft, gridBefore);
    } finally {
        subscription.unsubscribe();
    }
});

test("Settings keeps an explicit default replacement-grid draft with an editable prefix", () => {
    const draft = getSettingsDefaults(gridFields);
    assert.equal(draft["histogramPads.type"], "grid2x1x2");
    assert.equal(draft["histogramPads.prefix"], "pad");
    const draftBefore = { ...draft };
    const previousPads = environment().histogramPads;

    publishEdit("desktopSpeed", "9");
    assert.deepEqual(environment().histogramPads, previousPads);
    assert.deepEqual(draft, draftBefore);
    assert.equal(readSettings(scalarFields, environment())["histogramPads.prefix"], undefined);
});

test("Settings accepted grid edits explicitly replace pads using the editable prefix", () => {
    const previous = subject.getValue();
    const draft = {
        ...getSettingsDefaults(gridFields),
        "histogramPads.type": "grid2x1x1",
        "histogramPads.prefix": "analysis-",
    };
    const patch = buildEnvironmentFromSettings(allFields, draft, environment(), validate);
    assert.deepEqual(Object.keys(patch), ["histogramPads"]);
    assert.deepEqual(patch.histogramPads, {
        type: "grid2x1x1",
        prefix: "analysis-",
        scale: { x: 20, y: 2, z: 10 },
        padding: { x: 0, y: 0, z: 0 },
        origin: { x: 10, y: 1, z: 5 },
    });
    const next = subject.next({ config: { environment: patch } });
    assert.deepEqual(
        next.config.environment.histogramPads.map(({ id }) => id),
        ["analysis-1", "analysis-2"]
    );
    for (const configuredPad of next.config.environment.histogramPads) {
        assert.equal(configuredPad.position.isVector3, true);
        assert.equal(configuredPad.scale.isVector3, true);
        assert.deepEqual(configuredPad.scale.toArray(), [10, 2, 10]);
    }
    assert.equal(next.config.environment.desktopSpeed, 7);
    assert.equal(next.config.environment.producerOwned, "keep me");
    assert.deepEqual(next.config.environment.camera, previous.config.environment.camera);
    assert.deepEqual(next.config.histogram, previous.config.histogram);
});

test("Settings rejects malformed or unfinished layouts before replacing configured pads", () => {
    const previous = subject.getValue();
    const invalidTypes = [
        "grid",
        "grid2x1",
        "grid2x1x",
        "grid-1x1x1",
        "grid1.5x1x1",
        "beforegrid2x1x1",
        "grid2x1x1after",
        "GRID2x1x1",
        "grid2x1x1 ",
    ];
    for (const type of invalidTypes) {
        assert.throws(() => publishGrid({ "histogramPads.type": type }), type);
        assert.strictEqual(subject.getValue(), previous);
    }
    assert.throws(() => publishGrid({ "histogramPads.scale.x": "-" }));
    assert.throws(() => publishGrid({ "histogramPads.padding.z": "Infinity" }));
    assert.strictEqual(subject.getValue(), previous);
});

test("Settings preserves the agreed nonnegative grid policy including empty zero layouts", () => {
    const next = publishGrid({ "histogramPads.type": "grid0x1x1" });
    assert.deepEqual(next.config.environment.histogramPads, []);
    assert.equal(next.config.environment.desktopSpeed, 7);
});

test("Settings rejects grid prefixes Core would convert into non-string pad IDs", () => {
    const previous = subject.getValue();
    assert.throws(() => publishGrid({ "histogramPads.prefix": "0x123" }));
    assert.strictEqual(subject.getValue(), previous);
});

test("Settings scalar imports preserve omitted fields and do not replace pads or the grid draft", () => {
    const previous = subject.getValue();
    const gridDraft = {
        ...getSettingsDefaults(gridFields),
        "histogramPads.prefix": "next-grid-",
    };
    const imported = publishImport(
        {
            config: {
                environment: {
                    desktopSpeed: 18,
                    producerOwned: "ignore this unrelated import",
                },
                histogram: { TH1ZScale: { default: 0.01 } },
            },
        },
        gridDraft
    );
    assert.deepEqual(imported.environment, { desktopSpeed: 18 });
    assert.equal(imported.gridDraft, undefined);
    assert.equal(gridDraft["histogramPads.prefix"], "next-grid-");
    assert.equal(environment().desktopSpeed, 18);
    assert.equal(environment().vrSpeed, 3);
    assert.equal(environment().producerOwned, "keep me");
    assert.deepEqual(environment().histogramPads, previous.config.environment.histogramPads);
    assert.deepEqual(subject.getValue().config.histogram, previous.config.histogram);
});

test("Settings empty or unknown-only layout imports preserve pads and the independent grid draft", () => {
    const previousPads = environment().histogramPads;
    const gridDraft = {
        ...getSettingsDefaults(gridFields),
        "histogramPads.prefix": "unpublished-layout-",
    };
    const gridBefore = { ...gridDraft };
    for (const histogramPads of [{}, { id: "runtime-pad" }]) {
        const imported = publishImport(
            { config: { environment: { desktopSpeed: 19, histogramPads } } },
            gridDraft
        );
        assert.deepEqual(imported.environment, { desktopSpeed: 19 });
        assert.equal(imported.gridDraft, undefined);
        assert.equal(environment().desktopSpeed, 19);
        assert.deepEqual(environment().histogramPads, previousPads);
        assert.deepEqual(gridDraft, gridBefore);
    }
});

test("Settings partial-vector imports preserve the latest canonical coordinates at completion", () => {
    const json = { config: { environment: { canvas: { position: { x: 90 } } } } };
    // The file reader can finish after another producer updates the configuration.
    subject.next({
        config: { environment: { canvas: { position: { x: 1, y: 42, z: 43 } } } },
    });
    const imported = publishImport(json);
    assert.deepEqual(imported.environment, {
        canvas: { position: { x: 90, y: 42, z: 43 } },
    });
    assert.deepEqual(environment().canvas.position.toArray(), [90, 42, 43]);
    assert.deepEqual(environment().canvas.rotation.toArray(), [4, 5, 6]);
    assert.deepEqual(
        environment().histogramPads.map(({ id }) => id),
        ["settings-custom-a", "settings-custom-b"]
    );
});

test("Settings explicit partial recipe imports replace pads using the independent grid draft", () => {
    const gridDraft = {
        ...getSettingsDefaults(gridFields),
        "histogramPads.prefix": "imported-",
        "histogramPads.scale.y": 6,
    };
    const gridBefore = { ...gridDraft };
    const imported = publishImport(
        {
            config: {
                environment: {
                    vrSpeed: 14,
                    histogramPads: { type: "grid1x1x2", origin: { x: 44 } },
                },
            },
        },
        gridDraft
    );
    assert.deepEqual(gridDraft, gridBefore);
    assert.equal(imported.gridDraft["histogramPads.type"], "grid1x1x2");
    assert.equal(imported.gridDraft["histogramPads.prefix"], "imported-");
    assert.equal(imported.gridDraft["histogramPads.origin.x"], 44);
    assert.equal(imported.gridDraft["histogramPads.origin.y"], 1);
    assert.equal(imported.gridDraft["histogramPads.origin.z"], 5);
    assert.equal(imported.gridDraft["histogramPads.scale.y"], 6);
    assert.equal(environment().vrSpeed, 14);
    assert.equal(environment().desktopSpeed, 7);
    assert.deepEqual(
        environment().histogramPads.map(({ id }) => id),
        ["imported-1", "imported-2"]
    );
    assert.deepEqual(environment().histogramPads[0].position.toArray(), [54, 4, 2.5]);
});

test("Settings rejects runtime pad arrays and invalid imported recipes without any publication", () => {
    const previous = subject.getValue();
    const gridDraft = getSettingsDefaults(gridFields);
    const gridBefore = { ...gridDraft };
    const emissions = [];
    const subscription = subject.getObservable().subscribe((value) => emissions.push(value));
    try {
        const invalidPads = [
            [],
            [pad("unsupported-runtime-pad")],
            { type: "grid2x1" },
            { type: "grid1x-1x1" },
            { prefix: "0x123" },
            { scale: { x: "20" } },
            null,
        ];
        for (const histogramPads of invalidPads) {
            assert.throws(() =>
                publishImport(
                    { config: { environment: { desktopSpeed: 99, histogramPads } } },
                    gridDraft
                )
            );
            assert.strictEqual(subject.getValue(), previous);
            assert.deepEqual(gridDraft, gridBefore);
        }
        assert.equal(emissions.length, 1);
    } finally {
        subscription.unsubscribe();
    }
});

test("Settings validates imports atomically and does not coerce JSON scalar types", () => {
    const previous = subject.getValue();
    const emissions = [];
    const subscription = subject.getObservable().subscribe((value) => emissions.push(value));
    try {
        const invalidEnvironments = [
            { desktopSpeed: 99, vrSpeed: "12" },
            { desktopSpeed: 99, shiftScale: { enabled: "false" } },
            { desktopSpeed: 99, dbClickTimeout: 2.5 },
            { desktopSpeed: 99, canvas: { position: { x: "4" } } },
            { desktopSpeed: 99, canvas: null },
        ];
        for (const environment of invalidEnvironments) {
            assert.throws(() => publishImport({ config: { environment } }));
            assert.strictEqual(subject.getValue(), previous);
        }
        assert.equal(emissions.length, 1);
    } finally {
        subscription.unsubscribe();
    }
});

test("Settings requires the configuration envelope and treats omitted Settings fields as a no-op", () => {
    const previous = subject.getValue();
    const invalidDocuments = [
        null,
        [],
        4,
        {},
        { environment: { desktopSpeed: 99 } },
        { config: null },
        { config: [] },
        { config: { environment: [] } },
        { config: { environment: null } },
    ];
    for (const json of invalidDocuments) {
        assert.throws(() => publishImport(json));
        assert.strictEqual(subject.getValue(), previous);
    }
    assert.deepEqual(publishImport({ config: {} }).environment, {});
    assert.deepEqual(
        publishImport({ config: { environment: { producerOwned: "ignored" } } }).environment,
        {}
    );
    assert.strictEqual(subject.getValue(), previous);
});

test("Settings reset restores editable defaults including layout and preserves unrelated configuration", () => {
    const previous = subject.getValue();
    const patch = buildEnvironmentFromSettings(
        allFields,
        getSettingsDefaults(allFields),
        environment(),
        validate
    );
    const next = subject.next({ config: { environment: patch } });
    assert.equal(environment().dbClickTimeout, 200);
    assert.equal(environment().desktopSpeed, 10);
    assert.equal(environment().vrSpeed, 10);
    assert.deepEqual(environment().canvas.position.toArray(), [0, 20, -20]);
    assert.deepEqual(environment().canvas.rotation.toArray(), [8, 0, 0]);
    assert.deepEqual(environment().canvas.scale.toArray(), [6, 5, 1]);
    assert.equal(environment().shiftScale.enabled, true);
    assert.deepEqual(environment().shiftScale.step.toArray(), [10, 10, 10]);
    assert.deepEqual(
        environment().histogramPads.map(({ id }) => id),
        ["pad1", "pad2", "pad3", "pad4"]
    );
    assert.equal(environment().producerOwned, "keep me");
    assert.deepEqual(environment().camera, previous.config.environment.camera);
    assert.deepEqual(next.config.histogram, previous.config.histogram);
});
