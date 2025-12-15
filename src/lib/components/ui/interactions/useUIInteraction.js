import { create } from "zustand";

export const useUIInteraction = create((set) => ({
    isInteracting: false,
    setInteracting: (value) => set({ isInteracting: value }),
}));
