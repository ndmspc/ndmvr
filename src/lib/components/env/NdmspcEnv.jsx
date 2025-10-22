import NdmvrEnv from "./NdmvrEnv.jsx";
import JsrootEnv from "./JsrootEnv.jsx";
import Switch from "../ui/desktop/Switch.jsx";

import {useEffect, useRef, useState} from "react";
import { configSubjectGet } from "@ndmspc/ndmvr-aframe";

import defaultConfig from "../../config.json";

export default function NdmspcEnv({ config = null, onConfigChange, controlsHelp = false }) {
    const [vrMode, setVRMode] = useState(true);
    const initializedRef = useRef(false);


    console.log("NdmspcEnv render, config:", config, "onConfigChange:", typeof onConfigChange);


    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;
        const current = configSubjectGet().getValue() ?? {};
        const base = { ...defaultConfig, ...(config ?? {}) };
        const merged = { ...current, ...base };
        configSubjectGet().next(merged);
    }, []);

    useEffect(() => {
        if (!initializedRef.current) return;
        if (!config) return;
        const current = configSubjectGet().getValue() ?? {};
        const next = {
            ...current,
            config: {
                ...(current.config ?? {}),
                ...(config.config ?? {}),
                environment: {
                    ...(current.config?.environment ?? {}),
                    ...(config.config?.environment ?? {}),
                },
            },
        };
        configSubjectGet().next(next);
    }, [config]);

    return (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <div style={{ display: vrMode ? "none" : "flex", width: "100%", height: "100%" }}>
                <JsrootEnv/>
            </div>
            <div style={{ display: vrMode ? "flex" : "none", width: "100%", height: "100%" }}>
                <NdmvrEnv
                    controlsHelp={controlsHelp}
                    currentConfig={config}
                    onConfigChange={onConfigChange}
                />
            </div>
            <Switch startState={true} checked onToggle={(checked) => setVRMode(checked)}/>
        </div>
    );
}
