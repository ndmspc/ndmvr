import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useXRInputSourceState } from "@react-three/xr";
import * as THREE from "three";
import { useFocus } from "../../env/context/FocusContext.jsx";

export default function VRController({
    originRef,
    speed = 2,
    snapAngle = Math.PI / 6,
    snapDelay = 0.3,
    onToggleMenu,
    onToggleBinInfo,
}) {
    const rightController = useXRInputSourceState("controller", "right");
    const leftController = useXRInputSourceState("controller", "left");
    const { camera } = useThree();

    const cameraDirection = useRef(new THREE.Vector3());
    const strafeDirection = useRef(new THREE.Vector3());
    const moveVec = useRef(new THREE.Vector3());

    const lastA = useRef(false);
    const lastB = useRef(false);
    const snapTimer = useRef(0);
    const hasSnapped = useRef(false);
    const { focused } = useFocus();

    const DEADZONE = 0.15;
    const TRIGGER_T = 0.2;
    const SQUEEZE_T = 0.5;
    const SNAP_THRESHOLD = 0.7;

    useFrame((_, delta) => {
        if (!originRef?.current) return;
        if(focused) return;

        if (!leftController || !rightController) return;

        const leftGamepad = leftController?.gamepad;
        const rightGamepad = rightController?.gamepad;

        if (!leftGamepad || !rightGamepad) return;

        const leftThumbstick = leftGamepad["xr-standard-thumbstick"];
        const rightThumbstick = rightGamepad["xr-standard-thumbstick"];
        const leftTrigger = leftGamepad["xr-standard-trigger"];
        const leftSqueeze = leftGamepad["xr-standard-squeeze"];

        const lx = Math.abs(leftThumbstick?.xAxis ?? 0) > DEADZONE ? (leftThumbstick?.xAxis ?? 0) : 0;
        const lz = Math.abs(leftThumbstick?.yAxis ?? 0) > DEADZONE ? (leftThumbstick?.yAxis ?? 0) : 0;
        const rx = rightThumbstick?.xAxis ?? 0;

        if (Math.abs(rx) > SNAP_THRESHOLD) {
            const direction = rx > 0 ? -1 : 1;

            if (!hasSnapped.current) {
                originRef.current.rotation.y += direction * snapAngle;
                hasSnapped.current = true;
                snapTimer.current = 0;
            } else {
                snapTimer.current += delta;

                if (snapTimer.current >= snapDelay) {
                    originRef.current.rotation.y += direction * snapAngle;
                    snapTimer.current = 0;
                }
            }
        } else {
            snapTimer.current = 0;
            hasSnapped.current = false;
        }

        camera.getWorldDirection(cameraDirection.current);
        cameraDirection.current.y = 0;
        cameraDirection.current.normalize();

        strafeDirection.current
            .crossVectors(cameraDirection.current, new THREE.Vector3(0, 1, 0))
            .normalize();

        moveVec.current.set(0, 0, 0);
        moveVec.current.addScaledVector(cameraDirection.current, -lz);
        moveVec.current.addScaledVector(strafeDirection.current, lx);

        if (moveVec.current.lengthSq() > 0) {
            moveVec.current.normalize();
            originRef.current.position.addScaledVector(moveVec.current, speed * delta);
        }

        const triggerVal = leftTrigger?.button ?? 0;
        const squeezeVal = leftSqueeze?.button ?? 0;

        const ascend = triggerVal > TRIGGER_T;
        const descend = (leftSqueeze?.state === "pressed") || (squeezeVal > SQUEEZE_T);

        if (ascend) originRef.current.position.y += speed * delta;
        if (descend) originRef.current.position.y -= speed * delta;

        const bBtn = rightGamepad["b-button"];
        if (bBtn?.state === "pressed" && !lastB.current) {
            onToggleMenu?.();
            lastB.current = true;
        }
        if (bBtn?.state !== "pressed") lastB.current = false;

        const aBtn = rightGamepad["a-button"];
        if (aBtn?.state === "pressed" && !lastA.current) {
            onToggleBinInfo?.();
            lastA.current = true;
        }
        if (aBtn?.state !== "pressed") lastA.current = false;
    });

    return null;
}