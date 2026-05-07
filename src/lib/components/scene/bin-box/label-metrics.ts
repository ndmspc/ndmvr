import * as THREE from "three";
import { clamp } from "./bin-box-style";

// Calculates one representative size from the 3D box dimensions.
function getCharacteristicSize(boxScale: THREE.Vector3): number {
    return Math.cbrt(
        Math.max(boxScale.x, 0.001) * Math.max(boxScale.y, 0.001) * Math.max(boxScale.z, 0.001)
    );
}

// Scales labels based on the bin box size.
export function getLabelSizeMultiplier(boxScale: THREE.Vector3): number {
    return clamp(0.28 + Math.sqrt(getCharacteristicSize(boxScale)) * 0.34, 0.28, 1.9);
}

// Scales labels based on camera distance so text remains readable.
export function getDistanceLabelSizeMultiplier(distance: number, boxScale: THREE.Vector3): number {
    const characteristicSize = getCharacteristicSize(boxScale);
    const referenceDistance = clamp(characteristicSize * 2.6, 1.6, 9);

    return clamp(distance / referenceDistance, 0.9, 2.4);
}

// Applies a multiplier to label width and height, leaving depth unchanged.
export function scaleLabelSize(
    scale: [number, number, number],
    multiplier: number
): [number, number, number] {
    return [scale[0] * multiplier, scale[1] * multiplier, scale[2]];
}
