import { create } from "zustand";
import { useCallback, useEffect, useRef } from "react";

type UIInteractionState = {
    isInteracting: boolean;
    acquire: () => () => void;
};

export const useUIInteraction = create<UIInteractionState>((set) => {
    const owners = new Set<symbol>();
    return {
        isInteracting: false,
        acquire: () => {
            const owner = Symbol();
            owners.add(owner);
            set({ isInteracting: true });
            return () => {
                if (owners.delete(owner)) set({ isInteracting: owners.size > 0 });
            };
        },
    };
});

/** A drag releases only its own camera-look blocker, even when another UI interaction overlaps. */
export function useUIInteractionOwner() {
    const release = useRef<(() => void) | null>(null);
    const setActive = useCallback((active: boolean) => {
        if (active) release.current ??= useUIInteraction.getState().acquire();
        else {
            release.current?.();
            release.current = null;
        }
    }, []);
    useEffect(() => () => setActive(false), [setActive]);
    return setActive;
}
