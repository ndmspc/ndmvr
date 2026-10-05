import type { MutableRefObject } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type * as THREE from "three";

export interface UseMoveAndRotationOptions {
    offset?: { x: number; y: number; z: number };
    faceUser?: boolean;
    storageKey?: string;
}

export type MoveAndRotationCtx = {
    getOrigin: () => THREE.Object3D | undefined;
    faceUser: boolean;

    session: XRSession | null;
    camera: THREE.Camera;

    getSpatialInput: () => { active: boolean; x: number; y: number };

    groupRef: MutableRefObject<THREE.Group | null>;

    currentPos: MutableRefObject<THREE.Vector3>;
    orbitAngle: MutableRefObject<number>;
    radius: MutableRefObject<number>;

    isDragging: MutableRefObject<boolean>;
    capture: MutableRefObject<{ target: PointerCaptureTarget; pointerId: number } | null>;
    dragPlane: MutableRefObject<THREE.Plane>;
    dragOffset: MutableRefObject<THREE.Vector3>;
    dragIntersection: MutableRefObject<THREE.Vector3>;

    rotation: MutableRefObject<THREE.Euler>;
    isRotating: MutableRefObject<boolean>;
    isShiftPressed: MutableRefObject<boolean>;
    startRotation: MutableRefObject<{ x: number; y: number }>;
    startAngles: MutableRefObject<{ yaw: number; pitch: number }>;

    followEnabled: MutableRefObject<boolean>;
    originAnchor: MutableRefObject<THREE.Vector3>;

    lastRightSqueeze: MutableRefObject<boolean>;

    ROTATION_SPEED: number;
    ZOOM_SPEED: number;
    DEADZONE: number;

    tmpOffset: MutableRefObject<THREE.Vector3>;
    tmpTarget: MutableRefObject<THREE.Vector3>;
    tmpWorld: MutableRefObject<THREE.Vector3>;

    saveOffset: () => void;
    saveRotation: () => void;
    recomputeOrbitFrom: (v: THREE.Vector3) => void;
};

export type PointerCaptureTarget = {
    setPointerCapture?: (id: number) => void;
    releasePointerCapture?: (id: number) => void;
    hasPointerCapture?: (id: number) => boolean;
};

export interface MoveAndRotationResult {
    groupRef: MutableRefObject<THREE.Group | null>;
    handlePointerDown: (event: ThreeEvent<PointerEvent>) => void;
    handlePointerMove: (event: ThreeEvent<PointerEvent>) => void;
    handlePointerUp: (event: ThreeEvent<PointerEvent>) => void;
}
