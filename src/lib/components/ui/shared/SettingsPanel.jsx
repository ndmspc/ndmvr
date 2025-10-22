import { useState, useMemo } from "react";
import { Card, Button, Input } from "@react-three/uikit-apfel";
import { Container, Text } from "@react-three/uikit";
import Ajv from "ajv";
function flattenSchema(schema, prefix = "") {
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

function setDeep(obj, path, value) {
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

export default function SettingsPanel({ openapiSchema, currentConfig, onConfigChange }) {
    const envSchema = openapiSchema?.components?.schemas?.Config?.properties?.environment ?? {};
    const flatSchema = flattenSchema(envSchema);
    const initialEnv = currentConfig?.config?.environment ?? {};

    const getDeep = (obj, path) => path.split(".").reduce((acc, k) => acc?.[k], obj);

    const [settings, setSettings] = useState(() =>
        Object.fromEntries(
            Object.entries(flatSchema).map(([path, schema]) => [
                path,
                getDeep(initialEnv, path) ?? schema.default ?? "",
            ])
        )
    );

    const ajv = useMemo(() => new Ajv({ allErrors: true, strict: false }), []);
    const validate = ajv.compile(openapiSchema.components.schemas.Config);

    const applySettings = () => {
        const newEnv = {};

        for (const [path, schema] of Object.entries(flatSchema)) {
            let value = settings[path];
            if (schema.type === "integer") value = parseInt(value) || 0;
            if (schema.type === "number") value = parseFloat(value) || 0;
            setDeep(newEnv, path, value);
        }

        const next = {
            ...currentConfig,
            config: {
                ...(currentConfig?.config ?? {}),
                environment: {
                    ...(currentConfig?.config?.environment ?? {}),
                    ...newEnv,
                    canvas: {
                        ...(currentConfig?.config?.environment?.canvas ?? {}),
                        ...newEnv.canvas,
                        position: {
                            ...(currentConfig?.config?.environment?.canvas?.position ?? {}),
                            ...newEnv.canvas?.position,
                        },
                    },
                },
            },
        };


        if (!validate(next)) {
            console.error("Invalid config:", validate.errors);
            return;
        }

        console.log("Applying new config:", next);
        onConfigChange?.(next);
    };

    return (
        <Card borderRadius={16} padding={12} flexDirection="column" height={300} width={600} minWidth={300}>
            <Text fontSize={14} fontWeight="bold" marginBottom={8}>Settings</Text>

            <Container
                flexDirection="column"
                gap={8}
                flexGrow={1}
                overflow="scroll"
            >
                {Object.entries(flatSchema).map(([path]) => (
                    <Container key={path} flexDirection="row" margin={25} gap={8} alignItems="center">
                        <Text fontSize={12}>{path}:</Text>
                        <Input
                            value={String(settings[path] ?? "")}
                            onValueChange={(v) => setSettings((s) => ({ ...s, [path]: v }))}
                            width={100}
                        />
                    </Container>
                ))}
            </Container>

            <Button variant="rect" size="sm" platter marginTop={8} onClick={applySettings}>
                <Text>Apply</Text>
            </Button>
        </Card>
    );
}
