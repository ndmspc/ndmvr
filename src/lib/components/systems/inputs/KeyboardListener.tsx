import { useEffect } from "react";
import { useKeyboardStore } from "../../../stores/keyboard/store";
import { isInputBlocked } from "../../../interactions/input/useInputBinding";

function listenKeyboard() {
    const { setKey, clearKeys } = useKeyboardStore.getState();
    const shield = (event: KeyboardEvent) => {
        if (!isInputBlocked(event.target)) return;
        clearKeys();
        // UIKit/core also listen on window. Inputs get the event first.
        event.stopPropagation();
    };
    const down = (event: KeyboardEvent) => {
        if (isInputBlocked(event.target)) return clearKeys();
        setKey(event.code, true);
    };
    // Release even if focus changed or an input stops propagation.
    const up = (event: KeyboardEvent) => setKey(event.code, false);
    const focus = () => {
        if (isInputBlocked()) clearKeys();
    };
    const visibility = () => {
        if (document.hidden) clearKeys();
    };

    document.addEventListener("keydown", shield);
    document.addEventListener("keyup", shield);
    document.addEventListener("focusin", focus);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up, true);
    window.addEventListener("blur", clearKeys);
    return () => {
        document.removeEventListener("keydown", shield);
        document.removeEventListener("keyup", shield);
        document.removeEventListener("focusin", focus);
        document.removeEventListener("visibilitychange", visibility);
        window.removeEventListener("keydown", down);
        window.removeEventListener("keyup", up, true);
        window.removeEventListener("blur", clearKeys);
        clearKeys();
    };
}

export default function KeyboardListener() {
    useEffect(listenKeyboard, []);
    return null;
}
