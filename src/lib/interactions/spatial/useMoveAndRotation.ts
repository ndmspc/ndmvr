import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { useXR, useXRInputSourceState } from "@react-three/xr";

import { INTERACTION_EVENTS } from "../events";
import type { PressedInteractionDetail } from "../events";
import { updateDesktopFrame } from "./desktop";
import {
    getSpatialStorageKeys,
    readStoredBoolean,
    readStoredJson,
    removeStoredValue,
    writeStoredBoolean,
    writeStoredJson,
} from "./storage";
import type { StoredRotation, StoredVector3 } from "./storage";
import type {
    MoveAndRotationCtx,
    MoveAndRotationResult,
    UseMoveAndRotationOptions,
} from "./types";
import {
    handleVRPointerDown,
    handleVRPointerMove,
    handleVRPointerUp,
    updateVRFrame,
} from "./xr";

export function useMoveAndRotation({
    originRef = null,
    offset = { x: 0, y: 1.2, z: -4 },
    faceUser = true,
    storageKey = "menu",
}: UseMoveAndRotationOptions): MoveAndRotationResult {
    const groupRef = useRef<THREE.Group | null>(null);

    const session = useXR((s) => s.session);
    const rightController = useXRInputSourceState("controller", "right");
    const leftController = useXRInputSourceState("controller", "left");

    const { camera } = useThree();

    const currentPos = useRef(new THREE.Vector3(offset.x, offset.y, offset.z));
    const orbitAngle = useRef(Math.atan2(offset.x, offset.z));
    const radius = useRef(Math.sqrt(offset.x * offset.x + offset.z * offset.z) || 1e-6);

    const isDragging = useRef(false);
    const dragPlane = useRef(new THREE.Plane());
    const dragOffset = useRef(new THREE.Vector3());
    const dragIntersection = useRef(new THREE.Vector3());

    const rotation = useRef(new THREE.Euler(0, 0, 0));
    const isRotating = useRef(false);
    const isShiftPressed = useRef(false);
    const startRotation = useRef({ x: 0, y: 0 });
    const startAngles = useRef({ yaw: 0, pitch: 0 });

    const followEnabled = useRef(true);
    const originAnchor = useRef(new THREE.Vector3());

    const lastRightSqueeze = useRef(false);

    const ROTATION_SPEED = 4.0;
    const ZOOM_SPEED = 10;
    const DEADZONE = 0.65;

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
        const keys = getSpatialStorageKeys(storageKey);
        writeStoredJson(keys.offset, {
            x: currentPos.current.x,
            y: currentPos.current.y,
            z: currentPos.current.z,
        });
    };

    const saveRotation = () => {
        const keys = getSpatialStorageKeys(storageKey);
        writeStoredJson(keys.rotation, {
            x: rotation.current.x,
            y: rotation.current.y,
        });
    };

    const recomputeOrbitFrom = (v: THREE.Vector3) => {
        const { x, z } = v;
        const r = Math.sqrt(x * x + z * z);
        if (r > 1e-6) radius.current = r;
        orbitAngle.current = Math.atan2(x, z);
    };

    useEffect(() => {
        const keys = getSpatialStorageKeys(storageKey);
        const savedOffset = readStoredJson<StoredVector3>(keys.offset);
        if (savedOffset.status === "value") {
            currentPos.current.set(
                savedOffset.value.x,
                savedOffset.value.y,
                savedOffset.value.z
            );
            recomputeOrbitFrom(currentPos.current);
        } else if (savedOffset.status === "missing") {
            currentPos.current.set(offset.x, offset.y, offset.z);
            recomputeOrbitFrom(currentPos.current);
        }

        const savedFollow = readStoredBoolean(keys.follow);
        if (savedFollow !== null) {
            followEnabled.current = savedFollow;
        }

        const savedAnchor = readStoredJson<StoredVector3>(keys.anchor);
        if (savedAnchor.status === "value") {
            originAnchor.current.set(
                savedAnchor.value.x,
                savedAnchor.value.y,
                savedAnchor.value.z
            );
        }
    }, [storageKey]);

    useEffect(() => {
        const handleReset = () => {
            const keys = getSpatialStorageKeys(storageKey);

            currentPos.current.set(offset.x, offset.y, offset.z);
            rotation.current.set(0, 0, 0);

            if (groupRef.current) groupRef.current.rotation.set(0, 0, 0);

            radius.current = Math.sqrt(offset.x * offset.x + offset.z * offset.z) || radius.current;
            orbitAngle.current = Math.atan2(offset.x, offset.z);

            followEnabled.current = true;
            originAnchor.current.set(0, 0, 0);

            writeStoredJson(keys.offset, offset);
            writeStoredJson(keys.rotation, { x: 0, y: 0 });
            writeStoredBoolean(keys.follow, true);
            removeStoredValue(keys.anchor);
        };

        const handleShift = (event: Event) => {
            const { detail } = event as CustomEvent<PressedInteractionDetail>;
            isShiftPressed.current = !!detail?.pressed;
        };

        const handleFollowToggle = () => {
            if (!originRef?.current || !groupRef.current) return;

            const keys = getSpatialStorageKeys(storageKey);
            followEnabled.current = !followEnabled.current;

            if (!followEnabled.current) {
                originAnchor.current.copy(originRef.current.position);
                writeStoredBoolean(keys.follow, false);
                writeStoredJson(keys.anchor, {
                    x: originAnchor.current.x,
                    y: originAnchor.current.y,
                    z: originAnchor.current.z,
                });
            } else {
                groupRef.current.getWorldPosition(tmpWorld.current);
                const originPos = originRef.current.position;

                const newOffset = tmpWorld.current.clone().sub(originPos);
                currentPos.current.copy(newOffset);
                recomputeOrbitFrom(newOffset);

                writeStoredBoolean(keys.follow, true);
                removeStoredValue(keys.anchor);
                saveOffset();
            }
        };

        window.addEventListener(INTERACTION_EVENTS.MENU_RESET, handleReset);
        window.addEventListener(INTERACTION_EVENTS.MENU_SHIFT, handleShift);
        window.addEventListener(INTERACTION_EVENTS.MENU_FOLLOW_TOGGLE, handleFollowToggle);

        return () => {
            window.removeEventListener(INTERACTION_EVENTS.MENU_RESET, handleReset);
            window.removeEventListener(INTERACTION_EVENTS.MENU_SHIFT, handleShift);
            window.removeEventListener(INTERACTION_EVENTS.MENU_FOLLOW_TOGGLE, handleFollowToggle);
        };
    }, [offset, originRef, storageKey]);

    useEffect(() => {
        const keys = getSpatialStorageKeys(storageKey);
        const savedRotation = readStoredJson<StoredRotation>(keys.rotation);
        if (savedRotation.status === "value" && groupRef.current) {
            rotation.current.x = savedRotation.value.x;
            rotation.current.y = savedRotation.value.y;
            groupRef.current.rotation.set(savedRotation.value.x, savedRotation.value.y, 0);
        } else if (savedRotation.status === "missing" || !groupRef.current) {
            rotation.current.set(0, 0, 0);
            groupRef.current?.rotation.set(0, 0, 0);
        }
    }, [storageKey]);

    const ctx: MoveAndRotationCtx = {
        originRef,
        offset,
        faceUser,

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
        handlePointerDown: (event: ThreeEvent<PointerEvent>) => handleVRPointerDown(ctx, event),
        handlePointerMove: (event: ThreeEvent<PointerEvent>) => handleVRPointerMove(ctx, event),
        handlePointerUp: (event: ThreeEvent<PointerEvent>) => handleVRPointerUp(ctx, event),
    };
}
