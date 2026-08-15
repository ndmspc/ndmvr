import type { MoveAndRotationCtx } from "./types";

export function updateDesktopFrame(ctx: MoveAndRotationCtx, _delta: number) {
    const g = ctx.groupRef.current;
    if (!g) return;

    if (ctx.faceUser) {
        const cam = ctx.camera;

        const localOffset = ctx.tmpOffset.current.copy(ctx.currentPos.current);
        localOffset.applyQuaternion(cam.quaternion);

        const targetPos = ctx.tmpTarget.current.copy(cam.position).add(localOffset);

        g.position.copy(targetPos);
        g.quaternion.copy(cam.quaternion);
    } else {
        const baseOrigin = ctx.followEnabled.current
            ? (ctx.originRef?.current?.position ?? ctx.tmpWorld.current.set(0, 0, 0))
            : ctx.originAnchor.current;

        g.position.set(
            baseOrigin.x + ctx.currentPos.current.x,
            baseOrigin.y + ctx.currentPos.current.y,
            baseOrigin.z + ctx.currentPos.current.z
        );
    }
}
