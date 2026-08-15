import { create } from "zustand";

type InputFocusState = {
    isFocused: boolean;
    setFocused: (value: boolean) => void;
};

export const useInputFocus = create<InputFocusState>((set) => ({
    isFocused: false,
    setFocused: (value: boolean) => set({ isFocused: value }),
}));
