import { useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { useXRInputSourceState } from "@react-three/xr";
import * as THREE from "three";

export default function PointerRod({
    originRef,
    handedness = "right",
    length = 0.01,
    thickness = 0.01,
    color = "red",
}) {
    const rodRef = useRef();
    const { gl, camera } = useThree();
    const state = useXRInputSourceState("controller", handedness);

    useFrame(() => {
        const frame = gl.xr.getFrame();
        const refSpace = gl.xr.getReferenceSpace();
        const rod = rodRef.current;
        if (!frame || !state?.inputSource || !rod) return;

        const pose = frame.getPose(state.inputSource.targetRaySpace, refSpace);
        if (!pose) return;

        const localPos = new THREE.Vector3(
            pose.transform.position.x,
            pose.transform.position.y,
            pose.transform.position.z
        );

        const camPos = new THREE.Vector3();
        camera.getWorldPosition(camPos);

        const pos = new THREE.Vector3(
            localPos.x + originRef.current.position.x,
            localPos.y + originRef.current.position.y,
            localPos.z + originRef.current.position.z
        );

        const q = new THREE.Quaternion(
            pose.transform.orientation.x,
            pose.transform.orientation.y,
            pose.transform.orientation.z,
            pose.transform.orientation.w
        );

        rod.quaternion.copy(q);
        rod.position.copy(pos);
    });

    if (!state?.inputSource) return null;

    return (
        <mesh ref={rodRef} frustumCulled={false}>
            <boxGeometry args={[thickness, thickness, length]}/>
            <meshBasicMaterial color={color}/>
        </mesh>
    );
}
