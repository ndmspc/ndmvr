import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useXR, useXRInputSourceState } from "@react-three/xr";
import { useInputFocus } from "../../ui/focus/useInputFocus";
import { useSceneModeStore } from "../../../stores/sceneMode/store.ts";
import * as THREE from "three";
import { useMenuStore } from "../../../stores/menu/store.ts";

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
    const { toggleTab } = useMenuStore();

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
    const lastBinBoxToggle = useRef(false);
    const lastX = useRef(false);
    const lastY = useRef(false);
    const lastRightSqueeze = useRef(false);

    const snapTimer = useRef(0);
    const hasSnapped = useRef(false);

    const isFocused = useInputFocus((state) => state.isFocused);

    const lastSnap = useRef(false);
    const activeMode = useSceneModeStore((s) => s.activeMode);
    const setActiveMode = useSceneModeStore((s) => s.setActiveMode);
    const toggleBinBoxEnabled = useSceneModeStore((s) => s.toggleBinBoxEnabled);

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

    const handleControllers = (delta: number) => {
        if (!originRef?.current) return;
        if (isFocused) return;

        if (!leftController || !rightController) return;

        const leftGamepad = controllersReady.left ? leftController?.gamepad : null;
        const rightGamepad = controllersReady.right ? rightController?.gamepad : null;

        const rightSqueeze = rightGamepad ? (rightGamepad as any)["xr-standard-squeeze"] : null;
        const rightSqueezePressed =
            !!rightSqueeze &&
            (rightSqueeze.state === "pressed" || (rightSqueeze.button ?? 0) > SQUEEZE_T);

        if (leftGamepad) {
            const leftThumbstick = (leftGamepad as any)["xr-standard-thumbstick"];
            const leftTrigger = (leftGamepad as any)["xr-standard-trigger"];
            const leftSqueeze = (leftGamepad as any)["xr-standard-squeeze"];

            if (leftThumbstick) {
                const lx =
                    Math.abs(leftThumbstick.xAxis ?? 0) > DEADZONE
                        ? (leftThumbstick.xAxis ?? 0)
                        : 0;
                const lz =
                    Math.abs(leftThumbstick.yAxis ?? 0) > DEADZONE
                        ? (leftThumbstick.yAxis ?? 0)
                        : 0;

                if (!rightSqueezePressed && (lx !== 0 || lz !== 0)) {
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
            }

            if (leftTrigger && leftSqueeze) {
                const triggerVal = leftTrigger.button ?? 0;
                const squeezeVal = leftSqueeze.button ?? 0;

                const ascend = triggerVal > TRIGGER_T;
                const descend = leftSqueeze.state === "pressed" || squeezeVal > SQUEEZE_T;

                if (ascend) originRef.current.position.y += speed * delta;
                if (descend) originRef.current.position.y -= speed * delta;
            }

            const xBtn = (leftGamepad as any)["x-button"];
            const xPressed = !!xBtn && xBtn.state === "pressed";
            if (xPressed && !lastX.current) {
                window.dispatchEvent(new CustomEvent("ndmvr-menu-reset"));
            }
            lastX.current = xPressed;

            const yBtn = (leftGamepad as any)["y-button"];
            const yPressed = !!yBtn && yBtn.state === "pressed";
            if (yPressed && !lastY.current) {
                toggleTab?.("help");
            }
            lastY.current = yPressed;

            const A = (rightGamepad as any)["a-button"];
            const APressed = !!A && (A.state === "pressed" || (A.button ?? 0) > SQUEEZE_T);
            if (APressed && !lastA.current) {
                // Toggle Modify Mode with left grip
                setActiveMode(activeMode === "default" ? "modify" : "default");
                window.dispatchEvent(
                    new CustomEvent("ndmvr-mode-toggle", {
                        detail: { enabled: activeMode === "default" ? "modify" : "default" },
                    })
                );
            }
            lastA.current = APressed;
        }

        if (rightGamepad) {
            const rightThumbstick = (rightGamepad as any)["xr-standard-thumbstick"];
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

            const rightTrigger = rightGamepad
                ? (rightGamepad as any)["xr-standard-trigger"]
                : null;

            const rightTriggerPressed =
                !!rightTrigger &&
                (rightTrigger.state === "pressed" ||
                    (rightTrigger.button ?? 0) > TRIGGER_T);

            const snapPressed = activeMode === "modify" && rightTriggerPressed;

            if (snapPressed !== lastSnap.current) {
                window.dispatchEvent(
                    new CustomEvent("ndmvr-shiftstep-scale", { detail: { pressed: snapPressed } })
                );
                lastSnap.current = snapPressed;
            }


            const bBtn = (rightGamepad as any)["b-button"];
            const bPressed = !!bBtn && bBtn.state === "pressed";
            const binBoxTogglePressed = rightSqueezePressed && bPressed;

            if (binBoxTogglePressed && !lastBinBoxToggle.current) {
                toggleBinBoxEnabled();
            } else if (bPressed && !rightSqueezePressed && !lastB.current) {
                toggleTab?.(null);
            }
            lastBinBoxToggle.current = binBoxTogglePressed;
            lastB.current = bPressed;

            const aBtn = (rightGamepad as any)["a-button"];
            const aPressed = !!aBtn && aBtn.state === "pressed";
            if (aPressed && !lastA.current) {
                window.dispatchEvent(new CustomEvent("ndmvr-menu-follow-toggle"));
            }
            lastA.current = aPressed;
        }

        if (leftGamepad && rightGamepad) {
            const leftThumbstick = (leftGamepad as any)["xr-standard-thumbstick"];

            if (rightSqueezePressed && leftThumbstick) {
                const rawLX = leftThumbstick.xAxis ?? 0;
                const rawLZ = leftThumbstick.yAxis ?? 0;

                const orbitX = Math.abs(rawLX) > DEADZONE ? rawLX : 0;
                const orbitY = Math.abs(rawLZ) > DEADZONE ? rawLZ : 0;

                if (orbitX !== 0 || orbitY !== 0) {
                    window.dispatchEvent(
                        new CustomEvent("ndmvr-menu-orbit", {
                            detail: { axisX: orbitX, axisY: orbitY, delta },
                        })
                    );
                }
            }

            if (!rightSqueezePressed && lastRightSqueeze.current) {
                window.dispatchEvent(new CustomEvent("ndmvr-menu-orbit-end"));
            }

            lastRightSqueeze.current = rightSqueezePressed;
        }
    };

    useFrame((_, delta) => {
        handleControllers(delta);
    });

    return null;
}
