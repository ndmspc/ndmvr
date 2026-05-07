import * as THREE from "three";
import type { Vector3Like } from "./types";

// Converts supported vector-like values into a THREE.Vector3.
export function toVector3(value: Vector3Like, fallback: THREE.Vector3): THREE.Vector3 {
    if (value instanceof THREE.Vector3) {
        return value.clone();
    }

    if (Array.isArray(value) && value.length >= 3) {
        const [x, y, z] = value;
        if ([x, y, z].every((n) => typeof n === "number" && Number.isFinite(n))) {
            return new THREE.Vector3(x, y, z);
        }
    }

    if (
        value &&
        typeof value === "object" &&
        "x" in value &&
        "y" in value &&
        "z" in value &&
        typeof value.x === "number" &&
        typeof value.y === "number" &&
        typeof value.z === "number" &&
        Number.isFinite(value.x) &&
        Number.isFinite(value.y) &&
        Number.isFinite(value.z)
    ) {
        return new THREE.Vector3(value.x, value.y, value.z);
    }

    return fallback.clone();
}

// Converts a vector-like value into a positive scale vector.
export function toPositiveVector3(value: Vector3Like, fallback: THREE.Vector3): THREE.Vector3 {
    const v = toVector3(value, fallback);
    return new THREE.Vector3(
        Math.abs(v.x) || fallback.x,
        Math.abs(v.y) || fallback.y,
        Math.abs(v.z) || fallback.z
    );
}
