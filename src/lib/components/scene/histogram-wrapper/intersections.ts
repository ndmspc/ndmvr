import * as THREE from "three";

// Checks whether an intersection belongs to an overlay that should not block events.
export function isPassThroughIntersection(intersection: THREE.Intersection | undefined): boolean {
    return Boolean(intersection?.object?.userData?.ndmvrPassThroughPointerEvents);
}

// Finds the first real blocking hit, ignoring passthrough overlays.
export function getFirstBlockingIntersection(intersections: THREE.Intersection[] | undefined) {
    return intersections?.find((intersection) => {
        return !isPassThroughIntersection(intersection);
    });
}

// Checks whether a given object is still the active blocking hit target.
export function hasBlockingIntersectionForObject(
    intersections: THREE.Intersection[] | undefined,
    object: THREE.Object3D
): boolean {
    return Boolean(
        intersections?.some((intersection) => {
            return !isPassThroughIntersection(intersection) && intersection.object === object;
        })
    );
}
