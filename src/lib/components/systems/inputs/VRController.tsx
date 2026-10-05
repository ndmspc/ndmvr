import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useXR, useXRInputSourceState } from "@react-three/xr";
import * as THREE from "three";
import {
    isInputBlocked,
    buttonPressed,
    controllerGamepad,
} from "../../../interactions/input/useInputBinding";

export interface VRControllerProps {
    originRef: React.RefObject<THREE.Group | null>;
    speed?: number;
    snapAngle?: number;
    snapDelay?: number;
}

export default function VRController({
    originRef,
    speed = 2,
    snapAngle = Math.PI / 6,
    snapDelay = 0.3,
}: VRControllerProps): null {
    const session = useXR((s) => s.session);
    const left = useXRInputSourceState("controller", "left");
    const right = useXRInputSourceState("controller", "right");
    const camera = useThree((s) => s.camera);
    const forward = useRef(new THREE.Vector3());
    const strafe = useRef(new THREE.Vector3());
    const movement = useRef(new THREE.Vector3());
    const up = useRef(new THREE.Vector3(0, 1, 0));
    const snapped = useRef(false);
    const timer = useRef(0);
    const blurred = useRef(false);
    const ended = useRef(false);

    useEffect(() => {
        ended.current = false;
        const cancel = () => {
            snapped.current = false;
            timer.current = 0;
        };
        const end = () => {
            ended.current = true;
            cancel();
        };
        const blur = () => {
            blurred.current = true;
            cancel();
        };
        const focus = () => {
            blurred.current = false;
        };
        window.addEventListener("blur", blur);
        window.addEventListener("focus", focus);
        session?.addEventListener("inputsourceschange", cancel);
        session?.addEventListener("visibilitychange", cancel);
        session?.addEventListener("end", end);
        return () => {
            window.removeEventListener("blur", blur);
            window.removeEventListener("focus", focus);
            session?.removeEventListener("inputsourceschange", cancel);
            session?.removeEventListener("visibilitychange", cancel);
            session?.removeEventListener("end", end);
            cancel();
        };
    }, [session]);

    useFrame((_, delta) => {
        const origin = originRef.current;
        if (!origin || ended.current || blurred.current || document.hidden || isInputBlocked()) {
            snapped.current = false;
            timer.current = 0;
            return;
        }
        const leftPad = controllerGamepad(session, left);
        const rightPad = controllerGamepad(session, right);
        const stick = leftPad?.["xr-standard-thumbstick"];
        const x = Math.abs(stick?.xAxis ?? 0) > 0.15 ? stick.xAxis : 0;
        const z = Math.abs(stick?.yAxis ?? 0) > 0.15 ? stick.yAxis : 0;
        // Right grip reserves the horizontal stick for manipulation. No feature knowledge needed.
        if (!buttonPressed(rightPad, "xr-standard-squeeze") && (x || z)) {
            camera.getWorldDirection(forward.current);
            forward.current.y = 0;
            forward.current.normalize();
            strafe.current.crossVectors(forward.current, up.current).normalize();
            movement.current
                .copy(forward.current)
                .multiplyScalar(-z)
                .addScaledVector(strafe.current, x)
                .normalize();
            origin.position.addScaledVector(movement.current, speed * delta);
        }
        if ((leftPad?.["xr-standard-trigger"]?.button ?? 0) > 0.2)
            origin.position.y += speed * delta;
        if (buttonPressed(leftPad, "xr-standard-squeeze")) origin.position.y -= speed * delta;

        const turn = rightPad?.["xr-standard-thumbstick"]?.xAxis ?? 0;
        if (Math.abs(turn) > 0.7) {
            if (!snapped.current || (timer.current += delta) >= snapDelay) {
                origin.rotation.y += (turn > 0 ? -1 : 1) * snapAngle;
                snapped.current = true;
                timer.current = 0;
            }
        } else {
            snapped.current = false;
            timer.current = 0;
        }
    });
    return null;
}
