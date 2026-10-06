import { getCorePadState, publishHistogram, publishPadState } from "./coreAdapter";
import { useHistogramWorkspace, type HistogramData, type HistogramPadState } from "./state";

function hasPad(padId: string) {
    return useHistogramWorkspace.getState().pads.some((pad) => pad.id === padId);
}

export function activateHistogramPad(padId: string) {
    useHistogramWorkspace.getState().activatePad(padId);
}

export function getActiveHistogramPadId() {
    return useHistogramWorkspace.getState().activePadId;
}

export function getActiveHistogram(): HistogramData | null {
    const state = useHistogramWorkspace.getState();
    return state.activePadId ? (state.histogramsByPad[state.activePadId] ?? null) : null;
}

export function getHistogramPadState(padId: string) {
    if (!hasPad(padId)) return null;
    return getCorePadState(padId) ?? useHistogramWorkspace.getState().statesByPad[padId] ?? null;
}

export function getActiveHistogramPadState() {
    const activePadId = getActiveHistogramPadId();
    return activePadId ? getHistogramPadState(activePadId) : null;
}

export function updateHistogramPadState(padId: string, updates: Partial<HistogramPadState>) {
    if (!hasPad(padId)) return false;

    const currentState = getCorePadState(padId) ?? {};
    // Core normalizes ranges asynchronously. Keep accepted changes in its mutable
    // canonical value so a second edit also includes the first pending patch.
    Object.assign(currentState, updates);
    currentState.axisRanges ??= [[]];
    publishPadState(padId, { ...currentState });
    return true;
}

type HistogramObjectWithArrays = {
    fArrays?: Record<string, unknown>;
    children?: {
        content?: Array<HistogramObjectWithArrays | null | undefined>;
    };
};

function getAvailableHistogramArrays(histogram: HistogramData) {
    const arrays = ["content"];
    let object = histogram.obj as HistogramObjectWithArrays | null | undefined;

    while (object) {
        if (object.fArrays) arrays.push(...Object.keys(object.fArrays));
        object = object.children?.content?.find(Boolean) ?? null;
    }

    return [...new Set(arrays)];
}

function getAvailableHistogramSets(histogram: HistogramData) {
    let object = histogram.obj as HistogramObjectWithArrays | null | undefined;

    while (object?.children?.content) {
        object = object.children.content.find(Boolean) ?? null;
    }

    if (!object?.children) return [];
    return Object.keys(object.children).filter((key) => key !== "content");
}

export function prepareHistogramPadState(padId: string, histogram: HistogramData) {
    if (!hasPad(padId)) return null;

    const currentState = getCorePadState(padId) ?? {};
    const arrays = getAvailableHistogramArrays(histogram);
    const sets = getAvailableHistogramSets(histogram);
    const selectedArray = arrays.includes(currentState.selectedArray ?? "")
        ? currentState.selectedArray
        : (arrays[0] ?? "");
    const selectedSet =
        currentState.selectedSet?.length &&
        currentState.selectedSet.every((setName) => sets.includes(setName))
            ? currentState.selectedSet
            : [];

    // The constructor immediately replays this mutable value before creating its
    // mesh. Core 1.3 next() is asynchronous and cannot make that replay safe.
    // Let the constructor initialize and publish the normalized histogram state;
    // its caller restores the valid draw choices before the first render.
    Object.assign(currentState, {
        sets: [],
        selectedSet: [],
        arrays: ["content"],
        selectedArray: "content",
        minMaxValue: [],
        availableAxes: [],
        axisRanges: undefined,
    });
    return { selectedArray: selectedArray ?? "content", selectedSet };
}

export function setHistogramPadRenderer(padId: string, renderer: "jsroot" | "ndmvr") {
    if (!hasPad(padId)) return false;

    const histogram = useHistogramWorkspace.getState().histogramsByPad[padId];
    if (!histogram) return false;

    publishHistogram({
        id: padId,
        opts: { render: renderer },
        obj: histogram.obj,
    });
    return true;
}
