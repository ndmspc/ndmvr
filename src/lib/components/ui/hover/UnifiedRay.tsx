import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";

const _ray = new THREE.Ray();

export function getUnifiedRay(
    e: PointerEvent | ThreeEvent<PointerEvent>
): THREE.Ray | null {
    // R3F provides a ready-to-use world-space ray (mouse, touch, XR)
    if ("ray" in e && e.ray) {
        console.log("VR raycasting");
        _ray.origin.copy(e.ray.origin);
        _ray.direction.copy(e.ray.direction).normalize();
        return _ray;
    }
    // DOM PointerEvent without ray information is not supported here
    return null;
}
