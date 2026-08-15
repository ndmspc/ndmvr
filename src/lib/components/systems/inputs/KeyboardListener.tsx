import { useEffect } from "react";
import { useKeyboardStore } from "../../../stores/keyboard/store";
import { useInputFocus } from "../../../stores/interaction/inputFocus";

function isEditableTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return false;

    if (target.isContentEditable) return true;

    const tagName = target.tagName;
    return tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";
}

function shouldBlockKeyboardEvent(event: KeyboardEvent) {
    if (isEditableTarget(event.target)) return true;
    if (isEditableTarget(document.activeElement)) return true;

    // Keep compatibility with custom UIKit input focus tracking.
    return useInputFocus.getState().isFocused;
}

export default function KeyboardListener() {
    const setKey = useKeyboardStore.getState().setKey;
    const clearKeys = useKeyboardStore.getState().clearKeys;

    useEffect(() => {
        const shieldEvent = (e: KeyboardEvent) => {
            if (!shouldBlockKeyboardEvent(e)) return;

            clearKeys();
            e.stopPropagation();
        };

        const down = (e: KeyboardEvent) => {
            if (shouldBlockKeyboardEvent(e)) {
                clearKeys();
                return;
            }
            setKey(e.code, true);
        };

        const up = (e: KeyboardEvent) => {
            if (shouldBlockKeyboardEvent(e)) return;
            setKey(e.code, false);
        };

        const onBlur = () => {
            clearKeys();
        };

        // Bubble phase guard lets the focused input consume keys first (cursor movement, selection, typing),
        // then blocks app/global shortcuts higher in the tree.
        document.addEventListener("keydown", shieldEvent);
        document.addEventListener("keyup", shieldEvent);

        window.addEventListener("keydown", down);
        window.addEventListener("keyup", up);
        window.addEventListener("blur", onBlur);

        return () => {
            document.removeEventListener("keydown", shieldEvent);
            document.removeEventListener("keyup", shieldEvent);
            window.removeEventListener("keydown", down);
            window.removeEventListener("keyup", up);
            window.removeEventListener("blur", onBlur);
        };
    }, [clearKeys, setKey]);

    return null;
}
