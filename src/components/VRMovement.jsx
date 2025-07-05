import { useFrame, useThree } from "@react-three/fiber";
import { useXRInputSourceState } from "@react-three/xr";
import * as THREE from "three";

export default function VRMovement({ originRef, speed = 2 }) {
  const rightController = useXRInputSourceState("controller", "right");
  const leftController = useXRInputSourceState("controller", "left");
  const { camera } = useThree();

  const cameraDirection = new THREE.Vector3();

  useFrame((_, delta) => {
    if (!originRef.current || !rightController || !leftController) return;

    const leftThumbstick = leftController.gamepad["xr-standard-thumbstick"];
    const rightThumbstick = rightController.gamepad["xr-standard-thumbstick"];
    if (!rightThumbstick || !leftThumbstick) return;

    const inputX = rightThumbstick.xAxis ?? 0;
    const inputZ = rightThumbstick.yAxis ?? 0;
    const inputY = leftThumbstick.yAxis ?? 0;

    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();

    const strafeDirection = new THREE.Vector3()
      .crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0))
      .normalize();

    const moveVector = new THREE.Vector3();
    moveVector.addScaledVector(cameraDirection, -inputZ);
    moveVector.addScaledVector(strafeDirection, inputX);
    moveVector.normalize();

    originRef.current.position.addScaledVector(moveVector, speed * delta);
    originRef.current.position.y += -inputY * speed * delta;
  });

  return null;
}
