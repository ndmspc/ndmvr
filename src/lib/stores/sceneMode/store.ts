import { create } from "zustand";
import type { ComponentType, ReactNode } from "react";
import { configSubjectGet } from "@ndmspc/ndmvr-core";
import {
    getActiveHistogramPadId,
    getActiveHistogramPadState,
    updateHistogramPadState,
} from "../histogramWorkspace";

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

export type ModeToolsNotification = {
    content: ReactNode;
    lifetimeMs: number;
} | null;

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
            onEnter: "default",
            onClick: () => {
                useSceneModeStore.getState().showModeToolsNotification("Normal mode activated", 2000);
            },
            onHover: () => {
                useSceneModeStore.getState().clearModeToolsNotification();
            },
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
            onEnter: "default",
            onClick: () => {
                useSceneModeStore.getState().showModeToolsNotification("Modify mode activated", 2000);
            },
            onHover: () => {
                useSceneModeStore.getState().clearModeToolsNotification();
            },
            onExit: "default",
        }
    },

    scaleBy: {
        title: "Scale By mode",
        ariaLabel: "Enable scale by mode",
        icon: "Scale3d",
        histogramEvents: {
            mouseclick: "default",
            mousedbclick: "default",
            shiftmouseclick: "default",
            shiftmousedbclick: "default",
            mousemove: "default",
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
                    useSceneModeStore.getState().showModeToolsNotification("Scale By error activated", 2000);
                } else {
                    cfg.config.histogram.scale.scaleBy = "value";
                    useSceneModeStore.getState().showModeToolsNotification("Scale By value activated", 2000);
                }
                console.log("Updated config: cfg=", cfg);
                configSubjectGet().next(cfg);
            },
            onHover: () => {
                const cfg = configSubjectGet().getValue();
                if (!cfg?.config?.histogram?.scale?.scaleBy) return;
                const scaleBy = cfg.config.histogram.scale.scaleBy;
                useSceneModeStore.getState().showModeToolsNotification(`Scale By ${scaleBy}`, 2000);
            },
            onExit: "default",
        }
    },

    colorBy: {
        title: "Color By mode",
        ariaLabel: "Enable color by mode",
        icon: "Palette",
        histogramEvents: {
            mouseclick: "default",
            mousedbclick: "default",
            shiftmouseclick: "default",
            shiftmousedbclick: "default",
            mousemove: "default",
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
                    useSceneModeStore.getState().showModeToolsNotification("Color By value activated", 2000);
                } else {
                    cfg.config.histogram.color.colorBy = "error";
                    useSceneModeStore.getState().showModeToolsNotification("Color By error activated", 2000);
                }
                // console.log("Updated config: cfg=", cfg);
                configSubjectGet().next(cfg);
            },
            onHover: () => {
                const cfg = configSubjectGet().getValue();
                if (!cfg?.config?.histogram?.color?.colorBy) return;
                const colorBy = cfg.config.histogram.color.colorBy;
                useSceneModeStore.getState().showModeToolsNotification(`Color By ${colorBy}`, 2000);
            },
            onExit: "default",
        }
    },

    layers: {
        title: "Layers mode",
        ariaLabel: "Enable layers mode",
        icon: "Layers",
        histogramEvents: {
            mouseclick: "default",
            mousedbclick: "default",
            shiftmouseclick: "default",
            shiftmousedbclick: "default",
            mousemove: "default",
        },
        baseEvents: {
            onEnter: "default",
            onClick: () => {
                // console.log("Clicked in layers mode");
                const activePadId = getActiveHistogramPadId();
                const state = getActiveHistogramPadState();
                // console.log("Current state: ", state);
                if (!activePadId || !state) return;

                let currentLayer: number;
                if (state?.currentLayer) {
                    currentLayer = state.currentLayer + 1;
                    if (currentLayer > state.availableAxes.length - state.sets.length) {
                        currentLayer = 1;
                    }
                } else {
                    currentLayer = 2;
                }
                window.dispatchEvent(
                    new KeyboardEvent("keydown", {
                        key: currentLayer.toString(),
                        code: "Numpad" + currentLayer.toString(),
                        bubbles: true,
                        cancelable: true
                    }));

                useSceneModeStore.getState().showModeToolsNotification(`Layer ${currentLayer - 1} shown`, 2000);
                updateHistogramPadState(activePadId, { currentLayer });
            },
            onHover: () => {
                const activePadId = getActiveHistogramPadId();
                const state = getActiveHistogramPadState();
                if (!activePadId || !state) return;

                let currentLayer = state.currentLayer;
                if (!state?.currentLayer) {
                    currentLayer = 1;
                    updateHistogramPadState(activePadId, { currentLayer });
                }
                useSceneModeStore.getState().showModeToolsNotification(`Current layer ${currentLayer - 1}`, 2000);
            },
            onExit: "default",
        }
    },

    outline: {
        title: "Outline mode",
        ariaLabel: "Enable outline mode",
        icon: "SquareDashed",
        histogramEvents: {
            mouseclick: "default",
            mousedbclick: "default",
            shiftmouseclick: "default",
            shiftmousedbclick: "default",
            mousemove: "default",
        },
        baseEvents: {
            onEnter: "default",
            onClick: () => {
                // console.log("Clicked in outline mode");
                const cfg = configSubjectGet().getValue();
                const state = getActiveHistogramPadState();
                // console.log("Current config: ", cfg);
                if (!state || !cfg?.config?.histogram?.wireframe) return;
                cfg.config.histogram.wireframe.display.start = cfg.config.histogram.wireframe.display.start + 1;
                if (state?.availableAxes) cfg.config.histogram.wireframe.display.end = state.availableAxes.length;
                if (cfg.config.histogram.wireframe.display.start > cfg.config.histogram.wireframe.display.end) {
                    cfg.config.histogram.wireframe.display.start = 0;
                    cfg.config.histogram.wireframe.display.end = state.availableAxes.length;
                }

                // console.log("Updated config: start=", cfg.config.histogram.wireframe.display.start, "end=", cfg.config.histogram.wireframe.display.end);
                useSceneModeStore.getState().showModeToolsNotification(`Outline layers ${cfg.config.histogram.wireframe.display.start} to ${cfg.config.histogram.wireframe.display.end} shown`, 2000);
                configSubjectGet().next(cfg);
            },
            onHover: () => {
                const cfg = configSubjectGet().getValue();
                if (!cfg?.config?.histogram?.wireframe) return;
                useSceneModeStore.getState().showModeToolsNotification(`Outline layers ${cfg.config.histogram.wireframe.display.start} to ${cfg.config.histogram.wireframe.display.end} shown`, 2000);
            },
            onExit: "default",
        }
    },

};

interface SceneModeStore {
    vrEnabled: boolean;
    uiHover: boolean;
    activeMode: string;
    binBoxEnabled: boolean;
    modeToolsNotification: ModeToolsNotification;

    modesConfig: SceneModesConfig;

    setActiveMode: (mode: string) => void;
    setModesConfig: (config: SceneModesConfig | null) => void;
    getOnClickEvent: (mode: string, config: SceneModesConfig) => BaseEventFunction[];
    getOnHoverEvent: (mode: string, config: SceneModesConfig) => BaseEventFunction[];

    toggleBinBoxEnabled: () => void;
    setUIHover: (state: boolean) => void;
    setVrEnabled: (state: boolean) => void;
    showModeToolsNotification: (
        content: ReactNode,
        lifetimeMs?: number
    ) => void;
    clearModeToolsNotification: () => void;

    shouldDisableRaycaster: () => boolean;
}

let modeToolsNotificationTimer: ReturnType<typeof setTimeout> | null = null;

export const useSceneModeStore = create<SceneModeStore>((set, get) => ({
    vrEnabled: true,
    uiHover: false,
    activeMode: "default",
    binBoxEnabled: false,
    modeToolsNotification: null,

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

    showModeToolsNotification: (content, lifetimeMs = 2500) => {
        if (modeToolsNotificationTimer) {
            clearTimeout(modeToolsNotificationTimer);
            modeToolsNotificationTimer = null;
        }

        set({
            modeToolsNotification: {
                content,
                lifetimeMs,
            },
        });

        if (lifetimeMs <= 0) return;

        modeToolsNotificationTimer = setTimeout(() => {
            set({ modeToolsNotification: null });
            modeToolsNotificationTimer = null;
        }, lifetimeMs);
    },

    clearModeToolsNotification: () => {
        if (modeToolsNotificationTimer) {
            clearTimeout(modeToolsNotificationTimer);
            modeToolsNotificationTimer = null;
        }

        set({ modeToolsNotification: null });
    },

    shouldDisableRaycaster() {
        return get().uiHover === true || get().vrEnabled === false;
    },
}));
