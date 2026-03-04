import { useMemo } from "react";
import { Sky } from "@react-three/drei";
import * as THREE from "three";

export default function SceneDecorations() {
    const grid = useMemo(() => new THREE.GridHelper(100, 100), []);
    const axes = useMemo(() => new THREE.AxesHelper(5), []);

    return (
        <>
            <Sky />
            <ambientLight intensity={0.4} />
            <directionalLight position={[0, 5, 5]} intensity={1} />

            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color="lightgray" />
            </mesh>

            <primitive object={grid} />
            <primitive object={axes} />
        </>
    );
}
