import { useCallback, useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { useXRInputSourceState, useXR } from "@react-three/xr";
import * as THREE from "three";

export default function RaycasterBridge({
    rc,
    originRef,
    doubleClickMs = 300,
    handedness = "right"
}) {
    const { gl } = useThree();
    const controller = useXRInputSourceState("controller", handedness);

    const session = useXR(s => s.session);
    const refSpace = useXR(s => s.originReferenceSpace);

    const squeezeHeld = useRef(false);
    const handled = useRef(false);
    const lastClick = useRef(null);
    const pendingClick = useRef(null);

    const tmpPos = useRef(new THREE.Vector3(0, 0, 0));
    const tmpQ = useRef(new THREE.Quaternion());
    const tmpDir = useRef(new THREE.Vector3());

    const getPositionAndDirection = useCallback((pose) => {
        tmpPos.current.set(
            pose.transform.position.x,
            pose.transform.position.y,
            pose.transform.position.z
        );

        tmpQ.current.set(
            pose.transform.orientation.x,
            pose.transform.orientation.y,
            pose.transform.orientation.z,
            pose.transform.orientation.w
        );
        tmpDir.current.set(0, 0, -1).applyQuaternion(tmpQ.current).normalize();

        if (originRef?.current) {
            tmpPos.current.applyMatrix4(originRef.current.matrixWorld);
            tmpDir.current.transformDirection(originRef.current.matrixWorld);
        }

        return { pos: tmpPos.current, dir: tmpDir.current };
    }, [originRef]);

    useFrame(() => {
        handled.current = false;
        const frame = gl.xr.getFrame();
        if (!session || !frame || !refSpace) return;

        const inputSource = controller?.inputSource;
        const targetRaySpace = inputSource?.targetRaySpace;
        if (!targetRaySpace) return;
        const pose = frame.getPose(targetRaySpace, refSpace);
        if (!pose) return;

        const { pos, dir } = getPositionAndDirection(pose);

        rc.raycaster.ray.origin.copy(pos);
        rc.raycaster.ray.direction.copy(dir);

        const now = performance.now();

        if (pendingClick.current) {
            const click = pendingClick.current;
            pendingClick.current = null;

            if (lastClick.current && (click.t - lastClick.current.t) < doubleClickMs) {
                rc.raycaster.ray.origin.copy(click.origin);
                rc.raycaster.ray.direction.copy(click.dir);
                rc.raycaster._triggerSource = click.modifier ? "shiftmousedbclick" : "mousedbclick";
                rc.handleRaycast?.();
                handled.current = true;

                lastClick.current = null;
                return;
            } else {
                lastClick.current = click;
            }
        }

        if (lastClick.current && (now - lastClick.current.t) >= doubleClickMs) {
            const click = lastClick.current;
            lastClick.current = null;

            rc.raycaster.ray.origin.copy(click.origin);
            rc.raycaster.ray.direction.copy(click.dir);
            rc.raycaster._triggerSource = click.modifier ? "shiftmouseclick" : "mouseclick";
            rc.handleRaycast?.();
            handled.current = true;

        }

        if (!handled.current) {
            rc.raycaster._triggerSource = "mousemove";
            rc.handleRaycast?.();
        }

    });


    useEffect(() => {
        if (!session) return;

        const onSqueezeStart = (e) => {
            if (e.inputSource?.handedness && e.inputSource.handedness !== handedness) return;
            squeezeHeld.current = true;
        };

        const onSqueezeEnd = (e) => {
            if (e.inputSource?.handedness && e.inputSource.handedness !== handedness) return;
            squeezeHeld.current = false;
        };

        const onSelectEnd = (e) => {
            if (e.inputSource?.handedness && e.inputSource.handedness !== handedness) return;
            if (!refSpace || !e.frame || !e.inputSource) return;


            const trs = e.inputSource?.targetRaySpace;
            if (!trs) return;
            const pose = e.frame.getPose(trs, refSpace);
            if (!pose) return;

            const modifier = !!squeezeHeld.current;

            const { pos, dir } = getPositionAndDirection(pose);
            pendingClick.current = {
                t: performance.now(),
                modifier,
                origin: pos.clone(),
                dir: dir.clone(),
            };
        };
        session.addEventListener("squeezestart", onSqueezeStart);
        session.addEventListener("squeezeend", onSqueezeEnd);
        session.addEventListener("selectend", onSelectEnd);

        return () => {
            session.removeEventListener("squeezestart", onSqueezeStart);
            session.removeEventListener("squeezeend", onSqueezeEnd);
            session.removeEventListener("selectend", onSelectEnd);
        };
    }, [session, refSpace, handedness, getPositionAndDirection]);

    return null;
}
