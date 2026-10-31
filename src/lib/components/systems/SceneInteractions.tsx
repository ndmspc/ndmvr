import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";

/** Keep rendering and scene state alive while switching this Canvas's input off. */
export default function SceneInteractions({ interactive }: { interactive: boolean }) {
  const get = useThree((state) => state.get);
  const setEvents = useThree((state) => state.setEvents);

  useLayoutEffect(() => {
    setEvents({ enabled: interactive });
    const { scene } = get();
    // XR uses its own pointer system rather than the R3F DOM event manager.
    const previous = scene.intersectChildren;
    scene.intersectChildren = interactive ? previous : false;
    if (!interactive) {
      const { events, internal } = get();
      events.handlers?.onPointerLeave?.(new PointerEvent("pointerleave"));
      // R3F still delivers events to captured objects when its event layer is disabled.
      for (const [pointerId, captures] of internal.capturedMap) {
        for (const { target } of captures.values()) {
          if (target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId);
        }
      }
      internal.capturedMap.clear();
      internal.initialHits = [];
    }
    return () => {
      scene.intersectChildren = previous;
    };
  }, [interactive, get, setEvents]);

  return null;
}
