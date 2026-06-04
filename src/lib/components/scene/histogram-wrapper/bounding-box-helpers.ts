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

export type ObjectBounds = {
    center: THREE.Vector3;
    size: THREE.Vector3;
};

const MIN_BOUNDING_FRAME_SIZE = 2;

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

// Reads object bounds from a rendered Three.js hierarchy.
export function getObjectBounds(object: THREE.Object3D | null | undefined): ObjectBounds | null {
    if (!object) return null;

    object.updateWorldMatrix(true, true);

    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) return null;

    return {
        size: box.getSize(new THREE.Vector3()),
        center: box.getCenter(new THREE.Vector3()),
    };
}

// Derives frame limits from any rendered Three.js object hierarchy.
export function getObjectPainterLimits(object: THREE.Object3D | null | undefined): PainterLimits | null {
    const bounds = getObjectBounds(object);
    if (!bounds) return null;

    const size = bounds.size.clone();

    size.set(
        Math.max(size.x, MIN_BOUNDING_FRAME_SIZE),
        Math.max(size.y, MIN_BOUNDING_FRAME_SIZE),
        Math.max(size.z, MIN_BOUNDING_FRAME_SIZE)
    );

    return clonePainterLimits(bounds.center, size);
}

export function getHistogramPadBounds(config: HistogramConfig | null | undefined, id: string): PainterLimits | null {
    const pad = config?.config?.environment?.histogramPads?.find((p) => p.id === id);
    if (!pad?.position || !pad?.scale) return null;

    return {
        position: { ...pad.position },
        scale: { ...pad.scale },
    };
}

export function applyObjectBoundsTransform(
    object: THREE.Object3D | null | undefined,
    baseBounds: ObjectBounds | null | undefined,
    position: THREE.Vector3,
    scale: THREE.Vector3
) {
    if (!object || !baseBounds) return;

    const baseSize = new THREE.Vector3(
        Math.max(baseBounds.size.x, Number.EPSILON),
        Math.max(baseBounds.size.y, Number.EPSILON),
        Math.max(baseBounds.size.z, Number.EPSILON)
    );

    const nextScale = new THREE.Vector3(
        scale.x / baseSize.x,
        scale.y / baseSize.y,
        scale.z / baseSize.z
    );

    object.scale.copy(nextScale);

    const scaledCenterOffset = baseBounds.center.clone().multiply(nextScale);
    object.position.copy(position.clone().sub(scaledCenterOffset));
    object.updateMatrixWorld(true);
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
