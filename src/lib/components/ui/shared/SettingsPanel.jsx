import {useMemo, useState} from "react";
import {Button} from "@react-three/uikit-default";
import {Container, Input, Text} from "@react-three/uikit";
import {Divider} from '@react-three/uikit-horizon'

import {buildEnvironmentFromSettings, createValidator, flattenSchema, getDeep} from "../../../utils/schema-helpers";

export default function SettingsPanel({openapiSchema, currentConfig, onConfigChange}) {
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

    const importConfig = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json";
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const json = JSON.parse(reader.result);
                    console.log("Imported user config:", json);

                    const newEnv = json?.config?.environment ?? {};
                    const importedSettings = Object.fromEntries(
                        Object.entries(flatSchema).map(([path, schema]) => [
                            path,
                            getDeep(newEnv, path) ?? schema.default ?? "",
                        ])
                    );

                    setSettings(importedSettings);
                    applyNow(importedSettings);

                } catch (err) {
                    console.error("Invalid JSON config file:", err);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    return (
        <Container classList={["section", "sectionInner"]} height={300} width={600} minWidth={300}>
            <Text fontSize={14} fontWeight="bold">Settings</Text>


            <Container
                flexDirection="column"
                flexGrow={1}
                overflow="scroll"
                height={100}
            >


                {Object.entries(flatSchema).map(([path, schema]) => (
                    <Container key={path} flexDirection="row" margin={25} gap={8} alignItems="center">
                        <Text minWidth={400} fontSize={12}>{schema.title || path}:</Text>
                        <Input
                            classList={["input"]}
                            fontSize={12}
                            value={String(settings[path] ?? "")}
                            onValueChange={(v) => {
                                const updated = {...settings, [path]: v};
                                setSettings(updated);
                                applyNow(updated);
                            }}
                            minWidth={100}
                        />
                    </Container>

                ))}

            </Container>


            <Container flexDirection="row" justifyContent="center" alignItems="center" gap={12} marginTop={8}>
                <Button
                    hover={{backgroundColor: '#059669'}}
                    classList={["buttonPrimary"]}
                    onClick={resetToDefaults}
                    minWidth={120}
                >
                    <Text>Reset to default</Text>
                </Button>

                <Button
                    hover={{backgroundColor: '#059669'}}
                    classList={["buttonPrimary"]}
                    onClick={importConfig}
                    minWidth={120}
                >
                    <Text>Import Config</Text>
                </Button>
            </Container>


        </Container>
    );
}
