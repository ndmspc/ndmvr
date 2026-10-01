import { useEffect, useState } from "react";
import { configSubjectGet } from "@ndmspc/ndmvr-core";
import HistogramWrapper from "./HistogramWrapper.tsx";
import CanvasComponent from "./CanvasComponent.tsx";
import KeyboardListener from "../systems/inputs/KeyboardListener.tsx";
import ModeToolsPanel from "../ui/shared/ModeToolsPanel.tsx";
import { useInputBinding } from "../../interactions/input/useInputBinding";
import { selectSceneMode, useSceneModeStore } from "../../stores/sceneMode/store";
import * as THREE from "three";
import {
    retainHistogramWorkspace,
    useHistogramWorkspace,
} from "../../stores/histogramWorkspace";

export interface NdmvrContentProps {
    children?: React.ReactNode | null;
    showModeTools?: boolean;
    originRef?: React.RefObject<THREE.Group> | null;
}

export default function NdmvrContent({
    children,
    showModeTools = true,
    originRef = null,
}: NdmvrContentProps) {
    const [config, setConfig] = useState(null);
    const pads = useHistogramWorkspace((state) => state.pads);

    useInputBinding({
        keyboard: { code: "KeyM", ctrl: true },
        vr: { hand: "right", button: "a-button", grip: true },
        onPress: () =>
            selectSceneMode(
                useSceneModeStore.getState().activeMode === "default" ? "modify" : "default"
            ),
    });
    useInputBinding({
        keyboard: "KeyB",
        vr: { hand: "right", chord: ["xr-standard-squeeze", "b-button"] as const },
        onPress: () => useSceneModeStore.getState().toggleBinBoxEnabled(),
    });

    useEffect(() => {
        return retainHistogramWorkspace();
    }, []);

    useEffect(() => {
        const configSub = configSubjectGet()
            .getObservable()
            .subscribe((c) => {
                setConfig(c.config);
            });
        return () => {
            configSub.unsubscribe();
        };
    }, []);

    return (
        <>
            {pads.map((pad) => (
                <HistogramWrapper key={pad.id} id={pad.id} />
            ))}
            {config && pads.length > 0 && (
                <CanvasComponent
                    location={config?.environment?.canvas}
                    id={`${pads[0].id}-cinema`}
                />
            )}
            <KeyboardListener />
            {showModeTools && <ModeToolsPanel originRef={originRef} />}
            {children}
        </>
    );
}
