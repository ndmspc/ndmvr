import * as THREE from "three";
import { Sky } from "@react-three/drei";

import Raycaster from "./Raycaster.jsx";
import NestedHistogramWrapper from "./NestedHistogramWrapper";
import BinInfo from "./VRUI/BinInfo.jsx";

export default function Scene() {
  return (
    <>
      <Raycaster />
      <NestedHistogramWrapper id="nh" />

      <Sky />
      <fog attach="fog" args={["#997D31", 5, 60]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[0, 5, 5]} intensity={1} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="lightgray" />
      </mesh>

      <group position={[0, 1.4, -2]}>
        <BinInfo />
      </group>

      <primitive object={new THREE.GridHelper(100, 100)} />
      <primitive object={new THREE.AxesHelper(5)} />
    </>
  );
}
