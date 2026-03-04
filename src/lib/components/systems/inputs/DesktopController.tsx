import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useUIInteraction } from "../../ui/interactions/useUIInteraction";
import { useInputFocus } from "../../ui/focus/useInputFocus";
import { useSceneModeStore } from "../../../stores/sceneMode/store.ts";

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
    onToggleMenu,
    onToggleHelp,
}: DesktopControllerProps) {
    const keys = useRef({});
    const isMouseDown = useRef(false);
    const isTouching = useRef(false); // Новий ref для тачів
    const lastTouchPosition = useRef({ x: 0, y: 0 }); // Зберігаємо останню позицію тачу
    const yaw = useRef(0);
    const pitch = useRef(0);
    const isInteracting = useUIInteraction((state) => state.isInteracting);
    const isFocused = useInputFocus((state) => state.isFocused);
    const frozenRotation = useRef({ x: 0, y: 0 });

    const modifyModeEnabled = useSceneModeStore((s) => s.modifyModeEnabled);
    const setModifyModeEnabled = useSceneModeStore((s) => s.setModifyModeEnabled);

    useEffect(() => {
        const onKeyDown = (e) => {
            keys.current[e.code] = true;
            if (e.code === "KeyM" && !e.ctrlKey && !isFocused) onToggleMenu?.();
            if (e.code === "KeyH" && !isFocused) onToggleHelp?.();
            if (e.code === "KeyR") {
                window.dispatchEvent(new CustomEvent("ndmvr-menu-reset"));
            }
            // Toggle Modify Mode with Ctrl+M
            if (e.code === "KeyM" && e.ctrlKey && !isFocused) {
                e.preventDefault();
                setModifyModeEnabled(!modifyModeEnabled);
                window.dispatchEvent(
                    new CustomEvent("ndmvr-modify-mode-toggle", {
                        detail: { enabled: !modifyModeEnabled },
                    })
                );
            }

            if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
                window.dispatchEvent(
                    new CustomEvent("ndmvr-menu-shift", {
                        detail: { pressed: true },
                    })
                );
            }
        };
        const onKeyUp = (e) => {
            keys.current[e.code] = false;

            if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
                window.dispatchEvent(
                    new CustomEvent("ndmvr-menu-shift", {
                        detail: { pressed: false },
                    })
                );
            }
        };

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
        };
    }, [onToggleMenu, onToggleHelp, isFocused, setModifyModeEnabled, modifyModeEnabled]);

    useEffect(() => {
        const onMouseDown = (e) => {
            if (e.button === 0) {
                isMouseDown.current = true;
            }
        };
        const onMouseUp = (e) => {
            if (e.button === 0) {
                isMouseDown.current = false;
            }
        };
        const onMouseMove = (e) => {
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
        const onTouchStart = (e) => {
            if (e.touches.length === 1) {
                isTouching.current = true;
                lastTouchPosition.current = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY,
                };
            }
        };

        const onTouchEnd = () => {
            isTouching.current = false;
        };

        const onTouchMove = (e) => {
            if (!isTouching.current || e.touches.length !== 1) return;

            const currentTouch = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
            };

            const movementX = currentTouch.x - lastTouchPosition.current.x;
            const movementY = currentTouch.y - lastTouchPosition.current.y;

            lastTouchPosition.current = currentTouch;

            const sensitivity = 0.002;
            yaw.current -= movementX * sensitivity;
            pitch.current -= movementY * sensitivity;
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

        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            yaw.current
        );
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            yaw.current
        );

        const velocity = new THREE.Vector3();
        if (keys.current["KeyW"]) velocity.add(forward);
        if (keys.current["KeyS"]) velocity.add(forward.clone().negate());
        if (keys.current["KeyA"]) velocity.add(right.clone().negate());
        if (keys.current["KeyD"]) velocity.add(right);
        if (keys.current["KeyQ"]) velocity.y -= 1;
        if (keys.current["KeyE"]) velocity.y += 1;

        if (velocity.length() > 0) {
            velocity.normalize().multiplyScalar(speed * delta);
            originRef.current.position.add(velocity);
        }

        if (!cameraRef?.current) return;

        cameraRef.current.position.copy(originRef.current.position);

        if (!isInteracting) {
            cameraRef.current.rotation.order = "YXZ";
            cameraRef.current.rotation.y = yaw.current;
            cameraRef.current.rotation.x = pitch.current;
        } else {
            cameraRef.current.rotation.order = "YXZ";
            cameraRef.current.rotation.y = frozenRotation.current.y;
            cameraRef.current.rotation.x = frozenRotation.current.x;
            yaw.current = cameraRef.current.rotation.y;
            pitch.current = cameraRef.current.rotation.x;
        }
    });

    useEffect(() => {
        const handler = (e: any) => {
            const { dir, pressed } = e.detail;

            const set = (code: string) => {
                keys.current[code] = pressed;
            };

            if (dir === "forward") set("KeyW");
            if (dir === "back") set("KeyS");
            if (dir === "left") set("KeyA");
            if (dir === "right") set("KeyD");
            if (dir === "up") set("KeyE");
            if (dir === "down") set("KeyQ");
        };

        window.addEventListener("mobile-move", handler);
        return () => window.removeEventListener("mobile-move", handler);
    }, []);

    return null;
}
