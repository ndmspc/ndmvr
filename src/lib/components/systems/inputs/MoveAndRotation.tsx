import { use, useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useUIInteraction } from "../../ui/interactions/useUIInteraction";

interface UseMoveAndRotationOptions {
    originRef: React.RefObject<THREE.Group> | null;
    offset?: { x: number; y: number; z: number };
    smoothFollow?: boolean;
    lerpFactor?: number;
}

export function useMoveAndRotation({
    originRef,
    offset = { x: 0, y: 1.2, z: -4 },
    smoothFollow = true,
    lerpFactor = 0.25,
}: UseMoveAndRotationOptions) {
    const groupRef = useRef(null);

    const currentPos = useRef(new THREE.Vector3(offset.x, offset.y, offset.z));

    const isDragging = useRef(false);
    const dragPlane = useRef(new THREE.Plane());
    const dragOffset = useRef(new THREE.Vector3());
    const dragIntersection = useRef(new THREE.Vector3());

    const rotation = useRef(new THREE.Euler(0, 0, 0));
    const isRotating = useRef(false);
    const isShiftPressed = useRef(false);

    const startRotation = useRef({ x: 0, y: 0 });
    const startAngles = useRef({ yaw: 0, pitch: 0 });

    const lastClickTime = useRef(0);

    const LIMITS = {
        xMin: -4,
        xMax: 4,
        yMin: -1,
        yMax: 4,
        zMin: -6,
        zMax: -3,
    };

    useEffect(() => {
        const saved = sessionStorage.getItem("menuOffset");
        if (saved) {
            try {
                const obj = JSON.parse(saved);
                currentPos.current.set(obj.x, obj.y, obj.z);
            } catch {
                /* empty */
            }
        }
    }, []);

    useEffect(() => {
        const handleReset = () => {
            currentPos.current.set(offset.x, offset.y, offset.z);

            rotation.current.set(0, 0, 0);

            if (groupRef.current) {
                groupRef.current.rotation.set(0, 0, 0);
            }

            sessionStorage.setItem("menuOffset", JSON.stringify(offset));
            sessionStorage.setItem("menuRotation", JSON.stringify({ x: 0, y: 0 }));
        };

        const handleShift = (e) => {
            console.log("SHIFT FROM EVENT:", e.detail);
            const pressed = !!e.detail?.pressed;
            isShiftPressed.current = pressed;
        };

        window.addEventListener("ndmvr-menu-reset", handleReset);
        window.addEventListener("ndmvr-menu-shift", handleShift);

        return () => {
            window.removeEventListener("ndmvr-menu-reset", handleReset);
            window.removeEventListener("ndmvr-menu-shift", handleShift);
        };
    }, [offset]);

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

    useFrame(() => {
        if (!originRef?.current || !groupRef.current) return;

        const o = originRef.current.position;
        const target = new THREE.Vector3(
            o.x + currentPos.current.x,
            o.y + currentPos.current.y,
            o.z + currentPos.current.z
        );

        if (smoothFollow) {
            groupRef.current.position.lerp(target, lerpFactor);
        } else {
            groupRef.current.position.copy(target);
        }
    });

    const onDragStart = (e) => {
        if (!groupRef.current || !e.ray) return;

        if (useUIInteraction.getState().isInteracting) return;
        isDragging.current = true;

        e.target.setPointerCapture?.(e.pointerId);

        const worldPos = groupRef.current.getWorldPosition(new THREE.Vector3());
        const normal = e.ray.direction.clone().negate().normalize();

        dragPlane.current.setFromNormalAndCoplanarPoint(normal, worldPos);

        if (e.ray.intersectPlane(dragPlane.current, dragIntersection.current)) {
            dragOffset.current.copy(dragIntersection.current).sub(worldPos);
        }
    };

    const onDragMove = (e) => {
        if (!isDragging.current) return;
        if (!e.ray?.intersectPlane(dragPlane.current, dragIntersection.current)) return;

        const newWorldPos = dragIntersection.current.sub(dragOffset.current);

        const origin = originRef?.current?.position ?? new THREE.Vector3();
        const desired = newWorldPos.clone().sub(origin);

        desired.x = THREE.MathUtils.clamp(desired.x, LIMITS.xMin, LIMITS.xMax);
        desired.y = THREE.MathUtils.clamp(desired.y, LIMITS.yMin, LIMITS.yMax);
        desired.z = THREE.MathUtils.clamp(desired.z, LIMITS.zMin, LIMITS.zMax);

        currentPos.current.copy(desired);
    };

    const onDragEnd = (e) => {
        if (isDragging.current) {
            e.target.releasePointerCapture?.(e.pointerId);
        }

        isDragging.current = false;

        sessionStorage.setItem(
            "menuOffset",
            JSON.stringify({
                x: currentPos.current.x,
                y: currentPos.current.y,
                z: currentPos.current.z,
            })
        );
    };

    const onRotateStart = (e) => {
        if (!groupRef.current || !e.ray) return;

        isRotating.current = true;
        e.target.setPointerCapture?.(e.pointerId);

        const dir = e.ray.direction.clone().normalize();

        const horizLen = Math.sqrt(dir.x * dir.x + dir.z * dir.z) || 1e-6;
        const yaw = Math.atan2(dir.x, dir.z);
        const pitch = Math.atan2(dir.y, horizLen);

        startAngles.current.yaw = yaw;
        startAngles.current.pitch = pitch;
        startRotation.current.x = rotation.current.x;
        startRotation.current.y = rotation.current.y;
    };

    const onRotateMove = (e) => {
        if (!isRotating.current) return;
        if (!e.ray || !groupRef.current) return;

        const dir = e.ray.direction.clone().normalize();

        const horizLen = Math.sqrt(dir.x * dir.x + dir.z * dir.z) || 1e-6;
        const yaw = Math.atan2(dir.x, dir.z);
        const pitch = Math.atan2(dir.y, horizLen);

        const dYaw = yaw - startAngles.current.yaw;
        const dPitch = pitch - startAngles.current.pitch;

        const ySpeed = 0.7;
        const xSpeed = 1;

        const targetY = startRotation.current.y + dYaw * ySpeed;
        const targetX = THREE.MathUtils.clamp(
            startRotation.current.x - dPitch * xSpeed,
            THREE.MathUtils.degToRad(-45),
            THREE.MathUtils.degToRad(45)
        );

        const SMOOTH = 0.25;

        rotation.current.y = THREE.MathUtils.lerp(rotation.current.y, targetY, SMOOTH);
        rotation.current.x = THREE.MathUtils.lerp(rotation.current.x, targetX, SMOOTH);

        groupRef.current.rotation.set(rotation.current.x, rotation.current.y, 0);
    };

    const onRotateEnd = (e) => {
        if (isRotating.current) {
            e?.target?.releasePointerCapture?.(e.pointerId);
        }

        isRotating.current = false;

        sessionStorage.setItem(
            "menuRotation",
            JSON.stringify({
                x: rotation.current.x,
                y: rotation.current.y,
            })
        );
    };

    const handlePointerDown = (e) => {
        lastClickTime.current = performance.now();

        if (isShiftPressed.current) {
            onRotateStart(e);
            return;
        }
        onDragStart(e);
    };

    const handlePointerMove = (e) => {
        if (isRotating.current) {
            if (!isShiftPressed.current) return;
            onRotateMove(e);
            return;
        }

        if (isDragging.current) {
            onDragMove(e);
        }
    };

    const handlePointerUp = (e) => {
        onDragEnd(e);
        onRotateEnd(e);
    };

    return {
        groupRef,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
    };
}
