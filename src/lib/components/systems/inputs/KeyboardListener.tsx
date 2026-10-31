import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { useKeyboardStore } from "../../../stores/keyboard/store";
import { isInputBlocked } from "../../../interactions/input/useInputBinding";

let listeners = 0;

function listenKeyboard() {
  ++listeners;
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
    if (--listeners === 0) clearKeys();
  };
}

export default function KeyboardListener() {
  const enabled = useThree((state) => state.events.enabled);
  useEffect(() => {
    if (enabled) return listenKeyboard();
  }, [enabled]);
  return null;
}
