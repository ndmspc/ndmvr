import { Vector3 } from "three";

export const vector3ToArray = (v?: Vector3): [number, number, number] => [
    v?.x ?? 0,
    v?.y ?? 0,
    v?.z ?? 0,
];
