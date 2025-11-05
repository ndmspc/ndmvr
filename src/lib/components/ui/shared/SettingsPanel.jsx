import { useState, useMemo } from "react";
import { Card, Button, Input } from "@react-three/uikit-apfel";
import { Container, Text } from "@react-three/uikit";
import { flattenSchema, getDeep, createValidator, buildEnvironmentFromSettings} from "./OpenApiSchema.jsx";

export default function SettingsPanel({ openapiSchema, currentConfig, onConfigChange }) {
    const envSchema = openapiSchema?.components?.schemas?.Config?.properties?.environment ?? {};
    const flatSchema = flattenSchema(envSchema);
    const initialEnv = currentConfig?.config?.environment ?? {};

    const [settings, setSettings] = useState(() =>
        Object.fromEntries(
            Object.entries(flatSchema).map(([path, schema]) => [
                path,
                getDeep(initialEnv, path) ?? schema.default ?? "",
            ])
        )
    );

    const validate = useMemo(() => createValidator(openapiSchema), [openapiSchema]);

    const applyNow = (updatedSettings) => {
        const newEnv = buildEnvironmentFromSettings(flatSchema, updatedSettings);

        const next = {
            ...currentConfig,
            config: {
                ...(currentConfig?.config ?? {}),
                environment: {
                    ...(currentConfig?.config?.environment ?? {}),
                    ...newEnv,
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

    const resetToDefaults = () => {
        const defaults = Object.fromEntries(
            Object.entries(flatSchema).map(([path, schema]) => [path, schema.default ?? ""])
        );
        setSettings(defaults);
        applyNow(defaults);
    };

    return (
        <Card borderRadius={16} padding={12} flexDirection="column" height={300} width={600} minWidth={300}>
            <Text fontSize={14} fontWeight="bold" marginBottom={8}>Settings</Text>


            <Container flexDirection="row" justifyContent="space-between" paddingX={12} paddingY={10}>
                <Text fontSize={12} fontWeight="bold" width={250}>Parameter</Text>
                <Text fontSize={12} fontWeight="bold" width={250}>Value</Text>
            </Container>


            <Container flexDirection="column" gap={8} flexGrow={1} overflow="scroll">
                {Object.entries(flatSchema).map(([path, schema]) => (
                    <Container key={path} flexDirection="row" margin={25} gap={8} justifyContent="space-between" alignItems="center">
                        <Text fontSize={12}>{schema.title ||path}:</Text>
                        <Input
                            value={String(settings[path] ?? "")}
                            onValueChange={(v) => {
                                const updated = { ...settings, [path]: v };
                                setSettings(updated);
                                applyNow(updated);
                            }}
                            width={250}
                        />
                    </Container>
                ))}
            </Container>

            <Button variant="rect" size="sm" platter marginTop={8} onClick={resetToDefaults}>
                <Text>Default</Text>
            </Button>
        </Card>
    );
}
