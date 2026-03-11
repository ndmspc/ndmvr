import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useUIInteraction } from "../../ui/interactions/useUIInteraction";
import { useInputFocus } from "../../ui/focus/useInputFocus";
import { useKeyboardStore } from "../../../stores/keyboard/store";

export interface DesktopControllerProps {
    originRef: React.RefObject<THREE.Group>;
    cameraRef: React.RefObject<THREE.Camera>;
    speed?: number;
    onToggleMenu?: () => void;
    onToggleHelp?: () => void;
}

export default function DesktopController({
    originRef,
    cameraRef,
    speed = 5,
}: DesktopControllerProps) {
    const isMouseDown = useRef(false);
    const isTouching = useRef(false);
    const lastTouchPosition = useRef({ x: 0, y: 0 });

    const yaw = useRef(0);
    const pitch = useRef(0);

    const isInteracting = useUIInteraction((s) => s.isInteracting);
    const isFocused = useInputFocus((s) => s.isFocused);

    const frozenRotation = useRef({ x: 0, y: 0 });

    const velocity = useRef(new THREE.Vector3());
    const forward = useRef(new THREE.Vector3());
    const right = useRef(new THREE.Vector3());
    const up = useRef(new THREE.Vector3(0, 1, 0));

    useEffect(() => {
        const onMouseDown = (e: MouseEvent) => {
            if (e.button === 0) isMouseDown.current = true;
        };

        const onMouseUp = (e: MouseEvent) => {
            if (e.button === 0) isMouseDown.current = false;
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isMouseDown.current) return;

            const sensitivity = 0.002;

            yaw.current -= e.movementX * sensitivity;
            pitch.current -= e.movementY * sensitivity;

            pitch.current = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch.current));
        };

        document.addEventListener("mousedown", onMouseDown);
        document.addEventListener("mouseup", onMouseUp);
        document.addEventListener("mousemove", onMouseMove);

        return () => {
            document.removeEventListener("mousedown", onMouseDown);
            document.removeEventListener("mouseup", onMouseUp);
            document.removeEventListener("mousemove", onMouseMove);
        };
    }, []);

    useEffect(() => {
        const onTouchStart = (e: TouchEvent) => {
            if (e.touches.length !== 1) return;

            isTouching.current = true;

            lastTouchPosition.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
            };
        };

        const onTouchEnd = () => {
            isTouching.current = false;
        };

        const onTouchMove = (e: TouchEvent) => {
            if (!isTouching.current || e.touches.length !== 1) return;

            const current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
            };

            const dx = current.x - lastTouchPosition.current.x;
            const dy = current.y - lastTouchPosition.current.y;

            lastTouchPosition.current = current;

            const sensitivity = 0.002;

            yaw.current -= dx * sensitivity;
            pitch.current -= dy * sensitivity;

            pitch.current = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch.current));

            e.preventDefault();
        };

        document.addEventListener("touchstart", onTouchStart);
        document.addEventListener("touchend", onTouchEnd);
        document.addEventListener("touchcancel", onTouchEnd);
        document.addEventListener("touchmove", onTouchMove, { passive: false });

        return () => {
            document.removeEventListener("touchstart", onTouchStart);
            document.removeEventListener("touchend", onTouchEnd);
            document.removeEventListener("touchcancel", onTouchEnd);
            document.removeEventListener("touchmove", onTouchMove);
        };
    }, []);

    useEffect(() => {
        if (isInteracting && cameraRef.current) {
            frozenRotation.current.x = cameraRef.current.rotation.x;
            frozenRotation.current.y = cameraRef.current.rotation.y;
        }
    }, [isInteracting]);

    useFrame((_, delta) => {
        if (!originRef.current) return;
        if (isFocused) return;

        const keys = useKeyboardStore.getState().keys;

        forward.current.set(0, 0, -1).applyAxisAngle(up.current, yaw.current);
        right.current.set(1, 0, 0).applyAxisAngle(up.current, yaw.current);

        velocity.current.set(0, 0, 0);

        if (keys["KeyW"]) velocity.current.add(forward.current);
        if (keys["KeyS"]) velocity.current.sub(forward.current);
        if (keys["KeyA"]) velocity.current.sub(right.current);
        if (keys["KeyD"]) velocity.current.add(right.current);
        if (keys["KeyQ"]) velocity.current.y -= 1;
        if (keys["KeyE"]) velocity.current.y += 1;

        if (velocity.current.lengthSq() > 0) {
            velocity.current.normalize().multiplyScalar(speed * delta);
            originRef.current.position.add(velocity.current);
        }

        if (!cameraRef.current) return;

        cameraRef.current.position.copy(originRef.current.position);

        cameraRef.current.rotation.order = "YXZ";

        if (!isInteracting) {
            cameraRef.current.rotation.y = yaw.current;
            cameraRef.current.rotation.x = pitch.current;
        } else {
            cameraRef.current.rotation.y = frozenRotation.current.y;
            cameraRef.current.rotation.x = frozenRotation.current.x;
            yaw.current = cameraRef.current.rotation.y;
            pitch.current = cameraRef.current.rotation.x;
        }
    });

    useEffect(() => {
        const handler = (e: any) => {
            const { dir, pressed } = e.detail;
            const setKey = useKeyboardStore.getState().setKey;

            if (dir === "forward") setKey("KeyW", pressed);
            if (dir === "back") setKey("KeyS", pressed);
            if (dir === "left") setKey("KeyA", pressed);
            if (dir === "right") setKey("KeyD", pressed);
            if (dir === "up") setKey("KeyE", pressed);
            if (dir === "down") setKey("KeyQ", pressed);
        };

        window.addEventListener("mobile-move", handler);
        return () => window.removeEventListener("mobile-move", handler);
    }, []);

    return null;
}
