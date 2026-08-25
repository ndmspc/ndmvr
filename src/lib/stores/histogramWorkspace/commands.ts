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
    publishPadState(padId, { ...currentState, ...updates });
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
    if (!hasPad(padId)) return false;

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

    publishPadState(padId, {
        ...currentState,
        sets,
        selectedSet,
        arrays,
        selectedArray,
        minMaxValue: [],
        availableAxes: [],
    });
    return true;
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
