import { create } from "zustand";
import type { ComponentType } from "react";

export type HistogramEventName =
    | "mouseclick"
    | "mousedbclick"
    | "shiftmouseclick"
    | "shiftmousedbclick"
    | "mousemove";

export type HistogramEventFunction = (event: unknown, context?: unknown) => void;

export type HistogramEventFunctionConfig =
    | HistogramEventFunction
    | HistogramEventFunction[]
    | "default"
    | null;

export const histogramEvents: HistogramEventName[] = [
    "mouseclick",
    "mousedbclick",
    "shiftmouseclick",
    "shiftmousedbclick",
    "mousemove",
];

export type ModeToolIconProps = {
    size?: number;
    strokeWidth?: number;
    className?: string;
};

export type ModeToolIcon = ComponentType<ModeToolIconProps> | string;

export interface SceneModeConfig {
    title?: string;
    ariaLabel?: string;
    icon?: ModeToolIcon;

    histogramEvents?: Partial<
        Record<HistogramEventName, HistogramEventFunctionConfig>
    >;
}

export type SceneModesConfig = Record<string, SceneModeConfig>;

export const defaultSceneModesConfig: SceneModesConfig = {
    default: {
        title: "Default mode",
        ariaLabel: "Enable default mode",
        icon: "MousePointer2",
        histogramEvents: {
            mouseclick: "default",
            mousedbclick: "default",
            shiftmouseclick: "default",
            shiftmousedbclick: "default",
            mousemove: "default",
        },
    },
    modify: {
        title: "Modify mode",
        ariaLabel: "Enable modify mode",
        icon: "Hammer",
        histogramEvents: {
            mouseclick: null,
            mousedbclick: null,
            shiftmouseclick: null,
            shiftmousedbclick: null,
            mousemove: null,
        },
    },
};

interface SceneModeStore {
    vrEnabled: boolean;
    uiHover: boolean;
    activeMode: string;
    binBoxEnabled: boolean;

    modesConfig: SceneModesConfig;
    
    setActiveMode: (mode: string) => void;
    setModesConfig: (config: SceneModesConfig | null) => void;

    toggleBinBoxEnabled: () => void;
    setUIHover: (state: boolean) => void;
    setVrEnabled: (state: boolean) => void;

    shouldDisableRaycaster: () => boolean;
}

export const useSceneModeStore = create<SceneModeStore>((set, get) => ({
    vrEnabled: true,
    uiHover: false,
    activeMode: "default",
    binBoxEnabled: false,

    modesConfig: defaultSceneModesConfig,

    setActiveMode: (mode) => set((state) => {
        if (!state.modesConfig[mode]) {
            console.warn(`Scene mode "${mode}" does not exist in modesConfig.`);
            return state;
        }
        return { activeMode: mode };
    }),

    setModesConfig: (config) => set({ modesConfig: Object.keys(config).length > 0 ? config : defaultSceneModesConfig }),

    toggleBinBoxEnabled: () => set((state) => ({ binBoxEnabled: !state.binBoxEnabled })),

    setUIHover: (state) => set({ uiHover: state }),
    
    setVrEnabled: (state) => set({ vrEnabled: state }),

    shouldDisableRaycaster() {
        return get().uiHover === true || get().vrEnabled === false;
    },
}));
