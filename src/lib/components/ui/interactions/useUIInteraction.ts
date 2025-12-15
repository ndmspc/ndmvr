import { create } from "zustand";

type UIInteractionState = {
    isInteracting: boolean;
    setInteracting: (value: boolean) => void;
};

export const useUIInteraction = create<UIInteractionState>((set) => ({
    isInteracting: false,
    setInteracting: (value: boolean) => set({ isInteracting: value }),
}));
