import { create } from "zustand";

interface KeyboardState {
    keys: Record<string, boolean>;
    setKey: (code: string, pressed: boolean) => void;
}

export const useKeyboardStore = create<KeyboardState>((set) => ({
    keys: {},

    setKey: (code, pressed) =>
        set((state) => ({
            keys: {
                ...state.keys,
                [code]: pressed,
            },
        })),
}));
