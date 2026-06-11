import { create } from "zustand";
import type { ComponentType } from "react";
import { configSubjectGet, stateSubjectGet } from "@ndmspc/ndmvr-core";

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
        icon: "",
        histogramEvents: {
            mouseclick: "default",
            mousedbclick: "default",
            shiftmouseclick: "default",
            shiftmousedbclick: "default",
            mousemove: "default",
        },
        baseEvents: {
            onClick: "default",
            onEnter: "default",
            onHover: "default",
            onExit: "default",
        }
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
            onClick: "default",
            onEnter: "default",
            onHover: "default",
            onExit: "default",
        }
    },

    scaleBy: {
        title: "Scale By mode",
        ariaLabel: "Enable scale by mode",
        icon: "Scale3D",
        histogramEvents: {
            mouseclick: null,
            mousedbclick: null,
            shiftmouseclick: null,
            shiftmousedbclick: null,
            mousemove: null,
        },
        baseEvents: {
            onEnter: "default",
            onClick: () => {
                // console.log("Clicked in outline mode");
                const cfg = configSubjectGet().getValue();
                // console.log("Current state: ", cfg);
                if (!cfg?.config?.histogram?.scale?.scaleBy) return;
                if (cfg.config.histogram.scale.scaleBy === "value") {
                    cfg.config.histogram.scale.scaleBy = "error";
                } else {
                    cfg.config.histogram.scale.scaleBy = "value";
                }
                console.log("Updated config: cfg=", cfg);
                configSubjectGet().next(cfg);
            },
            onHover: "default",
            onExit: "default",
        }
    },

    colorBy: {
        title: "Color By mode",
        ariaLabel: "Enable color by mode",
        icon: "Palette",
        histogramEvents: {
            mouseclick: null,
            mousedbclick: null,
            shiftmouseclick: null,
            shiftmousedbclick: null,
            mousemove: null,
        },

        baseEvents: {
            onEnter: "default",
            onClick: () => {
                // console.log("Clicked in outline mode");
                const cfg = configSubjectGet().getValue();
                // console.log("Current state: ", cfg);
                if (!cfg?.config?.histogram?.color?.colorBy) return;
                if (cfg.config.histogram.color.colorBy === "error") {
                    cfg.config.histogram.color.colorBy = "value";
                } else {
                    cfg.config.histogram.color.colorBy = "error";
                }
                console.log("Updated config: cfg=", cfg);
                configSubjectGet().next(cfg);
            },
            onHover: "default",
            onExit: "default",
        }
    },

    layers: {
        title: "Layers mode",
        ariaLabel: "Enable layers mode",
        icon: "Layers",
        histogramEvents: {
            mouseclick: null,
            mousedbclick: null,
            shiftmouseclick: null,
            shiftmousedbclick: null,
            mousemove: null,
        },
        baseEvents: {
            onEnter: "default",
            onClick: () => {
                console.log("Clicked in layers mode");
                const state = stateSubjectGet("pad1").getValue();
                console.log("Current state: ", state);

                if (state?.currentLayer) {
                    state.currentLayer = state.currentLayer + 1;
                    if (state.currentLayer > state.availableAxes.length - state.sets.length) {
                        state.currentLayer = 1;
                    }
                } else {
                    state.currentLayer = 2;
                }
                window.dispatchEvent(
                    new KeyboardEvent("keydown", {
                        key: state.currentLayer.toString(),
                        code: "Numpad" + state.currentLayer.toString(),
                        bubbles: true,
                        cancelable: true
                    }));

                stateSubjectGet("pad1").next(state);
            },
            onHover: "default",
            onExit: "default",
        }
    },

    outline: {
        title: "Outline mode",
        ariaLabel: "Enable outline mode",
        icon: "SquareDashed",
        histogramEvents: {
            mouseclick: null,
            mousedbclick: null,
            shiftmouseclick: null,
            shiftmousedbclick: null,
            mousemove: null,
        },
        baseEvents: {
            onEnter: "default",
            onClick: () => {
                // console.log("Clicked in outline mode");
                const cfg = configSubjectGet().getValue();
                const state = stateSubjectGet("pad1").getValue();
                console.log("Current config: ", cfg);
                if (!cfg?.config?.histogram?.wireframe) return;
                cfg.config.histogram.wireframe.display.start = cfg.config.histogram.wireframe.display.start + 1;
                if (cfg.config.histogram.wireframe.display.start >= cfg.config.histogram.wireframe.display.end ||
                    cfg.config.histogram.wireframe.display.start >= state.availableAxes.length + 1) {
                    cfg.config.histogram.wireframe.display.start = 0;
                }
                console.log("Updated config: start=", cfg.config.histogram.wireframe.display.start, "end=", cfg.config.histogram.wireframe.display.end);
                configSubjectGet().next(cfg);
            },
            onHover: "default",
            onExit: "default",
        }
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
