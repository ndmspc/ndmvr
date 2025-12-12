import { create } from "zustand";

interface SceneModeStore {
    vrEnabled: boolean;
    uiHover: boolean;
    setUIHover: (state: boolean) => void;
    setVrEnabled: (state: boolean) => void;
    shouldDisableRaycaster: () => boolean;
}

export const useSceneModeStore = create<SceneModeStore>((set, get) => ({
    vrEnabled: true,
    uiHover: false,

    setUIHover: (state) => set({ uiHover: state }),
    setVrEnabled: (state) => set({ vrEnabled: state }),

    shouldDisableRaycaster() {
        return get().uiHover === true || get().vrEnabled === false;
    },
}));
