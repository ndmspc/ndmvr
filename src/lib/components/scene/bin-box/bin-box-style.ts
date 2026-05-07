import * as THREE from "three";

// Disables raycasting for visual-only overlay meshes.
export function disableRaycast() {
    return null;
}

// Marks overlay objects that should not block histogram pointer events.
export const passThroughPointerEventUserData = {
    ndmvrPassThroughPointerEvents: true,
};

// Lightens the box fill color so it stays readable against the outline.
export function getLighterColor(color: THREE.ColorRepresentation): THREE.Color {
    return new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.4);
}

// Keeps a numeric value inside the given min/max range.
export function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}
