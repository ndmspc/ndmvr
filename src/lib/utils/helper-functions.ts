import { Vector3 } from "three";

export function getPads(str: string): string[] {
    if (str === "simple") {
        return ["pad1"];
    }

    const match = str.match(/^grid(\d+)x(\d+)$/);
    if (!match) throw new Error("Invalid format");

    const n = parseInt(match[1], 10);
    const k = parseInt(match[2], 10);
    const total = n * k;

    return Array.from({ length: total }, (_, i) => `pad${i + 1}`);
}

export const vector3ToArray = (v?: Vector3): [number, number, number] => [
    v?.x ?? 0,
    v?.y ?? 0,
    v?.z ?? 0,
];
