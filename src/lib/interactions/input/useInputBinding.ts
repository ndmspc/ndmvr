import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useXR, type XRControllerState } from "@react-three/xr";
import { useKeyboardStore } from "../../stores/keyboard/store";

type XRButton =
    "a-button" | "b-button" | "x-button" | "xr-standard-trigger" | "xr-standard-squeeze";

export function isInputBlocked(target: EventTarget | null = null) {
    const editable = (element: EventTarget | null) =>
        element instanceof HTMLElement &&
        (element.isContentEditable ||
            !!element.closest(
                'input, textarea, select, [contenteditable=""], [contenteditable="true"]'
            ));
    // UIKit inputs use real hidden DOM inputs, so there is no separate focus state to mirror.
    return editable(target) || editable(document.activeElement);
}

export function controllerGamepad(
    session: XRSession | null | undefined,
    controller?: XRControllerState
) {
    if (!session || (session.visibilityState && session.visibilityState !== "visible")) return;
    if (!controller || !Array.from(session.inputSources).includes(controller.inputSource)) return;
    return controller.gamepad;
}

export function buttonPressed(gamepad: XRControllerState["gamepad"] | undefined, button: XRButton) {
    const value = gamepad?.[button];
    const threshold = button === "xr-standard-trigger" ? 0.2 : 0.5;
    return (
        value?.state === "pressed" ||
        (button.startsWith("xr-standard-") && (value?.button ?? 0) > threshold)
    );
}

interface InputBinding {
    keyboard?: string | { code: string | readonly string[]; ctrl?: boolean };
    vr?: { hand: "left" | "right"; grip?: boolean } & (
        { button: XRButton; chord?: never } | { chord: readonly XRButton[]; button?: never }
    );
    onPress?: () => void;
    /** Aggregate held state; false also means cancellation/unmount, not a commit. */
    onChange?: (pressed: boolean) => void;
}

/** Internal feature binding. Requires the existing Canvas/XR ancestors, no input provider. */
export function useInputBinding(binding: InputBinding) {
    // Production bindings are fixed for the lifetime of their feature; callbacks may change.
    const [{ keyboard, vr }] = useState(() => ({ keyboard: binding.keyboard, vr: binding.vr }));
    const session = useXR((state) => (vr ? state.session : null));
    const controller = useXR((state) =>
        vr
            ? state.inputSourceStates.find(
                  (source): source is XRControllerState =>
                      source.type === "controller" && source.inputSource.handedness === vr.hand
              )
            : undefined
    );
    const latest = useRef({ binding, session, controller });
    const previous = useRef({ key: false, vr: false, held: false });
    const blurred = useRef(false);
    const ended = useRef(false);

    // Inline callbacks may change without resetting press edges or subscriptions.
    useLayoutEffect(() => {
        latest.current = { binding, session, controller };
    });

    const sample = useCallback(
        (suppressPress = false) => {
            const { binding: b, session, controller } = latest.current;
            const keys = useKeyboardStore.getState().keys;
            const keyBinding = typeof keyboard === "string" ? { code: keyboard } : keyboard;
            const codes = keyBinding
                ? typeof keyBinding.code === "string"
                    ? [keyBinding.code]
                    : keyBinding.code
                : [];
            const key = codes.some((code) => keys[code]);
            const ctrl = !!(keys.ControlLeft || keys.ControlRight);
            const keyMatches = key && (keyBinding?.ctrl === undefined || keyBinding.ctrl === ctrl);
            const pad = ended.current ? undefined : controllerGamepad(session, controller);
            const vrPressed = vr
                ? vr.chord
                    ? vr.chord.every((button) => buttonPressed(pad, button))
                    : buttonPressed(pad, vr.button)
                : false;
            const vrMatches =
                vrPressed &&
                (vr?.grip === undefined || vr.grip === buttonPressed(pad, "xr-standard-squeeze"));
            const blocked = blurred.current || document.hidden || isInputBlocked();
            const held = !blocked && (keyMatches || vrMatches);
            const old = previous.current;
            previous.current = { key, vr: vrPressed, held };
            if (old.held !== held) b.onChange?.(held);
            // A modifier becoming valid cannot manufacture a primary-button press.
            // A chord deliberately uses the whole combination as its primary edge.
            if (
                !blocked &&
                !suppressPress &&
                ((keyMatches && !old.key) || (vrMatches && !old.vr))
            ) {
                b.onPress?.();
            }
        },
        [keyboard, vr]
    );

    useEffect(() => {
        // Initialize held state, but never fire a toggle just because a feature mounted.
        sample(true);
    }, [sample, session, controller]);

    useEffect(() => {
        const update = () => sample();
        const cancel = () => sample(true);
        const blur = () => {
            blurred.current = true;
            cancel();
        };
        const focus = () => {
            blurred.current = false;
            cancel();
        };
        const stopKeys = keyboard ? useKeyboardStore.subscribe(update) : undefined;
        window.addEventListener("blur", blur);
        window.addEventListener("focus", focus);
        document.addEventListener("focusin", cancel);
        document.addEventListener("visibilitychange", cancel);
        return () => {
            stopKeys?.();
            window.removeEventListener("blur", blur);
            window.removeEventListener("focus", focus);
            document.removeEventListener("focusin", cancel);
            document.removeEventListener("visibilitychange", cancel);
            if (previous.current.held) latest.current.binding.onChange?.(false);
            previous.current = { key: false, vr: false, held: false };
        };
    }, [sample, keyboard]);

    useEffect(() => {
        if (!vr) return;
        ended.current = false;
        sample(true);
        const end = () => {
            ended.current = true;
            sample(true);
        };
        const sourcesChanged = () => sample(true);
        session?.addEventListener("end", end);
        session?.addEventListener("visibilitychange", sourcesChanged);
        session?.addEventListener("inputsourceschange", sourcesChanged);
        return () => {
            session?.removeEventListener("end", end);
            session?.removeEventListener("visibilitychange", sourcesChanged);
            session?.removeEventListener("inputsourceschange", sourcesChanged);
        };
    }, [session, sample, vr]);

    useFrame(() => {
        if (vr) sample();
    }, -1);
}
