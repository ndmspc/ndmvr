import * as THREE from "three";

type ConfigPad = {
    id: string;
    position?: { x: number; y: number; z: number };
    scale?: { x: number; y: number; z: number };
};

type HistogramConfig = {
    config?: {
        environment?: {
            shiftScale?: {
                x?: number;
                y?: number;
                z?: number;
            };
            histogramPads?: ConfigPad[];
        };
    };
};

export type ShiftScaleStep = {
    x: number;
    y: number;
    z: number;
};

export type PainterLimits = {
    position?: {
        x?: number;
        y?: number;
        z?: number;
    };
    scale?: {
        x?: number;
        y?: number;
        z?: number;
    };
};

// Reads the configured keyboard/controller step for moving or scaling the frame.
export function getShiftScaleStep(config: HistogramConfig): ShiftScaleStep {
    return {
        x: config.config?.environment?.shiftScale?.x ?? 10,
        y: config.config?.environment?.shiftScale?.y ?? 10,
        z: config.config?.environment?.shiftScale?.z ?? 10,
    };
}

// Writes the edited bounding box position and scale back into a histogram pad config.
export function applyHistogramPadBounds(
    config: HistogramConfig,
    id: string,
    position: THREE.Vector3,
    scale: THREE.Vector3
): boolean {
    const pad = config.config?.environment?.histogramPads?.find((p) => p.id === id);
    if (!pad) return false;

    pad.position = { x: position.x, y: position.y, z: position.z };
    pad.scale = { x: scale.x, y: scale.y, z: scale.z };

    return true;
}

// Clones current frame values before storing them in React state.
export function clonePainterLimits(position: THREE.Vector3, scale: THREE.Vector3): PainterLimits {
    return {
        position: position.clone(),
        scale: scale.clone(),
    };
}

// Converts painter limits into a safe BoundingFrameBox position.
export function getBoundingFramePosition(limits: PainterLimits): THREE.Vector3 {
    return new THREE.Vector3(
        limits.position?.x ?? 0,
        limits.position?.y ?? 0,
        limits.position?.z ?? 0
    );
}

// Converts painter limits into a safe BoundingFrameBox scale.
export function getBoundingFrameScale(limits: PainterLimits): THREE.Vector3 {
    return new THREE.Vector3(limits.scale?.x ?? 2, limits.scale?.y ?? 2, limits.scale?.z ?? 2);
}
