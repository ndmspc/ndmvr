import * as THREE from "three";
import { Text } from "@react-three/drei"; 

export default function Scene() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[0, 5, 5]} intensity={1} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="lightgray" />
      </mesh>

      <primitive object={new THREE.GridHelper(100, 100)} />

      {/* <mesh position={[0, 1, -10]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="red" />
      </mesh> */}

      <primitive object={new THREE.AxesHelper(5)} />

      {/* <Text
        position={[5, 1.5, -10]}
        color="black"
        anchorX="center"
        anchorY="middle"
      >
        Drei Static Text
      </Text> */}

    </>
  );
}
