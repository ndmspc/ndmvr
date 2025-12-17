import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useUIInteraction } from "../../ui/interactions/useUIInteraction";
import { useInputFocus } from "../../ui/focus/useInputFocus";
import { is } from "@react-three/fiber/dist/declarations/src/core/utils";

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
    const yaw = useRef(0);
    const pitch = useRef(0);
    const isInteracting = useUIInteraction((state) => state.isInteracting);
    const isFocused = useInputFocus((state) => state.isFocused);
    const frozenRotation = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const onKeyDown = (e) => {
            keys.current[e.code] = true;
            if (e.code === "KeyM" && !isFocused) onToggleMenu?.();
            if (e.code === "KeyH" && !isFocused) onToggleHelp?.();
            // if (e.code === "KeyB" && !isFocused) onToggleBinInfo?.();
            // if (e.code === "KeyN" && !isFocused) onToggleDemo?.();
            if (e.code === "KeyR") {
                window.dispatchEvent(new CustomEvent("ndmvr-menu-reset"));
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
    }, [onToggleMenu, onToggleHelp, isFocused]);

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

    return null;
}
