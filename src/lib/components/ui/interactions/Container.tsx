import { Container as UIKitContainer } from "@react-three/uikit";
import { useUIInteractionOwner } from "../../../stores/interaction/uiInteraction";
import { useCallback, useEffect, useRef } from "react";

export const Container = (props) => {
    const pointers = useRef(new Set<number>());
    const setInteracting = useUIInteractionOwner();
    const release = useCallback((event: { pointerId: number }) => {
        if (pointers.current.delete(event.pointerId) && pointers.current.size === 0) {
            setInteracting(false);
        }
    }, [setInteracting]);
    useEffect(() => {
        const cancel = () => {
            pointers.current.clear();
            setInteracting(false);
        };
        const visibility = () => {
            if (document.hidden) cancel();
        };
        window.addEventListener("pointerup", release);
        window.addEventListener("pointercancel", release);
        window.addEventListener("blur", cancel);
        document.addEventListener("visibilitychange", visibility);
        return () => {
            window.removeEventListener("pointerup", release);
            window.removeEventListener("pointercancel", release);
            window.removeEventListener("blur", cancel);
            document.removeEventListener("visibilitychange", visibility);
            cancel();
        };
    }, [release, setInteracting]);

    return (
        <UIKitContainer
            {...props}
            onPointerDown={(event) => {
                pointers.current.add(event.pointerId);
                setInteracting(true);
                props.onPointerDown?.(event);
            }}
            onPointerUp={(event) => {
                release(event);
                props.onPointerUp?.(event);
            }}
            onPointerCancel={(event) => {
                release(event);
                props.onPointerCancel?.(event);
            }}
            onPointerLeave={(event) => {
                release(event);
                props.onPointerLeave?.(event);
            }}
        />
    );
};

export default Container;
