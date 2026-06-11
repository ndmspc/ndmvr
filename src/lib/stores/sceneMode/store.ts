import { create } from "zustand";
import type { ComponentType } from "react";

export type HistogramEventName =
    | "mouseclick"
    | "mousedbclick"
    | "shiftmouseclick"
    | "shiftmousedbclick"
    | "mousemove";

export type BaseEventName =
    | "onEnter"
    | "onClick"
    | "onHover"
    | "onExit";

export type HistogramEventFunction = (event: unknown, context?: unknown) => void;

export type BaseEventFunction = () => void;

export type HistogramEventFunctionConfig =
    | HistogramEventFunction
    | HistogramEventFunction[]
    | "default"
    | null;

export type BaseEventFunctionConfig = 
    | BaseEventFunction 
    | BaseEventFunction[]
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

    baseEvents?: Partial<
        Record<BaseEventName, BaseEventFunctionConfig>
    >;
}

export type SceneModesConfig = Record<string, SceneModeConfig>;

function resolveBaseEventHandlers(
    config: BaseEventFunctionConfig | undefined
): BaseEventFunction[] | "default" | null {
    if (config === undefined || config === null) return null;
    if (config === "default") return "default";
    return Array.isArray(config) ? config : [config];
}

function runBaseEvent(
    mode: string,
    eventName: BaseEventName,
    config: BaseEventFunctionConfig | undefined
) {
    const handlers = resolveBaseEventHandlers(config);

    if (handlers === "default") {
        console.log(`${eventName} triggered for ${mode} mode`);
        return;
    }

    handlers?.forEach((handler) => handler());
}

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
        baseEvents: {
            onEnter: () => console.log("Entered default mode"),
            onClick: () => console.log("Clicked in default mode"),
            onHover: () => console.log("Hovered over default mode"),
            onExit: () => console.log("Exited default mode"),
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
        baseEvents: {
            onEnter: () => console.log("Entered modify mode"),
            onClick: () => console.log("Clicked in modify mode"),
            onHover: () => console.log("Hovered over modify mode"),
            onExit: () => console.log("Exited modify mode"),
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
    getOnClickEvent: (mode: string, config: SceneModesConfig) => BaseEventFunction[];
    getOnHoverEvent: (mode: string, config: SceneModesConfig) => BaseEventFunction[];

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

        if (state.activeMode === mode) return state;

        runBaseEvent(state.activeMode, "onExit", state.modesConfig[state.activeMode]?.baseEvents?.onExit);
        runBaseEvent(mode, "onEnter", state.modesConfig[mode]?.baseEvents?.onEnter);

        return { activeMode: mode };
    }),

    setModesConfig: (config) => set({
        modesConfig:
            config && Object.keys(config).length > 0
                ? config
                : defaultSceneModesConfig,
    }),

    getOnClickEvent: (mode: string, config: SceneModesConfig) => {
        const handlers = resolveBaseEventHandlers(config[mode]?.baseEvents?.onClick);
        return handlers === "default" || handlers === null ? [] : handlers;
    },

    getOnHoverEvent: (mode: string, config: SceneModesConfig) => {
        const handlers = resolveBaseEventHandlers(config[mode]?.baseEvents?.onHover);
        return handlers === "default" || handlers === null ? [] : handlers;
    },

    toggleBinBoxEnabled: () => set((state) => ({ binBoxEnabled: !state.binBoxEnabled })),

    setUIHover: (state) => set({ uiHover: state }),

    setVrEnabled: (state) => set({ vrEnabled: state }),

    shouldDisableRaycaster() {
        return get().uiHover === true || get().vrEnabled === false;
    },
}));
