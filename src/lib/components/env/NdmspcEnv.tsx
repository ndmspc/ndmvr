import NdmvrEnv from "./NdmvrEnv.tsx";
import JsrootEnv from "./JsrootEnv.tsx";
import Switch from "../ui/desktop/Switch.tsx";

import { useCallback, useEffect, useRef, useState } from "react";
import { configSubjectGet } from "@ndmspc/ndmvr-aframe";
import { NdmvrConfig } from "../../interfaces/NdmvrConfig.ts";

import { useSceneModeStore } from "../../stores/sceneMode/store.ts";
import FullscreenButton from "../ui/desktop/FullscreenButton.tsx";
import UIToggleButton from "../ui/desktop/UIToggleButton.tsx";

export interface NdmspcEnvProps {
    children?: React.ReactNode;
    config?: NdmvrConfig | null;
    onConfigChange?: ((config: Record<string, unknown>) => void) | null;
    controlsHelp?: boolean;
    menu?: boolean;
    help?: boolean;
}

function isEmptyObject(obj: any): boolean {
    return (
        obj != null &&
        typeof obj === "object" &&
        !Array.isArray(obj) &&
        Object.keys(obj).length === 0
    );
}

export default function NdmspcEnv({
    children = null,
    config = null,
    onConfigChange = null,
    help = false,
    menu = false,
}: NdmspcEnvProps) {
    const [vrMode, setVRMode] = useState(true);
    const initializedRef = useRef(false);
    // const initializedRef2 = useRef(false);
    const [appConfig, setAppConfig] = useState(null);

    const [showUI, setShowUI] = useState(menu || help);
    const { setUIHover, setVrEnabled } = useSceneModeStore();

    console.log("NdmspcEnv render, config:", appConfig, "onConfigChange:", typeof onConfigChange);

    const handleUIToggle = () => {
        setShowUI((prev) => !prev);
    };

    const handleUIStateChange = (isUIVisible: boolean) => {
        setShowUI(isUIVisible);
    };

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

        let newConfig: NdmvrConfig;
        if (config && !isEmptyObject(config)) {
            newConfig = configSubjectGet().next(config);
        } else {
            console.log("[WARNING] Using Default Config]");
            newConfig = configSubjectGet().getValue();
        }
        console.log("[CONFIG] NdmspcEnv initialized, config:", newConfig);

        // @ts-error FIXME: Config
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAppConfig(newConfig);
    }, [config]);

    // useEffect(() => {
    //     if (initializedRef2.current) return;
    //     initializedRef2.current = true;
    //
    //     setTimeout(() => {
    //         configSubjectGet().next({
    //             config: {
    //                 histogram: {
    //                     scale: {
    //                         default: {
    //                             min: 0.5
    //                         }
    //                     },
    //                     sets: {
    //                         scale: {
    //                             maximum: "absolute"
    //                         }
    //                     },
    //                 }
    //             }
    //         });
    //     }, 6000);
    // }, []);

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
                    currentConfig={appConfig}
                    onConfigChange={applyConfig}
                    menu={menu}
                    help={help}
                    showUIExternal={showUI}
                    onUIStateChange={handleUIStateChange}
                >
                    {children}
                </NdmvrEnv>
            </div>

            <Switch
                onMouseEnter={() => setUIHover(true)}
                onMouseLeave={() => setUIHover(false)}
                startState={true}
                onToggle={(checked: boolean) => {
                    setVrEnabled(checked);
                    setVRMode(checked);
                }}
            />
            <FullscreenButton />
            <UIToggleButton isActive={showUI} onToggle={handleUIToggle} />
        </div>
    );
}
