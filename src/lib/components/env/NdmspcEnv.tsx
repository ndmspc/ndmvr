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

export default function NdmspcEnv({ children = null, config = null, setBrowser }: NdmspcEnvProps) {
    const [vrMode, setVRMode] = useState(true);
    const initializedRef = useRef(false);

    const [touch, setTouch] = useState(() => shouldUseMobileControls());

    const setUIHover = useSceneModeStore((state) => state.setUIHover);
    const setVrEnabled = useSceneModeStore((state) => state.setVrEnabled);

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;
        if (config && !isEmptyObject(config)) {
            configSubjectGet().next(config);
        } else {
            configSubjectGet().getValue();
        }
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
                <NdmvrEnv browserConfig={{ setBrowser }}>{children}</NdmvrEnv>
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
