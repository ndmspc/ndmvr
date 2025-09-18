import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function DesktopController({
    originRef,
    cameraRef,
    speed = 5,
    onToggleMenu,
    onToggleBinInfo,
}) {
    const keys = useRef({});
    const isMouseDown = useRef(false);
    const yaw = useRef(0);
    const pitch = useRef(0);

    useEffect(() => {
        const onKeyDown = (e) => {
            keys.current[e.code] = true;
            if (e.code === "KeyF") onToggleMenu?.();
            if (e.code === "KeyB") onToggleBinInfo?.();
        };
        const onKeyUp = (e) => {
            keys.current[e.code] = false;
        };

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
        };
    }, [onToggleMenu, onToggleBinInfo]);

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
            pitch.current = Math.max(
                -Math.PI / 2,
                Math.min(Math.PI / 2, pitch.current)
            );
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

    useFrame((_, delta) => {
        if (!originRef.current) return;

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

        if (cameraRef?.current) {
            cameraRef.current.position.copy(originRef.current.position);
            cameraRef.current.rotation.order = "YXZ";
            cameraRef.current.rotation.y = yaw.current;
            cameraRef.current.rotation.x = pitch.current;
        }
    });

    return null;
}
