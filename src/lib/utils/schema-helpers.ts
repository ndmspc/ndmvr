import Ajv, { type ValidateFunction } from "ajv";

export interface SchemaProperty {
    type?: string;
    properties?: Record<string, SchemaProperty>;
    default?: unknown;
    title?: string;
}

interface Schema {
    properties?: Record<string, SchemaProperty>;
}

interface OpenAPISchema {
    components: {
        schemas: {
            Config: Schema;
        };
    };
}

export function flattenSchema(schema: Schema, prefix = ""): Record<string, SchemaProperty> {
    const result: Record<string, SchemaProperty> = {};
    for (const [key, value] of Object.entries(schema.properties || {})) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (value.type === "object" && value.properties) {
            Object.assign(result, flattenSchema(value, path));
        } else {
            result[path] = value;
        }
    }
    return result;
}

export function setDeep(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split(".");
    let current = obj;
    keys.forEach((key, idx) => {
        if (idx === keys.length - 1) {
            current[key] = value;
        } else {
            current[key] = current[key] || {};
            current = current[key] as Record<string, unknown>;
        }
    });
}

export function getDeep(obj: unknown, path: string): unknown {
    return path.split(".").reduce<unknown>((value, key) => {
        if (value == null || typeof value !== "object") return undefined;
        return (value as Record<string, unknown>)[key];
    }, obj);
}

export function createValidator(openapiSchema: OpenAPISchema) {
    const ajv = new Ajv({ allErrors: true, strict: false });
    return ajv.compile(openapiSchema.components.schemas.Config);
}

export function buildEnvironmentFromSettings(
    flatSchema: Record<string, SchemaProperty>,
    srcSettings: Record<string, unknown>,
    currentEnvironment: unknown,
    validate: ValidateFunction
): Record<string, unknown> {
    const environment: Record<string, unknown> = {};
    for (const [path, draft] of Object.entries(srcSettings)) {
        const schema = flatSchema[path];
        if (!schema) throw new Error(`Unknown setting: ${path}`);
        setDeep(environment, path, parseSetting(draft, schema, path));
    }

    // Core treats normalized vectors as replacement leaves. Complete only the
    // coordinate branches being edited, using the latest accepted Core values.
    for (const path of Object.keys(srcSettings)) {
        const parent = path.slice(0, path.lastIndexOf("."));
        if (!/\.[xyz]$/.test(path)) continue;
        if (!["x", "y", "z"].every((axis) => flatSchema[`${parent}.${axis}`])) continue;
        for (const axis of ["x", "y", "z"]) {
            const coordinatePath = `${parent}.${axis}`;
            if (getDeep(environment, coordinatePath) !== undefined) continue;
            const schema = flatSchema[coordinatePath];
            const value = getDeep(currentEnvironment, coordinatePath) ?? schema.default;
            setDeep(environment, coordinatePath, parseSetting(value, schema, coordinatePath));
        }
    }

    const recipe = environment.histogramPads as Record<string, unknown> | undefined;
    if (recipe) {
        if (typeof recipe.type !== "string" || !/^grid\d+x\d+x\d+$/.test(recipe.type)) {
            throw new Error("Pad layout requires a complete grid type, such as grid2x1x2");
        }
        const dimensions = recipe.type.slice(4).split("x").map(Number);
        if (!dimensions.every((value) => Number.isSafeInteger(value) && value >= 0)) {
            throw new Error("Grid dimensions must be non-negative safe integers");
        }
        if (typeof recipe.prefix !== "string" || recipe.prefix.startsWith("0x")) {
            throw new Error("Pad ID prefix must be text and cannot start with 0x");
        }
    }
    if (!validate({ environment })) {
        throw new Error(`Invalid settings: ${validate.errors?.[0]?.message ?? "invalid value"}`);
    }
    return environment;
}

function parseSetting(value: unknown, schema: SchemaProperty, path: string): unknown {
    if (schema.type === "number" || schema.type === "integer") {
        if (typeof value === "string") {
            const text = value.trim();
            if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) {
                throw new Error(`${path} requires a complete number`);
            }
            value = Number(text);
        }
        if (typeof value !== "number" || !Number.isFinite(value)) {
            throw new Error(`${path} requires a finite number`);
        }
        if (schema.type === "integer" && !Number.isInteger(value)) {
            throw new Error(`${path} requires an integer`);
        }
    } else if (schema.type === "boolean") {
        if (value === "true") value = true;
        else if (value === "false") value = false;
        if (typeof value !== "boolean") throw new Error(`${path} requires true or false`);
    } else if (schema.type === "string" && typeof value !== "string") {
        throw new Error(`${path} requires text`);
    }
    return value;
}

export function getSettingsDefaults(
    flatSchema: Record<string, SchemaProperty>
): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(flatSchema).map(([path, schema]) => [path, schema.default ?? ""])
    );
}

export function readSettings(
    flatSchema: Record<string, SchemaProperty>,
    environment: unknown
): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(flatSchema).map(([path, schema]) => [
            path,
            getDeep(environment, path) ?? schema.default ?? "",
        ])
    );
}

export function buildSettingsImport(
    flatSchema: Record<string, SchemaProperty>,
    json: unknown,
    currentEnvironment: unknown,
    gridDraft: Record<string, unknown>,
    validate: ValidateFunction
): { environment: Record<string, unknown>; gridDraft?: Record<string, unknown> } {
    if (!isRecord(json) || !isRecord(json.config)) {
        throw new Error("Import a Core configuration object containing config");
    }
    const importedEnvironment = json.config.environment;
    if (importedEnvironment === undefined) return { environment: {} };
    if (!isRecord(importedEnvironment)) {
        throw new Error("Imported environment must be an object");
    }
    if (Array.isArray(importedEnvironment.histogramPads)) {
        throw new Error("Settings imports support grid recipes, not runtime histogram pad arrays");
    }

    // Read only supplied Settings fields. Validate their JSON types before
    // accepting UI-style string drafts or filling any missing coordinates.
    const supplied: Record<string, unknown> = {};
    const suppliedEnvironment: Record<string, unknown> = {};
    for (const path of Object.keys(flatSchema)) {
        let value: unknown = importedEnvironment;
        let present = true;
        for (const key of path.split(".")) {
            if (!isRecord(value)) throw new Error(`${path} requires an object branch`);
            if (!Object.prototype.hasOwnProperty.call(value, key)) {
                present = false;
                break;
            }
            value = value[key];
        }
        if (present) {
            supplied[path] = value;
            setDeep(suppliedEnvironment, path, value);
        }
    }
    if (!validate({ environment: suppliedEnvironment })) {
        throw new Error(
            `Invalid imported settings: ${validate.errors?.[0]?.message ?? "invalid value"}`
        );
    }

    const hasRecipe = Object.keys(supplied).some((path) => path.startsWith("histogramPads."));
    const nextGridDraft = hasRecipe ? { ...gridDraft } : undefined;
    if (nextGridDraft) {
        for (const [path, value] of Object.entries(supplied)) {
            if (path.startsWith("histogramPads.")) nextGridDraft[path] = value;
        }
    }
    const environment = buildEnvironmentFromSettings(
        flatSchema,
        { ...supplied, ...nextGridDraft },
        currentEnvironment,
        validate
    );
    return { environment, ...(nextGridDraft ? { gridDraft: nextGridDraft } : {}) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
