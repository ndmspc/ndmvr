import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { MoveAndRotationCtx, PointerCaptureTarget } from "./types";

function capturePointer(ctx: MoveAndRotationCtx, event: ThreeEvent<PointerEvent>) {
    const target = event.target as unknown as PointerCaptureTarget;
    target?.setPointerCapture?.(event.pointerId);
    ctx.capture.current = { target, pointerId: event.pointerId };
}

export function releaseSpatialPointer(capture: MoveAndRotationCtx["capture"]) {
    const current = capture.current;
    capture.current = null;
    if (current && current.target?.hasPointerCapture?.(current.pointerId) !== false) {
        current.target?.releasePointerCapture?.(current.pointerId);
    }
}

export function finishSpatialInteraction(
    ctx: Pick<
        MoveAndRotationCtx,
        "isDragging" | "isRotating" | "capture" | "saveOffset" | "saveRotation"
    >
) {
    const dragged = ctx.isDragging.current;
    const rotated = ctx.isRotating.current;
    if (!dragged && !rotated && !ctx.capture.current) return;
    ctx.isDragging.current = false;
    ctx.isRotating.current = false;
    releaseSpatialPointer(ctx.capture);
    if (dragged) ctx.saveOffset();
    if (rotated) ctx.saveRotation();
}

export function updateVRFrame(ctx: MoveAndRotationCtx, delta: number) {
    const g = ctx.groupRef.current;
    if (!g) return;
    const origin = ctx.getOrigin();
    if (!origin) return;

    const input = ctx.getSpatialInput();
    if (input.active) {
        const rawX = input.x;
        const rawY = input.y;

        const xVal = Math.abs(rawX) > ctx.DEADZONE ? rawX : 0;
        const yVal = Math.abs(rawY) > ctx.DEADZONE ? rawY : 0;

        if (xVal !== 0) {
            ctx.rotation.current.y += -xVal * ctx.ROTATION_SPEED * delta;
            g.rotation.set(ctx.rotation.current.x, ctx.rotation.current.y, 0);
        }

        if (yVal !== 0) {
            ctx.radius.current += yVal * ctx.ZOOM_SPEED * delta;

            const x = Math.sin(ctx.orbitAngle.current) * ctx.radius.current;
            const z = Math.cos(ctx.orbitAngle.current) * ctx.radius.current;

            ctx.currentPos.current.x = x;
            ctx.currentPos.current.z = z;
        }
    }

    if (!input.active && ctx.lastRightSqueeze.current) {
        ctx.saveOffset();
        ctx.saveRotation();
    }
    ctx.lastRightSqueeze.current = input.active;

    const baseOrigin = ctx.followEnabled.current ? origin.position : ctx.originAnchor.current;

    const target = ctx.tmpTarget.current.set(
        baseOrigin.x + ctx.currentPos.current.x,
        baseOrigin.y + ctx.currentPos.current.y,
        baseOrigin.z + ctx.currentPos.current.z
    );

    g.position.copy(target);
}

function onDragStart(ctx: MoveAndRotationCtx, e: ThreeEvent<PointerEvent>) {
    if (!ctx.session) return;
    if (!ctx.groupRef.current || !e.ray) return;
    if (!ctx.getSpatialInput().active) return;
    if (!ctx.getOrigin()) return;

    ctx.isDragging.current = true;
    capturePointer(ctx, e);

    ctx.groupRef.current.getWorldPosition(ctx.tmpWorld.current);
    const normal = e.ray.direction.clone().negate().normalize();
    ctx.dragPlane.current.setFromNormalAndCoplanarPoint(normal, ctx.tmpWorld.current);

    if (e.ray.intersectPlane(ctx.dragPlane.current, ctx.dragIntersection.current)) {
        ctx.dragOffset.current.copy(ctx.dragIntersection.current).sub(ctx.tmpWorld.current);
    }
}

function onDragMove(ctx: MoveAndRotationCtx, e: ThreeEvent<PointerEvent>) {
    if (!ctx.session) return;
    if (!ctx.isDragging.current) return;
    if (!ctx.getSpatialInput().active) {
        finishSpatialInteraction(ctx);
        return;
    }
    if (!e.ray?.intersectPlane(ctx.dragPlane.current, ctx.dragIntersection.current)) return;

    const newWorldPos = ctx.dragIntersection.current.sub(ctx.dragOffset.current);

    const origin = ctx.followEnabled.current ? ctx.getOrigin()?.position : ctx.originAnchor.current;
    if (!origin) return;

    const desired = newWorldPos.clone().sub(origin);

    ctx.currentPos.current.copy(desired);
    ctx.recomputeOrbitFrom(desired);
}

function onRotateStart(ctx: MoveAndRotationCtx, e: ThreeEvent<PointerEvent>) {
    if (!ctx.session) return;
    if (!ctx.groupRef.current || !e.ray) return;
    if (!ctx.getSpatialInput().active) return;

    ctx.isRotating.current = true;
    capturePointer(ctx, e);

    const dir = e.ray.direction.clone().normalize();

    const horizLen = Math.sqrt(dir.x * dir.x + dir.z * dir.z) || 1e-6;
    const yaw = Math.atan2(dir.x, dir.z);
    const pitch = Math.atan2(dir.y, horizLen);

    ctx.startAngles.current.yaw = yaw;
    ctx.startAngles.current.pitch = pitch;

    ctx.startRotation.current.x = ctx.rotation.current.x;
    ctx.startRotation.current.y = ctx.rotation.current.y;
}

function onRotateMove(ctx: MoveAndRotationCtx, e: ThreeEvent<PointerEvent>) {
    if (!ctx.session) return;
    if (!ctx.isRotating.current) return;

    if (!ctx.getSpatialInput().active) {
        finishSpatialInteraction(ctx);
        return;
    }

    if (!e.ray || !ctx.groupRef.current) return;

    const dir = e.ray.direction.clone().normalize();

    const horizLen = Math.sqrt(dir.x * dir.x + dir.z * dir.z) || 1e-6;
    const yaw = Math.atan2(dir.x, dir.z);
    const pitch = Math.atan2(dir.y, horizLen);

    const dYaw = yaw - ctx.startAngles.current.yaw;
    const dPitch = pitch - ctx.startAngles.current.pitch;

    const ySpeed = 0.7;
    const xSpeed = 1.0;

    const targetY = ctx.startRotation.current.y + dYaw * ySpeed;
    const targetX = THREE.MathUtils.clamp(
        ctx.startRotation.current.x - dPitch * xSpeed,
        THREE.MathUtils.degToRad(-45),
        THREE.MathUtils.degToRad(45)
    );

    ctx.rotation.current.y = targetY;
    ctx.rotation.current.x = targetX;

    ctx.groupRef.current.rotation.set(ctx.rotation.current.x, ctx.rotation.current.y, 0);
}

export function handleVRPointerDown(ctx: MoveAndRotationCtx, e: ThreeEvent<PointerEvent>) {
    if (!ctx.session) return;
    if (ctx.isDragging.current || ctx.isRotating.current) return;

    if (ctx.isShiftPressed.current) {
        onRotateStart(ctx, e);
        return;
    }
    onDragStart(ctx, e);
}

export function handleVRPointerMove(ctx: MoveAndRotationCtx, e: ThreeEvent<PointerEvent>) {
    if (!ctx.session) return;

    if (ctx.isRotating.current) return onRotateMove(ctx, e);
    if (ctx.isDragging.current) return onDragMove(ctx, e);
}

export function handleVRPointerUp(ctx: MoveAndRotationCtx, e?: ThreeEvent<PointerEvent>) {
    if (e && ctx.capture.current && e.pointerId !== ctx.capture.current.pointerId) return;
    finishSpatialInteraction(ctx);
}
