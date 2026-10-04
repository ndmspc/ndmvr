import { useEffect, useRef, useState } from "react";
import { Button } from "@react-three/uikit-default";
import { Text, Input, Container } from "@react-three/uikit";
import openapiSchema from "../../../../../../config/ndmvrConfigOpenApi.json";
import { configSubjectGet } from "@ndmspc/ndmvr-core";

import {
    buildEnvironmentFromSettings,
    buildSettingsImport,
    createValidator,
    flattenSchema,
    getSettingsDefaults,
    readSettings,
} from "./settings-helpers";

const envSchema = openapiSchema.components.schemas.Config.properties.environment;
const flatSchema = flattenSchema(envSchema);
const scalarSchema = Object.fromEntries(
    Object.entries(flatSchema).filter(([path]) => !path.startsWith("histogramPads."))
);
const gridSchema = Object.fromEntries(
    Object.entries(flatSchema).filter(([path]) => path.startsWith("histogramPads."))
);
const validate = createValidator(openapiSchema);

export default function SettingsPanel() {
    const [settings, setSettings] = useState(() =>
        readSettings(scalarSchema, configSubjectGet().getValue()?.config?.environment)
    );
    const [gridDraft, setGridDraft] = useState(() => getSettingsDefaults(gridSchema));
    const gridDraftRef = useRef(gridDraft);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        const sub = configSubjectGet()
            .getObservable()
            .subscribe((c) => {
                // Each emission gets fresh scalar drafts, even if Core reuses
                // its root object. Runtime pad arrays cannot describe a recipe.
                const accepted = readSettings(scalarSchema, c?.config?.environment);
                setSettings(accepted);
            });
        return () => sub.unsubscribe();
    }, []);

    const updateGridDraft = (draft: Record<string, unknown>) => {
        gridDraftRef.current = draft;
        setGridDraft(draft);
    };

    const applyNow = (updatedSettings: Record<string, unknown>) => {
        try {
            const environment = buildEnvironmentFromSettings(
                flatSchema,
                updatedSettings,
                configSubjectGet().getValue()?.config?.environment,
                validate
            );
            configSubjectGet().next({ config: { environment } });
            setError(null);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Invalid settings");
            return false;
        }
    };

    const resetToDefaults = () => {
        const defaults = getSettingsDefaults(flatSchema);
        if (applyNow(defaults)) updateGridDraft(getSettingsDefaults(gridSchema));
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
                    const imported = buildSettingsImport(
                        flatSchema,
                        json,
                        configSubjectGet().getValue()?.config?.environment,
                        gridDraftRef.current,
                        validate
                    );
                    if (Object.keys(imported.environment).length > 0) {
                        configSubjectGet().next({ config: { environment: imported.environment } });
                    }
                    if (imported.gridDraft) updateGridDraft(imported.gridDraft);
                    setError(null);
                } catch (err) {
                    setError(err instanceof Error ? err.message : "Invalid JSON config file");
                }
            };
            reader.onerror = () => setError("Could not read the configuration file");
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
                    {Object.entries(scalarSchema).map(([path, schema]) => (
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
                                    applyNow({ [path]: v });
                                }}
                                minWidth={100}
                            />
                        </Container>
                    ))}

                    <Text classList={["menuHeader"]}>Replacement grid</Text>
                    <Text>
                        Accepted layout edits replace the current histogram pads. This draft is
                        independent of the current scene layout.
                    </Text>
                    {Object.entries(gridSchema).map(([path, schema]) => (
                        <Container
                            key={path}
                            flexDirection="row"
                            margin={25}
                            gap={8}
                            alignItems="center"
                        >
                            <Text minWidth={400} fontSize={12}>
                                {schema.title || path}:
                            </Text>
                            <Input
                                classList={["input"]}
                                fontSize={12}
                                value={String(gridDraft[path] ?? "")}
                                onValueChange={(value) => {
                                    const nextDraft = { ...gridDraftRef.current, [path]: value };
                                    updateGridDraft(nextDraft);
                                    applyNow(nextDraft);
                                }}
                                minWidth={100}
                            />
                        </Container>
                    ))}
                </Container>

                {error && <Text color="#ef4444">{error}</Text>}

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
                        <Text>Import JSON</Text>
                    </Button>
                </Container>
            </Container>
        </Container>
    );
}

SettingsPanel.menuName = "settings";
SettingsPanel.menuLabel = "Settings";
