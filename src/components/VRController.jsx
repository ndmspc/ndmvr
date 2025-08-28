import { useFrame } from "@react-three/fiber";
import { useXRInputSourceState } from "@react-three/xr";
import * as THREE from "three";
import { useRef } from "react";

export default function VRController({ originRef, speed = 2, onToggleMenu }) {
  const rightController = useXRInputSourceState("controller", "right");
  const leftController = useXRInputSourceState("controller", "left");

  const lastButtonPressed = useRef(false);

  useFrame((_, delta) => {
    if (!originRef.current || !rightController || !leftController) return;

    const leftThumbstick = leftController.gamepad["xr-standard-thumbstick"];
    const rightThumbstick = rightController.gamepad["xr-standard-thumbstick"];
    if (!rightThumbstick || !leftThumbstick) return;

    const inputX = leftThumbstick.xAxis ?? 0;
    const inputZ = leftThumbstick.yAxis ?? 0;
    const inputY = rightThumbstick.yAxis ?? 0;

    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);

    const moveVector = new THREE.Vector3();
    moveVector.addScaledVector(forward, -inputZ);
    moveVector.addScaledVector(right, inputX);
    moveVector.normalize();

    originRef.current.position.addScaledVector(moveVector, speed * delta);
    originRef.current.position.y += -inputY * speed * delta;

    const menuButton = rightController.gamepad["b-button"]; 
    if (menuButton?.state === "pressed" && !lastButtonPressed.current) {
      onToggleMenu?.();
      lastButtonPressed.current = true;
    }
    if (menuButton?.state !== "pressed") {
      lastButtonPressed.current = false;
    }
  });

  return null;
}
