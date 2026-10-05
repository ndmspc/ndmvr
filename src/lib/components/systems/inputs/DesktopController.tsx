import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useUIInteraction } from "../../../stores/interaction/uiInteraction";
import { isInputBlocked } from "../../../interactions/input/useInputBinding";
import { useKeyboardStore } from "../../../stores/keyboard/store";
import {
    INTERACTION_EVENTS,
    type MobileMoveDetail,
    type MobileMoveDirection,
} from "../../../interactions/events";

/** Acquire look on the canvas and release it even when the pointer leaves it. */
function listenDesktopLook(
    element: HTMLElement,
    rotate: (x: number, y: number) => void,
    blocked: () => boolean
) {
    let mouse = false;
    let touch: { id: number; x: number; y: number } | null = null;
    const cancel = () => {
        mouse = false;
        touch = null;
    };
    const down = (event: MouseEvent) => {
        if (event.button === 0 && !blocked()) mouse = true;
    };
    const up = (event: MouseEvent) => {
        if (event.button === 0) mouse = false;
    };
    const move = (event: MouseEvent) => {
        if (blocked()) return cancel();
        if (mouse) rotate(event.movementX, event.movementY);
    };
    const touchStart = (event: TouchEvent) => {
        if (event.touches.length !== 1 || blocked()) return cancel();
        const first = event.touches[0];
        touch = { id: first.identifier, x: first.clientX, y: first.clientY };
    };
    const touchMove = (event: TouchEvent) => {
        if (blocked() || event.touches.length !== 1) return cancel();
        if (!touch) return;
        const current = event.touches[0];
        if (current.identifier !== touch.id) return cancel();
        rotate(current.clientX - touch.x, current.clientY - touch.y);
        touch.x = current.clientX;
        touch.y = current.clientY;
        event.preventDefault();
    };
    const visibility = () => {
        if (document.hidden) cancel();
    };
    element.addEventListener("mousedown", down);
    element.addEventListener("touchstart", touchStart);
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    document.addEventListener("touchmove", touchMove, { passive: false });
    document.addEventListener("touchend", cancel);
    document.addEventListener("touchcancel", cancel);
    document.addEventListener("pointercancel", cancel);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", cancel);
    return () => {
        element.removeEventListener("mousedown", down);
        element.removeEventListener("touchstart", touchStart);
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
        document.removeEventListener("touchmove", touchMove);
        document.removeEventListener("touchend", cancel);
        document.removeEventListener("touchcancel", cancel);
        document.removeEventListener("pointercancel", cancel);
        document.removeEventListener("visibilitychange", visibility);
        window.removeEventListener("blur", cancel);
        cancel();
    };
}

export interface DesktopControllerProps {
    originRef: React.RefObject<THREE.Group | null>;
    cameraRef: React.RefObject<THREE.Camera | null>;
    speed?: number;
}

export default function DesktopController({
    originRef,
    cameraRef,
    speed = 5,
}: DesktopControllerProps): null {
    const element = useThree((state) => state.gl.domElement);

    const yaw = useRef(0);
    const pitch = useRef(0);
    const mobile = useRef(new Set<MobileMoveDirection>());

    const velocity = useRef(new THREE.Vector3());
    const forward = useRef(new THREE.Vector3());
    const right = useRef(new THREE.Vector3());
    const up = useRef(new THREE.Vector3(0, 1, 0));

    useEffect(
        () =>
            listenDesktopLook(
                element,
                (dx, dy) => {
                    yaw.current -= dx * 0.002;
                    pitch.current = Math.max(
                        -Math.PI / 2,
                        Math.min(Math.PI / 2, pitch.current - dy * 0.002)
                    );
                },
                () => isInputBlocked() || useUIInteraction.getState().isInteracting
            ),
        [element]
    );

    useEffect(() => {
        const held = mobile.current;
        const move = (event: Event) => {
            const detail = (event as CustomEvent<MobileMoveDetail>).detail;
            if (!detail) return;
            if (detail.pressed) held.add(detail.dir);
            else held.delete(detail.dir);
        };
        const cancel = () => held.clear();
        const visibility = () => {
            if (document.hidden) cancel();
        };
        window.addEventListener(INTERACTION_EVENTS.MOBILE_MOVE, move);
        window.addEventListener("blur", cancel);
        document.addEventListener("visibilitychange", visibility);
        return () => {
            window.removeEventListener(INTERACTION_EVENTS.MOBILE_MOVE, move);
            window.removeEventListener("blur", cancel);
            document.removeEventListener("visibilitychange", visibility);
            cancel();
        };
    }, []);

    useFrame((_, delta) => {
        if (!originRef.current) return;
        if (isInputBlocked() || document.hidden) return;

        const keys = useKeyboardStore.getState().keys;

        forward.current.set(0, 0, -1).applyAxisAngle(up.current, yaw.current);
        right.current.set(1, 0, 0).applyAxisAngle(up.current, yaw.current);

        velocity.current.set(0, 0, 0);

        if (keys["KeyW"] || mobile.current.has("forward")) velocity.current.add(forward.current);
        if (keys["KeyS"] || mobile.current.has("back")) velocity.current.sub(forward.current);
        if (keys["KeyA"] || mobile.current.has("left")) velocity.current.sub(right.current);
        if (keys["KeyD"] || mobile.current.has("right")) velocity.current.add(right.current);
        if (keys["KeyQ"] || mobile.current.has("down")) velocity.current.y -= 1;
        if (keys["KeyE"] || mobile.current.has("up")) velocity.current.y += 1;

        if (velocity.current.lengthSq() > 0) {
            velocity.current.normalize().multiplyScalar(speed * delta);
            originRef.current.position.add(velocity.current);
        }

        if (!cameraRef.current) return;

        cameraRef.current.position.copy(originRef.current.position);

        cameraRef.current.rotation.order = "YXZ";

        cameraRef.current.rotation.y = yaw.current;
        cameraRef.current.rotation.x = pitch.current;
    });

    return null;
}
