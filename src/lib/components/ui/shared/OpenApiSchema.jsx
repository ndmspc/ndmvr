import Ajv from "ajv";

export function flattenSchema(schema, prefix = "") {
    const result = {};
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

export function setDeep(obj, path, value) {
    const keys = path.split(".");
    let current = obj;
    keys.forEach((key, idx) => {
        if (idx === keys.length - 1) {
            current[key] = value;
        } else {
            current[key] = current[key] || {};
            current = current[key];
        }
    });
}

export function getDeep(obj, path) {
    return path.split(".").reduce((acc, k) => acc?.[k], obj);
}

export function createValidator(openapiSchema) {
    const ajv = new Ajv({ allErrors: true, strict: false });
    return ajv.compile(openapiSchema.components.schemas.Config);
}

export function buildEnvironmentFromSettings(flatSchema, srcSettings) {
    const env = {};
    for (const [path, schema] of Object.entries(flatSchema)) {
        let v = srcSettings[path];

        if (schema.type === "integer") {
            const n = Number(v);
            v = Number.isFinite(n) ? Math.trunc(n) : (schema.default ?? 0);
        } else if (schema.type === "number") {
            const n = Number(v);
            v = Number.isFinite(n) ? n : (schema.default ?? 0);
        } else if (schema.type === "boolean") {
            v = v === true || v === "true";
        } else {
            if (v === undefined || v === null || v === "") {
                v = schema.default ?? "";
            }
        }

        setDeep(env, path, v);
    }
    return env;
}
