import { useEffect } from "react";
import { useKeyboardStore } from "../../../stores/keyboard/store";

export default function KeyboardListener() {
    const setKey = useKeyboardStore.getState().setKey;

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            setKey(e.code, true);
        };

        const up = (e: KeyboardEvent) => {
            setKey(e.code, false);
        };

        window.addEventListener("keydown", down);
        window.addEventListener("keyup", up);

        return () => {
            window.removeEventListener("keydown", down);
            window.removeEventListener("keyup", up);
        };
    }, []);

    return null;
}
