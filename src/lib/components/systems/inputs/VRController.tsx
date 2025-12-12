import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useXR, useXRInputSourceState } from "@react-three/xr";
import * as THREE from "three";
import { useFocus } from "../../env/context/FocusContext.tsx";

export interface VRControllerProps {
    originRef: React.RefObject<THREE.Group>;
    speed?: number;
    snapAngle?: number;
    snapDelay?: number;
    onToggleMenu?: () => void;
    onToggleHelp?: () => void;
}

export default function VRController({
    originRef,
    speed = 2,
    snapAngle = Math.PI / 6,
    snapDelay = 0.3,
    onToggleMenu,
    onToggleHelp,
}: VRControllerProps) {
    const session = useXR((s) => s.session);
    const [controllersReady, setControllersReady] = useState({
        left: false,
        right: false,
    });
    const rightController = useXRInputSourceState("controller", "right");
    const leftController = useXRInputSourceState("controller", "left");
    const { camera } = useThree();

    const cameraDirection = useRef(new THREE.Vector3());
    const strafeDirection = useRef(new THREE.Vector3());
    const moveVec = useRef(new THREE.Vector3());

    const lastA = useRef(false);
    const lastB = useRef(false);
    const lastX = useRef(false);
    const lastY = useRef(false);
    const snapTimer = useRef(0);
    const hasSnapped = useRef(false);
    const { focused } = useFocus();

    const DEADZONE = 0.15;
    const TRIGGER_T = 0.2;
    const SQUEEZE_T = 0.5;
    const SNAP_THRESHOLD = 0.7;

    useEffect(() => {
        if (!session) {
            setControllersReady({ left: false, right: false });
            return;
        }

        const checkControllers = () => {
            const sources = Array.from(session.inputSources);

            const validControllers = sources.filter(
                (source) => source.targetRayMode === "tracked-pointer" && source.gamepad !== null
            );

            const hasLeft = validControllers.some((c) => c.handedness === "left");
            const hasRight = validControllers.some((c) => c.handedness === "right");

            setControllersReady({ left: hasLeft, right: hasRight });

            console.log(`Controllers: Left=${hasLeft}, Right=${hasRight}`);
        };

        checkControllers();
        session.addEventListener("inputsourceschange", checkControllers);

        return () => {
            session.removeEventListener("inputsourceschange", checkControllers);
        };
    }, [session]);

    const handleControllers = (delta) => {
        if (!originRef?.current) return;
        if (focused) return;

        if (!leftController || !rightController) return;

        const leftGamepad = controllersReady.left ? leftController?.gamepad : null;
        const rightGamepad = controllersReady.right ? rightController?.gamepad : null;

        if (leftGamepad) {
            const leftThumbstick = leftGamepad["xr-standard-thumbstick"];
            const leftTrigger = leftGamepad["xr-standard-trigger"];
            const leftSqueeze = leftGamepad["xr-standard-squeeze"];

            if (leftThumbstick) {
                const lx =
                    Math.abs(leftThumbstick.xAxis ?? 0) > DEADZONE
                        ? (leftThumbstick.xAxis ?? 0)
                        : 0;
                const lz =
                    Math.abs(leftThumbstick.yAxis ?? 0) > DEADZONE
                        ? (leftThumbstick.yAxis ?? 0)
                        : 0;

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
            }

            if (leftTrigger && leftSqueeze) {
                const triggerVal = leftTrigger.button ?? 0;
                const squeezeVal = leftSqueeze.button ?? 0;

                const ascend = triggerVal > TRIGGER_T;
                const descend = leftSqueeze.state === "pressed" || squeezeVal > SQUEEZE_T;

                if (ascend) originRef.current.position.y += speed * delta;
                if (descend) originRef.current.position.y -= speed * delta;
            }

            const xBtn = leftGamepad["x-button"];
            if (xBtn?.state === "pressed" && !lastX.current) {
                window.dispatchEvent(new CustomEvent("ndmvr-menu-reset"));
                lastX.current = true;
            }
            if (xBtn?.state !== "pressed") {
                lastX.current = false;
            }

            const yBtn = leftGamepad["y-button"];
            if (yBtn?.state === "pressed" && !lastY.current) {
                onToggleHelp?.();
                lastY.current = true;
            }
            if (yBtn?.state !== "pressed") lastY.current = false;
        }

        if (rightGamepad) {
            const rightThumbstick = rightGamepad["xr-standard-thumbstick"];

            if (rightThumbstick) {
                const rx = rightThumbstick.xAxis ?? 0;

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
            }

            const bBtn = rightGamepad["b-button"];
            if (bBtn?.state === "pressed" && !lastB.current) {
                onToggleMenu?.();
                lastB.current = true;
            }
            if (bBtn?.state !== "pressed") lastB.current = false;

            const aBtn = rightGamepad["a-button"];
            if (aBtn.state === "pressed" && !lastA.current) {
                window.dispatchEvent(
                    new CustomEvent("ndmvr-menu-shift", {
                        detail: { pressed: true },
                    })
                );
                lastA.current = true;
            }

            if (aBtn.state !== "pressed" && lastA.current) {
                window.dispatchEvent(
                    new CustomEvent("ndmvr-menu-shift", {
                        detail: { pressed: false },
                    })
                );
                lastA.current = false;
            }
        }
    };

    useFrame((_, delta) => {
        handleControllers(delta);
    });

    return null;
}
