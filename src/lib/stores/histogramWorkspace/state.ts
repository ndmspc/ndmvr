import { create } from "zustand";

export interface HistogramPad {
    id: string;
    [key: string]: unknown;
}

export interface HistogramData {
    id: string;
    obj: unknown;
    opts?: {
        render?: "jsroot" | "ndmvr";
        config?: Record<string, unknown>;
        [key: string]: unknown;
    };
}

export interface HistogramPadState {
    sets?: string[];
    selectedSet?: string[];
    arrays?: string[];
    selectedArray?: string;
    minMaxValue?: Array<Record<string, unknown>>;
    currentLayer?: number;
    availableAxes?: unknown[];
    [key: string]: unknown;
}

interface HistogramWorkspaceState {
    pads: HistogramPad[];
    activePadId: string | null;
    histogramsByPad: Record<string, HistogramData | undefined>;
    statesByPad: Record<string, HistogramPadState | undefined>;

    replacePads: (pads: HistogramPad[]) => void;
    activatePad: (padId: string) => void;
    receiveHistogram: (padId: string, histogram: HistogramData) => void;
    receivePadState: (padId: string, state: HistogramPadState | undefined) => void;
    reset: () => void;
}

const EMPTY_WORKSPACE = {
    pads: [],
    activePadId: null,
    histogramsByPad: {},
    statesByPad: {},
} satisfies Pick<
    HistogramWorkspaceState,
    "pads" | "activePadId" | "histogramsByPad" | "statesByPad"
>;

function uniquePads(pads: HistogramPad[]) {
    const seen = new Set<string>();

    return pads.filter((pad) => {
        if (!pad?.id || seen.has(pad.id)) return false;
        seen.add(pad.id);
        return true;
    });
}

function retainConfiguredEntries<T>(values: Record<string, T>, padIds: Set<string>) {
    return Object.fromEntries(Object.entries(values).filter(([padId]) => padIds.has(padId)));
}

export const useHistogramWorkspace = create<HistogramWorkspaceState>((set) => ({
    ...EMPTY_WORKSPACE,

    replacePads: (nextPads) =>
        set((state) => {
            const pads = uniquePads(nextPads);
            const padIds = new Set(pads.map((pad) => pad.id));
            const activePadId =
                state.activePadId && padIds.has(state.activePadId)
                    ? state.activePadId
                    : (pads[0]?.id ?? null);

            return {
                pads,
                activePadId,
                histogramsByPad: retainConfiguredEntries(state.histogramsByPad, padIds),
                statesByPad: retainConfiguredEntries(state.statesByPad, padIds),
            };
        }),

    activatePad: (padId) =>
        set((state) => {
            if (state.activePadId === padId || !state.pads.some((pad) => pad.id === padId)) {
                return state;
            }

            return { activePadId: padId };
        }),

    receiveHistogram: (padId, histogram) =>
        set((state) => {
            if (!state.pads.some((pad) => pad.id === padId)) return state;

            return {
                histogramsByPad: {
                    ...state.histogramsByPad,
                    [padId]: histogram,
                },
            };
        }),

    receivePadState: (padId, padState) =>
        set((state) => {
            if (!state.pads.some((pad) => pad.id === padId)) return state;

            return {
                statesByPad: {
                    ...state.statesByPad,
                    [padId]: padState,
                },
            };
        }),

    reset: () => set(EMPTY_WORKSPACE),
}));
