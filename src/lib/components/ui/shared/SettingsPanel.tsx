import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@react-three/uikit-default";
import { Text } from "@react-three/uikit";
import { Input } from "../focus/Input.tsx";
import Container from "../interactions/Container";
import openapiSchema from "../../../../ndmvrConfigOpenApi.json";
import { configSubjectGet } from "@ndmspc/ndmvr-core";

import {
    buildEnvironmentFromSettings,
    createValidator,
    flattenSchema,
    getDeep,
} from "../../../utils/schema-helpers";

export default function SettingsPanel() {
    const envSchema = openapiSchema?.components?.schemas?.Config?.properties?.environment ?? {};
    const flatSchema = flattenSchema(envSchema);

    const [currentConfig, setCurrentConfig] = useState(() => configSubjectGet().getValue());

    useEffect(() => {
        const sub = configSubjectGet()
            .getObservable()
            .subscribe((c) => setCurrentConfig(c));
        return () => sub.unsubscribe();
    }, []);

    const initialEnv = currentConfig?.config?.environment ?? {};

    const [settings, setSettings] = useState(() =>
        Object.fromEntries(
            Object.entries(flatSchema).map(([path, schema]) => [
                path,
                getDeep(initialEnv, path) ?? schema.default ?? "",
            ])
        )
    );

    // Sync settings when config changes externally
    const prevConfigRef = useRef(currentConfig);
    useEffect(() => {
        if (prevConfigRef.current === currentConfig) return;
        prevConfigRef.current = currentConfig;
        const env = currentConfig?.config?.environment ?? {};
        setSettings(
            Object.fromEntries(
                Object.entries(flatSchema).map(([path, schema]) => [
                    path,
                    getDeep(env, path) ?? schema.default ?? "",
                ])
            )
        );
    }, [currentConfig, flatSchema]);

    const validate = useMemo(() => createValidator(openapiSchema), []);

    const applyNow = (updatedSettings: Record<string, unknown>) => {
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

        configSubjectGet().next(next);
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
            const target = e.target as HTMLInputElement;
            const file = target.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const result = reader.result;
                    if (typeof result !== "string") {
                        throw new Error("File content is not a string");
                    }
                    const json = JSON.parse(result);
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
        <Container classList={["menuContainer"]}>
            <Text classList={["menuHeader"]}>Settings</Text>
            <Container
                classList={["section", "sectionInner"]}
                height={300}
                width={600}
                minWidth={300}
            >
                <Container
                    flexDirection="column"
                    flexGrow={1}
                    overflow="scroll"
                    height={100}
                    scrollbarColor="#475569"
                >
                    {Object.entries(flatSchema).map(([path, schema]) => (
                        <Container
                            key={path}
                            flexDirection="row"
                            margin={25}
                            gap={8}
                            alignItems="center"
                        >
                            <Text minWidth={400} fontSize={12}>
                                {(schema as { title?: string })?.title || path}:
                            </Text>
                            <Input
                                classList={["input"]}
                                fontSize={12}
                                value={String(settings[path] ?? "")}
                                onValueChange={(v) => {
                                    const updated = { ...settings, [path]: v };
                                    setSettings(updated);
                                    applyNow(updated);
                                }}
                                minWidth={100}
                            />
                        </Container>
                    ))}
                </Container>

                <Container
                    flexDirection="row"
                    justifyContent="center"
                    alignItems="center"
                    gap={12}
                    marginTop={8}
                >
                    <Button
                        hover={{ backgroundColor: "#059669" }}
                        onClick={resetToDefaults}
                        minWidth={120}
                    >
                        <Text>Reset to default</Text>
                    </Button>

                    <Button
                        hover={{ backgroundColor: "#059669" }}
                        onClick={importConfig}
                        minWidth={120}
                    >
                        <Text>Apply</Text>
                    </Button>
                </Container>
            </Container>
        </Container>
    );
}

SettingsPanel.menuName = "settings";
SettingsPanel.menuLabel = "Settings";
