import { useRef, useState, useEffect, useMemo } from "react";
import { useThree, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { getUnifiedRay } from "../../interactions/pointer/getUnifiedRay";
import { INTERACTION_EVENTS } from "../../interactions/events";
import type { PressedInteractionDetail } from "../../interactions/events";
import { useUIInteraction } from "../../stores/interaction/uiInteraction";

type Axis = "X" | "Y" | "Z";

type Edge = {
    axis: Axis;
    sign: 1 | -1;
};

type Corner = {
    x: 1 | -1;
    y: 1 | -1;
    z: 1 | -1;
};

interface BoundingFrameBoxProps {
    position: THREE.Vector3 | { x: number; y: number; z: number } | [number, number, number];
    scale: THREE.Vector3 | { x: number; y: number; z: number } | [number, number, number];
    shiftScaleStep?: { x: number; y: number; z: number };
    onChange?: (position: THREE.Vector3, scale: THREE.Vector3) => void;
    onDragEnd?: (position: THREE.Vector3, scale: THREE.Vector3) => void;
}

interface EdgeInfo {
    type: "edge";
    edge: Edge;
}

interface CornerInfo {
    type: "corner";
    corner: Corner;
}

interface DragContext {
    type: "edge" | "corner";
    axes: Axis[];
    lockedAxis?: Axis;
    startScale: THREE.Vector3;
    startPosition: THREE.Vector3;
    startPoint: THREE.Vector3;
}

// Raycaster tolerance for detecting thin objects (lines, small meshes)
const HOVER_THRESHOLD = 0.05;

// Default edge line thickness (world units)
const NORMAL_LINE_WIDTH = 0.1;

// Edge thickness when hovered, used for visual feedback
const HOVER_LINE_WIDTH = 0.15;

function getAxisVector(axis: Axis): THREE.Vector3 {
    if (axis === "X") return new THREE.Vector3(1, 0, 0);
    if (axis === "Y") return new THREE.Vector3(0, 1, 0);
    return new THREE.Vector3(0, 0, 1);
}

function getLockedDragAxis(camera: THREE.Camera, axes: Axis[]): Axis {
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);

    return axes.reduce((bestAxis, axis) => {
        const bestAlignment = Math.abs(cameraDirection.dot(getAxisVector(bestAxis)));
        const currentAlignment = Math.abs(cameraDirection.dot(getAxisVector(axis)));

        // Prefer the axis that is less aligned with the camera direction,
        // because it is more readable and stable on screen during dragging.
        return currentAlignment < bestAlignment ? axis : bestAxis;
    });
}

function toVector3(
    value: THREE.Vector3 | { x: number; y: number; z: number } | [number, number, number],
    fallback: THREE.Vector3
): THREE.Vector3 {
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

export default function BoundingFrameBox({
    position,
    scale,
    shiftScaleStep,
    onChange,
    onDragEnd,
}: BoundingFrameBoxProps) {
    const { camera } = useThree();
    const groupRef = useRef<THREE.Group>(null);

    const normalizedScale = useMemo(() => toVector3(scale, new THREE.Vector3(2, 2, 2)), [scale]);
    const normalizedPosition = useMemo(
        () => toVector3(position, new THREE.Vector3(0, normalizedScale.y / 2, 0)),
        [position, normalizedScale.y]
    );

    const edges = useRef<Map<Line2, EdgeInfo>>(new Map());
    const corners = useRef<Map<THREE.Mesh, CornerInfo>>(new Map());
    const raycaster = useRef(new THREE.Raycaster());

    const [hovered, setHovered] = useState<THREE.Object3D | null>(null);
    const setInteracting = useUIInteraction((state) => state.setInteracting);
    const [interactionState, setInteractionState] = useState<"idle" | "drag">("idle");

    const lastScaleRef = useRef<THREE.Vector3>(normalizedScale.clone());
    const lastPositionRef = useRef<THREE.Vector3>(normalizedPosition.clone());

    const dragRef = useRef<DragContext | null>(null);
    const dragPlaneRef = useRef<THREE.Plane | null>(null);
    const lastDragTimeRef = useRef<number>(0);

    const [snapPressed, setSnapPressed] = useState(false);


    const SCALE_STEP = shiftScaleStep?.x ? shiftScaleStep.x : 10; // Default snap step if not provided in config
    const SCALE_STEP_X = shiftScaleStep?.x ? shiftScaleStep.x : SCALE_STEP;
    const SCALE_STEP_Y = shiftScaleStep?.y ? shiftScaleStep.y : SCALE_STEP;
    const SCALE_STEP_Z = shiftScaleStep?.z ? shiftScaleStep.z : SCALE_STEP;

    /* ---------- HOVER ---------- */

    function handleHover(ray: THREE.Ray) {
        if (!camera) return;

        raycaster.current.camera = camera;
        raycaster.current.ray.copy(ray);

        const objects = [...edges.current.keys(), ...corners.current.keys()];

        const hits = raycaster.current.intersectObjects(objects);
        const hit = hits[0]?.object ?? null;

        edges.current.forEach((_, line) => {
            const mat = line.material as LineMaterial;
            const active = line === hit;
            mat.linewidth = active ? HOVER_LINE_WIDTH : NORMAL_LINE_WIDTH;
            mat.color.set(active ? 0xffff00 : 0xffffff);
        });

        corners.current.forEach((_, mesh) => {
            const mat = mesh.material as THREE.MeshBasicMaterial;
            mat.color.set(mesh === hit ? 0xffff00 : 0x000000);
        });

        document.body.style.cursor = hit ? "pointer" : "default";
        setHovered(hit);
    }

    function onPointerMove(e: ThreeEvent<PointerEvent>) {
        const ray = getUnifiedRay(e);
        if (!ray) return;

        handleHover(ray);

        if (interactionState !== "drag" || !dragRef.current || !groupRef.current) return;

        // Throttle drag updates to ~60 FPS
        const now = Date.now();
        if (now - lastDragTimeRef.current < 16) return;
        lastDragTimeRef.current = now;

        handleDrag(ray);
    }

    function onPointerLeave() {
        if (interactionState === "idle") {
            setHovered(null);
            document.body.style.cursor = "default";
        }
        setInteracting(false);
    }

    /* ---------- DRAG ---------- */

    function handleDrag(ray: THREE.Ray) {
        if (!dragPlaneRef.current || !dragRef.current || !groupRef.current) return;

        const intersection = new THREE.Vector3();
        if (!ray.intersectPlane(dragPlaneRef.current, intersection)) return;

        const dragCtx = dragRef.current;

        const center = dragCtx.startPosition.clone();
        const local = intersection.clone().sub(center);

        let newScale = dragCtx.startScale.clone();

        /* ---------- CORNER ---------- */
        if (dragCtx.type === "corner") {
            const halfX = Math.abs(local.x);
            const halfZ = Math.abs(local.z);

            const height = Math.max(0.2, intersection.y);

            newScale.set(Math.max(0.2, halfX * 2), height, Math.max(0.2, halfZ * 2));
        }

        /* ---------- EDGE ---------- */
        if (dragCtx.type === "edge") {
            const local = intersection.clone().sub(dragCtx.startPosition);
            const lockedAxis = dragCtx.lockedAxis ?? dragCtx.axes[0];

            if (lockedAxis === "Y") {
                newScale.y = Math.max(0.1, intersection.y);
            } else {
                const idx = lockedAxis === "X" ? 0 : 2;
                const halfSize = Math.abs(local.getComponent(idx));
                newScale.setComponent(idx, Math.max(0.2, halfSize * 2));
            }
        }

        if (snapPressed) {
            console.log("Snapping to grid");
            newScale.set(
                Math.round(newScale.x / SCALE_STEP_X) * SCALE_STEP_X,
                Math.round(newScale.y / SCALE_STEP_Y) * SCALE_STEP_Y,
                Math.round(newScale.z / SCALE_STEP_Z) * SCALE_STEP_Z
            );
        }

        // Enforce minimum scale to prevent inversion or disappearing
        if( newScale.x < 2) newScale.x = 2;
        if( newScale.y < 2) newScale.y = 2;
        if( newScale.z < 2) newScale.z = 2;

        // Store last scale for drag end callback
        lastScaleRef.current = newScale.clone();

        if (groupRef.current) {
            const pos = groupRef.current.position.clone();
            pos.y = newScale.y / 2;
            groupRef.current.position.copy(pos);
        }

        lastPositionRef.current = groupRef.current.position.clone();
        const newPosition = groupRef.current.position.clone();
        // Notify parent about live scale change
        onChange?.(newPosition, newScale);
    }

    function onPointerDown(e: ThreeEvent<PointerEvent>) {
        if (!hovered || !groupRef.current) return;

        const group = groupRef.current;

        let dragType: "edge" | "corner" = "edge";
        let axes: Axis[] = [];
        let lockedAxis: Axis | undefined;

        if (edges.current.has(hovered as Line2)) {
            const edgeInfo = edges.current.get(hovered as Line2)!;
            const edge = edgeInfo.edge;

            if (edge.axis === "X") axes = ["X", "Z"];
            if (edge.axis === "Y") axes = ["Y", "X"];
            if (edge.axis === "Z") axes = ["Z", "Y"];
            lockedAxis = getLockedDragAxis(camera, axes);
        }

        if (corners.current.has(hovered as THREE.Mesh)) {
            dragType = "corner";
            axes = ["X", "Y", "Z"];
        }

        const planeNormal = new THREE.Vector3();
        camera.getWorldDirection(planeNormal);

        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, e.point);

        dragPlaneRef.current = plane;

        dragRef.current = {
            type: dragType,
            axes,
            lockedAxis,
            startScale: normalizedScale.clone(),
            startPosition: group.position.clone(),
            startPoint: e.point.clone(),
        };

        setInteractionState("drag");
        setInteracting(true);
        document.body.style.cursor = "grabbing";
    }

    function onPointerUp() {
        if (interactionState === "drag" && dragRef.current) {
            onDragEnd?.(lastPositionRef.current.clone(), lastScaleRef.current.clone());
        }

        setInteractionState("idle");
        setInteracting(false);
        dragRef.current = null;
        dragPlaneRef.current = null;
        document.body.style.cursor = "default";
    }

    /* ---------- GLOBAL EVENTS ---------- */

    useEffect(() => {
        const handleGlobalPointerUp = () => {
            if (interactionState === "drag") {
                onPointerUp();
            }
        };

        const handleGlobalPointerMove = (e: PointerEvent) => {
            if (interactionState !== "drag" || !dragRef.current) return;

            const raycaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2();

            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

            if (camera) {
                raycaster.setFromCamera(mouse, camera);
                handleDrag(raycaster.ray);
            }
        };

        window.addEventListener("pointerup", handleGlobalPointerUp);
        window.addEventListener("pointermove", handleGlobalPointerMove);

        return () => {
            window.removeEventListener("pointerup", handleGlobalPointerUp);
            window.removeEventListener("pointermove", handleGlobalPointerMove);
        };
    }, [interactionState, camera]);

    /* ---------- RAYCASTER SETUP ---------- */

    useEffect(() => {
        raycaster.current.params.Line.threshold = HOVER_THRESHOLD;
        raycaster.current.params.Mesh.threshold = HOVER_THRESHOLD;
        raycaster.current.params.Line2 = { threshold: HOVER_THRESHOLD };
        raycaster.current.camera = camera;
    }, [camera]);

    /* ---------- GEOMETRY BUILD ---------- */

    useEffect(() => {
        if (!groupRef.current) return;

        const group = groupRef.current;
        group.clear();
        edges.current.clear();
        corners.current.clear();

        const px = normalizedScale.x / 2;
        const py = normalizedScale.y / 2;
        const pz = normalizedScale.z / 2;

        const vertices = [
            [-px, -py, -pz],
            [px, -py, -pz],
            [px, py, -pz],
            [-px, py, -pz],
            [-px, -py, pz],
            [px, -py, pz],
            [px, py, pz],
            [-px, py, pz],
        ];

        const edgeDefs: { indices: [number, number]; edge: Edge }[] = [
            { indices: [4, 5], edge: { axis: "Z", sign: +1 } },
            { indices: [6, 7], edge: { axis: "Z", sign: +1 } },
            { indices: [0, 1], edge: { axis: "Z", sign: -1 } },
            { indices: [2, 3], edge: { axis: "Z", sign: -1 } },

            { indices: [2, 6], edge: { axis: "Y", sign: +1 } },
            { indices: [3, 7], edge: { axis: "Y", sign: +1 } },
            { indices: [0, 4], edge: { axis: "Y", sign: -1 } },
            { indices: [1, 5], edge: { axis: "Y", sign: -1 } },

            { indices: [1, 2], edge: { axis: "X", sign: +1 } },
            { indices: [5, 6], edge: { axis: "X", sign: +1 } },
            { indices: [0, 3], edge: { axis: "X", sign: -1 } },
            { indices: [4, 7], edge: { axis: "X", sign: -1 } },
        ];

        edgeDefs.forEach(({ indices, edge }) => {
            const geometry = new LineGeometry();
            geometry.setPositions([...vertices[indices[0]], ...vertices[indices[1]]]);

            const material = new LineMaterial({
                color: 0xffffff,
                linewidth: NORMAL_LINE_WIDTH,
                worldUnits: true,
            });

            const line = new Line2(geometry, material);
            line.computeLineDistances();

            group.add(line);
            edges.current.set(line, { type: "edge", edge });
        });

        vertices.forEach(([x, y, z]) => {
            const minScale = Math.min(normalizedScale.x, normalizedScale.y, normalizedScale.z);
            const sphereSize = Math.max(0.01, minScale * 0.025);

            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(sphereSize, 8, 8),
                new THREE.MeshBasicMaterial({ color: 0x000000 })
            );

            mesh.position.set(x, y, z);
            group.add(mesh);

            corners.current.set(mesh, {
                type: "corner",
                corner: {
                    x: x > 0 ? 1 : -1,
                    y: y > 0 ? 1 : -1,
                    z: z > 0 ? 1 : -1,
                },
            });
        });

        group.position.set(normalizedPosition.x, normalizedPosition.y, normalizedPosition.z);
    }, [normalizedPosition, normalizedScale]);


    useEffect(() => {
        const handler = (event: Event) => {
            const { detail } = event as CustomEvent<PressedInteractionDetail>;
            setSnapPressed(!!detail?.pressed);
        };

        window.addEventListener(INTERACTION_EVENTS.SHIFT_STEP_SCALE, handler);
        return () =>
            window.removeEventListener(INTERACTION_EVENTS.SHIFT_STEP_SCALE, handler);
    }, []);

    return (
        <group
            ref={groupRef}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            onPointerDown={onPointerDown}
        />
    );
}
