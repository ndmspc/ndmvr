import NdmvrEnv from "./NdmvrEnv.tsx";
import JsrootEnv from "./JsrootEnv.tsx";
import Switch from "../ui/desktop/Switch.tsx";

import { useEffect, useRef, useState } from "react";
import { configSubjectGet } from "@ndmspc/ndmvr-core";
import type { NdmspcConfig } from "../../interfaces/NdmspcConfig.ts";
import { NdmvrConfig } from "../../interfaces/NdmvrConfig.ts";

import { useSceneModeStore } from "../../stores/sceneMode/store.ts";
import FullscreenButton from "../ui/desktop/FullscreenButton.tsx";
import UIToggleButton from "../ui/desktop/UIToggleButton.tsx";
// import app from "../../../App.tsx";
import { shouldUseMobileControls } from "../../interactions/device/shouldUseMobileControls";

export interface NdmspcEnvProps {
    children?: React.ReactNode;
    config?: NdmvrConfig | null;
    setBrowser?: React.Dispatch<React.SetStateAction<NdmspcConfig | null>>;
}

function isEmptyObject(obj: unknown): boolean {
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
    setBrowser,
}: NdmspcEnvProps) {
    const [vrMode, setVRMode] = useState(true);
    const initializedRef = useRef(false);
    // const initializedRef2 = useRef(false);

    const [touch, setTouch] = useState(() => shouldUseMobileControls());

    const { setUIHover, setVrEnabled } = useSceneModeStore();

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
    }, [config]);

    useEffect(() => {
        const updateTouch = () => {
            setTouch(shouldUseMobileControls());
        };

        updateTouch();

        window.addEventListener("resize", updateTouch);
        window.addEventListener("orientationchange", updateTouch);

        return () => {
            window.removeEventListener("resize", updateTouch);
            window.removeEventListener("orientationchange", updateTouch);
        };
    }, []);

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
                <NdmvrEnv browserConfig={{ setBrowser }}>
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
                {...(touch ? { label: "" } : {})}
            />
            {!vrMode && (
                <>
                    <FullscreenButton />
                    <UIToggleButton />
                </>
            )}
        </div>
    );
}
