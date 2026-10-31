import { useStore } from "@react-three/fiber";
import { useStore as useZustandStore } from "zustand";

/** UIKit Fullscreen creates an R3F portal with its own event layer. Read the Canvas gate. */
export function useSceneInteractive() {
  let store = useStore();
  while (store.getState().previousRoot) store = store.getState().previousRoot;
  return useZustandStore(store, (state) => state.events.enabled);
}
