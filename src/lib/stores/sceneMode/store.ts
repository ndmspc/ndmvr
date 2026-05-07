import { create } from "zustand";

interface SceneModeStore {
    vrEnabled: boolean;
    uiHover: boolean;
    modifyModeEnabled: boolean;
    binBoxEnabled: boolean;
    setModifyModeEnabled: (state: boolean) => void;
    toggleBinBoxEnabled: () => void;
    setUIHover: (state: boolean) => void;
    setVrEnabled: (state: boolean) => void;
    shouldDisableRaycaster: () => boolean;
}

export const useSceneModeStore = create<SceneModeStore>((set, get) => ({
    vrEnabled: true,
    uiHover: false,
    modifyModeEnabled: false,
    binBoxEnabled: true,

    setModifyModeEnabled: (state) => set({ modifyModeEnabled: state }),
    toggleBinBoxEnabled: () => set((state) => ({ binBoxEnabled: !state.binBoxEnabled })),
    setUIHover: (state) => set({ uiHover: state }),
    setVrEnabled: (state) => set({ vrEnabled: state }),

    shouldDisableRaycaster() {
        return get().uiHover === true || get().vrEnabled === false;
    },
}));
