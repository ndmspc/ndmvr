import { useEffect } from "react";
import HistogramWrapper from "./HistogramWrapper.tsx";
import ModeToolsPanel from "../ui/shared/panels/ModeToolsPanel.tsx";
import { useInputBinding } from "../../interactions/input/useInputBinding";
import { selectSceneMode, useSceneModeStore } from "../../stores/sceneMode/store";
import {
    retainHistogramWorkspace,
    useHistogramWorkspace,
} from "../../stores/histogramWorkspace";

/** The standard histogram feature: rendering, workspace lifetime, shortcuts, and mode tools. */
export default function NdmvrContent() {
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

    return (
        <>
            {pads.map((pad) => (
                <HistogramWrapper key={pad.id} id={pad.id} />
            ))}
            <ModeToolsPanel />
        </>
    );
}
