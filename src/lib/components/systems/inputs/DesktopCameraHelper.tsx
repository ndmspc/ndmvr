import type { MoveAndRotationCtx } from "./MoveAndRotation";

export function updateDesktopFrame(ctx: MoveAndRotationCtx, _delta: number) {
    const g = ctx.groupRef.current;
    if (!g) return;

    const cam = ctx.camera;

    const localOffset = ctx.tmpOffset.current.copy(ctx.currentPos.current);
    localOffset.applyQuaternion(cam.quaternion);

    const targetPos = ctx.tmpTarget.current.copy(cam.position).add(localOffset);

    g.position.copy(targetPos);
    g.quaternion.copy(cam.quaternion);
}
