import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useXRInputSourceState } from "@react-three/xr";
import * as THREE from "three";

export default function VRController({
    originRef,
    speed = 2,
    turnSpeed = 0.4,
    onToggleMenu,
    onToggleBinInfo,
}) {
    const rightController = useXRInputSourceState("controller", "right");
    const leftController = useXRInputSourceState("controller", "left");
    const { camera } = useThree();
    const cameraDirection = new THREE.Vector3();

    const lastA = useRef(false);
    const lastB = useRef(false);

    const DEADZONE = 0.15;
    const TRIGGER_T = 0.2;
    const SQUEEZE_T = 0.5;

    useFrame((_, delta) => {

        if (!originRef?.current) return

        const leftThumbstick  = leftController?.gamepad?.["xr-standard-thumbstick"];
        const rightThumbstick = rightController?.gamepad?.["xr-standard-thumbstick"];
        const leftTrigger     = leftController?.gamepad?.["xr-standard-trigger"];
        const leftSqueeze     = leftController?.gamepad?.["xr-standard-squeeze"];

        const lx = Math.abs(leftThumbstick?.xAxis ?? 0) > DEADZONE ? (leftThumbstick?.xAxis ?? 0) : 0;
        const lz = Math.abs(leftThumbstick?.yAxis ?? 0) > DEADZONE ? (leftThumbstick?.yAxis ?? 0) : 0;
        const rx = Math.abs(rightThumbstick?.xAxis ?? 0) > DEADZONE ? (rightThumbstick?.xAxis ?? 0) : 0;

        if (rx) originRef.current.rotation.y -= rx * turnSpeed * delta;

        camera.getWorldDirection(cameraDirection);
        cameraDirection.y = 0;
        cameraDirection.normalize();

        const strafeDirection = new THREE.Vector3()
            .crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0))
            .normalize();

        const moveVec = new THREE.Vector3();
        moveVec.addScaledVector(cameraDirection, -lz);
        moveVec.addScaledVector(strafeDirection, lx);
        if (moveVec.lengthSq() > 0) {
            moveVec.normalize();
            originRef.current.position.addScaledVector(moveVec, speed * delta);
        }

        const triggerVal = leftTrigger?.button ?? 0; // 0..1
        const squeezeVal = leftSqueeze?.button ?? 0;

        const ascend = triggerVal > TRIGGER_T;
        const descend = (leftSqueeze?.state === "pressed") || (squeezeVal > SQUEEZE_T);

        if (ascend) originRef.current.position.y += speed * delta;
        if (descend) originRef.current.position.y -= speed * delta;

        const bBtn = rightController?.gamepad?.["b-button"];
        if (bBtn?.state === "pressed" && !lastB.current) {
            onToggleMenu?.();
            lastB.current = true;
        }
        if (bBtn?.state !== "pressed") lastB.current = false;

        const aBtn = rightController?.gamepad?.["a-button"];
        if (aBtn?.state === "pressed" && !lastA.current) {
            onToggleBinInfo?.();
            lastA.current = true;
        }
        if (aBtn?.state !== "pressed") lastA.current = false;
    });

    return null;
}
