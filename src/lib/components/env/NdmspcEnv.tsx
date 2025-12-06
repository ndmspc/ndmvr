import NdmvrEnv from "./NdmvrEnv.tsx";
import JsrootEnv from "./JsrootEnv.tsx";
import Switch from "../ui/desktop/Switch.tsx";

import { useCallback, useEffect, useRef, useState } from "react";
import { configSubjectGet } from "@ndmspc/ndmvr-aframe";

import defaultConfig from "../../config.json";

export interface NdmspcEnvProps {
    children?: React.ReactNode;
    config?: Record<string, unknown> | null;
    onConfigChange?: ((config: Record<string, unknown>) => void) | null;
    controlsHelp?: boolean;
}

export default function NdmspcEnv({
    children = null,
    config = null,
    onConfigChange = null,
    controlsHelp = false,
}: NdmspcEnvProps) {
    const [vrMode, setVRMode] = useState(true);
    const initializedRef = useRef(false);
    const [appConfig, setAppConfig] = useState(defaultConfig);

    console.log(
        "NdmspcEnv render, config:",
        appConfig,
        "onConfigChange:",
        typeof onConfigChange
    );

    const applyConfig = useCallback(
        (newConfig) => {
            console.log("Config changed from SettingsPanel:", newConfig);
            setAppConfig(newConfig);
            configSubjectGet().next(newConfig);
            onConfigChange?.(newConfig);
        },
        [onConfigChange]
    );

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;
        const current = configSubjectGet().getValue() ?? {};
        const merged = { ...current, ...defaultConfig, ...(config ?? {}) };
        configSubjectGet().next(merged);
        setAppConfig(merged);
    }, [config]);

    return (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <div
                style={{
                    display: vrMode ? "none" : "flex",
                    width: "100%",
                    height: "100%",
                }}
            >
                <JsrootEnv />
            </div>
            <div
                style={{
                    display: vrMode ? "flex" : "none",
                    width: "100%",
                    height: "100%",
                }}
            >
                <NdmvrEnv
                    controlsHelp={controlsHelp}
                    currentConfig={appConfig}
                    onConfigChange={applyConfig}
                >
                    {children}
                </NdmvrEnv>
            </div>

            <Switch
                startState={true}
                onToggle={(checked: boolean) => setVRMode(checked)}
            />
        </div>
    );
}
