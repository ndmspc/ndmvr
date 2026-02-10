import { useRef, useState, useEffect } from "react";
import { useThree, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { getUnifiedRay } from "../ui/hover/UnifiedRay";
import { useUIInteraction } from "../ui/interactions/useUIInteraction";
import { last } from "rxjs";

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
    position: THREE.Vector3;
    scale: THREE.Vector3;
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
    signs: Partial<Record<Axis, 1 | -1>>;
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

export default function BoundingFrameBox({
    position,
    scale,
    onChange,
    onDragEnd,
}: BoundingFrameBoxProps) {

    const { camera } = useThree();
    const groupRef = useRef<THREE.Group>(null);

    const edges = useRef<Map<Line2, EdgeInfo>>(new Map());
    const corners = useRef<Map<THREE.Mesh, CornerInfo>>(new Map());
    const raycaster = useRef(new THREE.Raycaster());

    const [hovered, setHovered] = useState<THREE.Object3D | null>(null);
    const setInteracting = useUIInteraction((state) => state.setInteracting);
    const [interactionState, setInteractionState] =
        useState<"idle" | "drag">("idle");

    const lastScaleRef = useRef<THREE.Vector3>(scale.clone());
    const lastPositionRef = useRef<THREE.Vector3>(position.clone());

    const dragRef = useRef<DragContext | null>(null);
    const dragPlaneRef = useRef<THREE.Plane | null>(null);
    const lastDragTimeRef = useRef<number>(0);

    /* ---------- HOVER ---------- */

    function handleHover(ray: THREE.Ray) {
        if (!camera) return;

        raycaster.current.camera = camera;
        raycaster.current.ray.copy(ray);

        const objects = [
            ...edges.current.keys(),
            ...corners.current.keys(),
        ];

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
        // Drag is not active or required data is missing
        if (!dragPlaneRef.current || !dragRef.current || !groupRef.current) return;

        // Find intersection point of the mouse ray with the drag plane
        const intersectionPoint = new THREE.Vector3();
        if (!ray.intersectPlane(dragPlaneRef.current, intersectionPoint)) return;

        const dragCtx = dragRef.current;

        // World-space movement since drag start
        const deltaWorld = intersectionPoint.clone().sub(dragCtx.startPoint);

        // Start from the initial scale
        const newScale = dragCtx.startScale.clone();

        /* ---------- CORNER DRAG ---------- */
        if (dragCtx.type === "corner") {
            // Camera basis vectors in world space
            const cameraRight = new THREE.Vector3();
            const cameraUp = new THREE.Vector3();
            const cameraDir = new THREE.Vector3();

            camera.getWorldDirection(cameraDir);
            cameraRight.crossVectors(cameraDir, camera.up).normalize();
            cameraUp.copy(camera.up).normalize();

            // Mouse movement projected onto screen-space axes
            const rightAmount = deltaWorld.dot(cameraRight);
            const upAmount = deltaWorld.dot(cameraUp);

            dragCtx.axes.forEach((axis) => {
                // Unit vector for the current axis
                const axisDir = new THREE.Vector3(
                    axis === "X" ? 1 : 0,
                    axis === "Y" ? 1 : 0,
                    axis === "Z" ? 1 : 0
                );

                // Determine whether this axis reacts more to horizontal or vertical drag
                const hInfluence = Math.abs(axisDir.dot(cameraRight));
                const vInfluence = Math.abs(axisDir.dot(cameraUp));

                let axisDelta = 0;

                // Use the dominant screen-space direction
                if (hInfluence > vInfluence) {
                    axisDelta = rightAmount * Math.sign(axisDir.dot(cameraRight));
                } else {
                    axisDelta = upAmount * Math.sign(axisDir.dot(cameraUp));
                }

                const axisIndex = axis === "X" ? 0 : axis === "Y" ? 1 : 2;
                const sign = dragCtx.signs[axis] ?? 1;

                // Scale changes twice as fast as edge movement (box grows from center)
                const scaleDelta = axisDelta * sign * 2;

                const value =
                    dragCtx.startScale.getComponent(axisIndex) + scaleDelta;

                // Clamp to minimum scale
                newScale.setComponent(axisIndex, Math.max(0.2, value));
            });
        }

        /* ---------- EDGE DRAG ---------- */
        if (dragCtx.type === "edge") {
            let maxDot = 0;
            let mainAxis: Axis | null = null;

            // Find the axis that best matches the drag direction
            dragCtx.axes.forEach((axis) => {
                const axisDir = new THREE.Vector3(
                    axis === "X" ? 1 : 0,
                    axis === "Y" ? 1 : 0,
                    axis === "Z" ? 1 : 0
                ).normalize();

                const dot = Math.abs(deltaWorld.dot(axisDir));
                if (dot > maxDot) {
                    maxDot = dot;
                    mainAxis = axis;
                }
            });

            if (mainAxis) {
                const sign = dragCtx.signs[mainAxis] ?? 1;

                const axisDir = new THREE.Vector3(
                    mainAxis === "X" ? 1 : 0,
                    mainAxis === "Y" ? 1 : 0,
                    mainAxis === "Z" ? 1 : 0
                );

                // Project drag movement onto the selected axis
                const axisDelta = deltaWorld.dot(axisDir);
                const idx = mainAxis === "X" ? 0 : mainAxis === "Y" ? 1 : 2;

                // Update scale only on the dominant axis
                const newValue = Math.max(
                    0.2,
                    dragCtx.startScale.getComponent(idx) + axisDelta * sign * 2
                );

                newScale.setComponent(idx, newValue);
            }
        }

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

        const planeNormal = new THREE.Vector3();
        const group = groupRef.current;

        let dragType: "edge" | "corner" = "edge";
        let axes: Axis[] = [];
        let signs: Partial<Record<Axis, 1 | -1>> = {};

        /* ---------- EDGE CLICK ---------- */
        if (edges.current.has(hovered as Line2)) {
            const edgeInfo = edges.current.get(hovered as Line2)!;
            const edge = edgeInfo.edge;

            // For an edge, scaling is allowed only on the two axes
            // that form the face connected to this edge
            if (edge.axis === "X") axes = ["X", "Z"];
            if (edge.axis === "Y") axes = ["Y", "X"];
            if (edge.axis === "Z") axes = ["Z", "Y"];

            // Edge drag always expands equally in both directions
            axes.forEach((a) => (signs[a] = 1));

            // Drag plane faces the camera to ensure stable screen-space dragging
            camera.getWorldDirection(planeNormal);
        }

        /* ---------- CORNER CLICK ---------- */
        if (corners.current.has(hovered as THREE.Mesh)) {
            const cornerInfo = corners.current.get(hovered as THREE.Mesh)!;
            const corner = cornerInfo.corner;

            dragType = "corner";

            // Corner allows scaling on all three axes
            axes = ["X", "Y", "Z"];

            // Each axis grows or shrinks based on which corner is dragged
            signs = {
                X: corner.x,
                Y: corner.y,
                Z: corner.z,
            };

            // Plane faces the camera so drag follows mouse direction
            camera.getWorldDirection(planeNormal).negate().normalize();
        }

        // Plane passes through the box center
        const planePoint = group.getWorldPosition(new THREE.Vector3());

        // Create drag plane
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
            planeNormal,
            planePoint
        );

        // Find initial intersection point
        const startPoint = new THREE.Vector3();
        if (!e.ray.intersectPlane(plane, startPoint)) return;

        // Store drag context
        dragPlaneRef.current = plane;
        dragRef.current = {
            type: dragType,
            axes,
            signs,
            startScale: scale.clone(),
            startPosition: group.position.clone(),
            startPoint,
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

        const px = scale.x / 2;
        const py = scale.y / 2;
        const pz = scale.z / 2;

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
            geometry.setPositions([
                ...vertices[indices[0]],
                ...vertices[indices[1]],
            ]);

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
            const minScale = Math.min(scale.x, scale.y, scale.z);
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

        group.position.set(position.x, position.y, position.z);
    }, [position, scale]);

    return (
        <group
            ref={groupRef}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            onPointerDown={onPointerDown}
        />
    );
}
