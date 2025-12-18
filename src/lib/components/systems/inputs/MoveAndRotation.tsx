import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, ThreeEvent, useThree } from "@react-three/fiber";
import { useXR, useXRInputSourceState } from "@react-three/xr";

import { updateDesktopFrame } from "./DesktopCameraHelper.tsx";
import {
    updateVRFrame,
    handleVRPointerDown,
    handleVRPointerMove,
    handleVRPointerUp,
} from "./VRCameraHelper.tsx";

export interface UseMoveAndRotationOptions {
    originRef: React.RefObject<THREE.Group> | null;
    offset?: { x: number; y: number; z: number };
}

export type MoveAndRotationCtx = {
    originRef: React.RefObject<THREE.Group> | null;
    offset: { x: number; y: number; z: number };

    session: XRSession | null;
    camera: THREE.Camera;

    rightController: unknown;
    leftController: unknown;

    groupRef: React.MutableRefObject<THREE.Group | null>;

    // POSITION
    currentPos: React.MutableRefObject<THREE.Vector3>;
    orbitAngle: React.MutableRefObject<number>;
    radius: React.MutableRefObject<number>;

    // DRAG
    isDragging: React.MutableRefObject<boolean>;
    dragPlane: React.MutableRefObject<THREE.Plane>;
    dragOffset: React.MutableRefObject<THREE.Vector3>;
    dragIntersection: React.MutableRefObject<THREE.Vector3>;

    // ROTATION
    rotation: React.MutableRefObject<THREE.Euler>;
    isRotating: React.MutableRefObject<boolean>;
    isShiftPressed: React.MutableRefObject<boolean>;
    startRotation: React.MutableRefObject<{ x: number; y: number }>;
    startAngles: React.MutableRefObject<{ yaw: number; pitch: number }>;

    // FOLLOW
    followEnabled: React.MutableRefObject<boolean>;
    originAnchor: React.MutableRefObject<THREE.Vector3>;

    // SAVE
    lastRightSqueeze: React.MutableRefObject<boolean>;

    // CONSTANTS
    ROTATION_SPEED: number;
    ZOOM_SPEED: number;
    DEADZONE: number;

    // TEMPS
    tmpOffset: React.MutableRefObject<THREE.Vector3>;
    tmpTarget: React.MutableRefObject<THREE.Vector3>;
    tmpWorld: React.MutableRefObject<THREE.Vector3>;

    // HELPERS
    isRightSqueezePressed: () => boolean;
    saveOffset: () => void;
    saveRotation: () => void;
    recomputeOrbitFrom: (v: THREE.Vector3) => void;
};

export function useMoveAndRotation({
    originRef,
    offset = { x: 0, y: 1.2, z: -4 },
}: UseMoveAndRotationOptions) {
    const groupRef = useRef<THREE.Group | null>(null);

    const session = useXR((s) => s.session);
    const rightController = useXRInputSourceState("controller", "right");
    const leftController = useXRInputSourceState("controller", "left");

    const { camera } = useThree();

    // POSITION
    const currentPos = useRef(new THREE.Vector3(offset.x, offset.y, offset.z));
    const orbitAngle = useRef(Math.atan2(offset.x, offset.z));
    const radius = useRef(Math.sqrt(offset.x * offset.x + offset.z * offset.z) || 1e-6);

    // DRAG
    const isDragging = useRef(false);
    const dragPlane = useRef(new THREE.Plane());
    const dragOffset = useRef(new THREE.Vector3());
    const dragIntersection = useRef(new THREE.Vector3());

    // ROTATION
    const rotation = useRef(new THREE.Euler(0, 0, 0));
    const isRotating = useRef(false);
    const isShiftPressed = useRef(false);
    const startRotation = useRef({ x: 0, y: 0 });
    const startAngles = useRef({ yaw: 0, pitch: 0 });

    // FOLLOW
    const followEnabled = useRef(true);
    const originAnchor = useRef(new THREE.Vector3());

    // SAVE
    const lastRightSqueeze = useRef(false);

    // CONST
    const ROTATION_SPEED = 4.0;
    const ZOOM_SPEED = 10;
    const DEADZONE = 0.65;

    // TEMPS
    const tmpOffset = useRef(new THREE.Vector3());
    const tmpTarget = useRef(new THREE.Vector3());
    const tmpWorld = useRef(new THREE.Vector3());

    const isRightSqueezePressed = () => {
        const gp = (rightController as any)?.gamepad as any | undefined;
        if (!gp) return false;
        const sq = gp["xr-standard-squeeze"];
        if (!sq) return false;
        const val = sq.button ?? 0;
        return sq.state === "pressed" || val > 0.5;
    };

    const saveOffset = () => {
        sessionStorage.setItem(
            "menuOffset",
            JSON.stringify({
                x: currentPos.current.x,
                y: currentPos.current.y,
                z: currentPos.current.z,
            })
        );
    };

    const saveRotation = () => {
        sessionStorage.setItem(
            "menuRotation",
            JSON.stringify({
                x: rotation.current.x,
                y: rotation.current.y,
            })
        );
    };

    const recomputeOrbitFrom = (v: THREE.Vector3) => {
        const { x, z } = v;
        const r = Math.sqrt(x * x + z * z);
        if (r > 1e-6) radius.current = r;
        orbitAngle.current = Math.atan2(x, z);
    };

    useEffect(() => {
        const savedOffset = sessionStorage.getItem("menuOffset");
        if (savedOffset) {
            try {
                const obj = JSON.parse(savedOffset);
                currentPos.current.set(obj.x, obj.y, obj.z);
                recomputeOrbitFrom(currentPos.current);
            } catch {
                /* empty */
            }
        }

        const savedFollow = sessionStorage.getItem("menuFollow");
        if (savedFollow !== null) {
            followEnabled.current = savedFollow === "true";
        }

        const savedAnchor = sessionStorage.getItem("menuAnchor");
        if (savedAnchor) {
            try {
                const obj = JSON.parse(savedAnchor);
                originAnchor.current.set(obj.x, obj.y, obj.z);
            } catch {
                /* empty */
            }
        }
    }, []);

    // EVENTS
    useEffect(() => {
        const handleReset = () => {
            currentPos.current.set(offset.x, offset.y, offset.z);
            rotation.current.set(0, 0, 0);

            if (groupRef.current) groupRef.current.rotation.set(0, 0, 0);

            radius.current = Math.sqrt(offset.x * offset.x + offset.z * offset.z) || radius.current;
            orbitAngle.current = Math.atan2(offset.x, offset.z);

            followEnabled.current = true;
            originAnchor.current.set(0, 0, 0);

            sessionStorage.setItem("menuOffset", JSON.stringify(offset));
            sessionStorage.setItem("menuRotation", JSON.stringify({ x: 0, y: 0 }));
            sessionStorage.setItem("menuFollow", "true");
            sessionStorage.removeItem("menuAnchor");
        };

        const handleShift = (e: CustomEvent<{ pressed: boolean }>) => {
            isShiftPressed.current = !!e.detail?.pressed;
        };

        const handleFollowToggle = () => {
            if (!originRef?.current || !groupRef.current) return;

            followEnabled.current = !followEnabled.current;

            if (!followEnabled.current) {
                originAnchor.current.copy(originRef.current.position);
                sessionStorage.setItem("menuFollow", "false");
                sessionStorage.setItem(
                    "menuAnchor",
                    JSON.stringify({
                        x: originAnchor.current.x,
                        y: originAnchor.current.y,
                        z: originAnchor.current.z,
                    })
                );
            } else {
                groupRef.current.getWorldPosition(tmpWorld.current);
                const originPos = originRef.current.position;

                const newOffset = tmpWorld.current.clone().sub(originPos);
                currentPos.current.copy(newOffset);
                recomputeOrbitFrom(newOffset);

                sessionStorage.setItem("menuFollow", "true");
                sessionStorage.removeItem("menuAnchor");
                saveOffset();
            }
        };

        window.addEventListener("ndmvr-menu-reset", handleReset);
        window.addEventListener("ndmvr-menu-shift", handleShift as EventListener);
        window.addEventListener("ndmvr-menu-follow-toggle", handleFollowToggle);

        return () => {
            window.removeEventListener("ndmvr-menu-reset", handleReset);
            window.removeEventListener("ndmvr-menu-shift", handleShift as EventListener);
            window.removeEventListener("ndmvr-menu-follow-toggle", handleFollowToggle);
        };
    }, [offset, originRef]);

    // LOAD rotation
    useEffect(() => {
        const savedRot = sessionStorage.getItem("menuRotation");
        if (savedRot && groupRef.current) {
            try {
                const obj = JSON.parse(savedRot);
                rotation.current.x = obj.x;
                rotation.current.y = obj.y;
                groupRef.current.rotation.set(obj.x, obj.y, 0);
            } catch {
                /* empty */
            }
        }
    }, []);

    const ctx: MoveAndRotationCtx = {
        originRef,
        offset,

        session,
        camera,

        rightController,
        leftController,

        groupRef,

        currentPos,
        orbitAngle,
        radius,

        isDragging,
        dragPlane,
        dragOffset,
        dragIntersection,

        rotation,
        isRotating,
        isShiftPressed,
        startRotation,
        startAngles,

        followEnabled,
        originAnchor,

        lastRightSqueeze,

        ROTATION_SPEED,
        ZOOM_SPEED,
        DEADZONE,

        tmpOffset,
        tmpTarget,
        tmpWorld,

        isRightSqueezePressed,
        saveOffset,
        saveRotation,
        recomputeOrbitFrom,
    };

    useFrame((_, delta) => {
        if (!groupRef.current) return;

        if (!session) {
            updateDesktopFrame(ctx, delta);
            return;
        }

        updateVRFrame(ctx, delta);
    });

    return {
        groupRef,
        handlePointerDown: (e: ThreeEvent<PointerEvent>) => handleVRPointerDown(ctx, e),
        handlePointerMove: (e: ThreeEvent<PointerEvent>) => handleVRPointerMove(ctx, e),
        handlePointerUp: (e: ThreeEvent<PointerEvent>) => handleVRPointerUp(ctx, e),
    };
}
