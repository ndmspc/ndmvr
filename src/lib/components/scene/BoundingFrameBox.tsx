import { useCallback, useLayoutEffect, useEffect, useMemo, useRef, useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { useXR } from "@react-three/xr";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { useInputBinding } from "../../interactions/input/useInputBinding";
import { useUIInteractionOwner } from "../../stores/interaction/uiInteraction";

type Axis = "x" | "y" | "z";
type Sign = 1 | -1;
type Corner = Record<Axis, Sign>;

interface BoundingFrameBoxProps {
    position: THREE.Vector3 | { x: number; y: number; z: number } | [number, number, number];
    scale: THREE.Vector3 | { x: number; y: number; z: number } | [number, number, number];
    shiftScaleStep?: { x: number; y: number; z: number };
    onChange?: (position: THREE.Vector3, scale: THREE.Vector3) => void;
    onDragEnd?: (position: THREE.Vector3, scale: THREE.Vector3) => void;
}

interface EdgeHandle {
    type: "edge";
    from: number;
    to: number;
    direction: Axis;
    sides: Record<Axis, Sign | 0>;
    line: Line2;
    picker: THREE.Mesh;
}

interface CornerHandle {
    type: "corner";
    signs: Corner;
    marker: THREE.Mesh;
    picker: THREE.Mesh;
}

type Handle = EdgeHandle | CornerHandle;

interface DragContext {
    pointerId: number;
    domPointerId?: number;
    sides: { axis: Axis; sign: Sign }[];
    plane: THREE.Plane;
    parentInverse: THREE.Matrix4;
    startPoint: THREE.Vector3;
    startPosition: THREE.Vector3;
    startScale: THREE.Vector3;
}

type CaptureTarget = {
    setPointerCapture?: (id: number) => void;
    hasPointerCapture?: (id: number) => boolean;
    releasePointerCapture?: (id: number) => void;
};

const AXES: Axis[] = ["x", "y", "z"];
const UP = new THREE.Vector3(0, 1, 0);
const MIN_SCALE = 2;
const NORMAL_LINE_WIDTH = 0.1;
const HOVER_LINE_WIDTH = 0.15;

const VERTEX_SIGNS: Corner[] = [
    { x: -1, y: -1, z: -1 },
    { x: 1, y: -1, z: -1 },
    { x: 1, y: 1, z: -1 },
    { x: -1, y: 1, z: -1 },
    { x: -1, y: -1, z: 1 },
    { x: 1, y: -1, z: 1 },
    { x: 1, y: 1, z: 1 },
    { x: -1, y: 1, z: 1 },
];

const EDGE_PAIRS: [number, number][] = [
    [4, 5],
    [6, 7],
    [0, 1],
    [2, 3],
    [2, 6],
    [3, 7],
    [0, 4],
    [1, 5],
    [1, 2],
    [5, 6],
    [0, 3],
    [4, 7],
];

function axisVector(axis: Axis): THREE.Vector3 {
    if (axis === "x") return new THREE.Vector3(1, 0, 0);
    if (axis === "y") return new THREE.Vector3(0, 1, 0);
    return new THREE.Vector3(0, 0, 1);
}

function toVector3(
    value: THREE.Vector3 | { x: number; y: number; z: number } | [number, number, number],
    fallback: THREE.Vector3
): THREE.Vector3 {
    if (value instanceof THREE.Vector3) return value.clone();

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
    const session = useXR((state) => state.session);
    const groupRef = useRef<THREE.Group>(null);
    const normalizedScale = useMemo(() => toVector3(scale, new THREE.Vector3(2, 2, 2)), [scale]);
    const normalizedPosition = useMemo(
        () => toVector3(position, new THREE.Vector3(0, normalizedScale.y / 2, 0)),
        [position, normalizedScale.y]
    );

    const edgeHandles = useRef<EdgeHandle[]>([]);
    const cornerHandles = useRef<CornerHandle[]>([]);
    const pickHandles = useRef(new Map<THREE.Object3D, Handle>());
    const hoveredHandle = useRef<Handle | null>(null);
    const savedCursor = useRef<string | null>(null);
    const appliedBounds = useRef({
        position: normalizedPosition.clone(),
        scale: normalizedScale.clone(),
    });
    const dragRef = useRef<DragContext | null>(null);
    const captureRef = useRef<{ target: CaptureTarget; pointerId: number } | null>(null);
    const onDragEndRef = useRef(onDragEnd);

    useLayoutEffect(() => {
        onDragEndRef.current = onDragEnd;
    }, [onDragEnd]);

    const setInteracting = useUIInteractionOwner();
    const [snapPressed, setSnapPressed] = useState(false);
    useInputBinding({
        keyboard: { code: ["ShiftLeft", "ShiftRight"] },
        vr: { hand: "right", button: "xr-standard-trigger" },
        onChange: setSnapPressed,
    });

    const setCursor = useCallback((cursor: string) => {
        if (savedCursor.current === null) savedCursor.current = document.body.style.cursor;
        document.body.style.cursor = cursor;
    }, []);

    const restoreCursor = useCallback(() => {
        if (savedCursor.current === null) return;
        document.body.style.cursor = savedCursor.current;
        savedCursor.current = null;
    }, []);

    const showHover = useCallback(
        (handle: Handle | null) => {
            if (hoveredHandle.current === handle) return;
            hoveredHandle.current = handle;

            edgeHandles.current.forEach(({ line, ...edge }) => {
                const material = line.material as LineMaterial;
                const active = edge.picker === handle?.picker;
                material.linewidth = active ? HOVER_LINE_WIDTH : NORMAL_LINE_WIDTH;
                material.color.set(active ? 0xffff00 : 0xffffff);
            });
            cornerHandles.current.forEach(({ marker, ...corner }) => {
                const material = marker.material as THREE.MeshBasicMaterial;
                material.color.set(corner.picker === handle?.picker ? 0xffff00 : 0x000000);
            });

            if (handle) setCursor("pointer");
            else restoreCursor();
        },
        [restoreCursor, setCursor]
    );

    const applyFrame = useCallback((nextPosition: THREE.Vector3, nextScale: THREE.Vector3) => {
        const group = groupRef.current;
        if (!group) return;

        const half = nextScale.clone().multiplyScalar(0.5);
        const vertices = VERTEX_SIGNS.map(
            ({ x, y, z }) => new THREE.Vector3(x * half.x, y * half.y, z * half.z)
        );
        const markerRadius = Math.max(
            0.01,
            Math.min(nextScale.x, nextScale.y, nextScale.z) * 0.025
        );
        const cornerPickRadius = Math.max(0.12, markerRadius * 2);
        const edgePickRadius = Math.max(0.12, markerRadius * 1.25);

        edgeHandles.current.forEach(({ from, to, line, picker }) => {
            const a = vertices[from];
            const b = vertices[to];
            const geometry = line.geometry as LineGeometry;
            const positions = geometry.getAttribute(
                "instanceStart"
            ) as THREE.InterleavedBufferAttribute;
            const data = positions.data.array;
            data[0] = a.x;
            data[1] = a.y;
            data[2] = a.z;
            data[3] = b.x;
            data[4] = b.y;
            data[5] = b.z;
            positions.data.needsUpdate = true;
            geometry.computeBoundingBox();
            geometry.computeBoundingSphere();
            picker.position.copy(a).add(b).multiplyScalar(0.5);
            picker.scale.set(
                edgePickRadius,
                Math.max(0.01, a.distanceTo(b) - 2 * (cornerPickRadius + 0.01)),
                edgePickRadius
            );
        });
        cornerHandles.current.forEach(({ signs, marker, picker }) => {
            const point = new THREE.Vector3(signs.x * half.x, signs.y * half.y, signs.z * half.z);
            marker.position.copy(point);
            marker.scale.setScalar(markerRadius);
            picker.position.copy(point);
            picker.scale.setScalar(cornerPickRadius);
        });

        group.position.copy(nextPosition);
        group.updateMatrixWorld(true);
        appliedBounds.current.position.copy(nextPosition);
        appliedBounds.current.scale.copy(nextScale);
    }, []);

    const finishDrag = useCallback(
        (pointerId?: number, notify = true) => {
            const drag = dragRef.current;
            if (!drag || (pointerId !== undefined && drag.pointerId !== pointerId)) return;

            // Clear state first: releasing capture can synchronously raise another end event.
            dragRef.current = null;
            const capture = captureRef.current;
            captureRef.current = null;
            if (capture?.target.hasPointerCapture?.(capture.pointerId)) {
                try {
                    capture.target.releasePointerCapture?.(capture.pointerId);
                } catch {
                    // The browser may already have released a native capture.
                }
            }

            showHover(null);
            restoreCursor();
            setInteracting(false);
            if (notify) {
                onDragEndRef.current?.(
                    appliedBounds.current.position.clone(),
                    appliedBounds.current.scale.clone()
                );
            }
        },
        [restoreCursor, setInteracting, showHover]
    );

    // R3F's capture remembers the hit object, so build every pickable object once.
    useLayoutEffect(() => {
        const group = groupRef.current;
        if (!group) return;
        const pickMap = pickHandles.current;

        const cornerGeometry = new THREE.SphereGeometry(1, 8, 8);
        const edgePickGeometry = new THREE.CylinderGeometry(1, 1, 1, 8);
        const pickMaterial = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            depthWrite: false,
            colorWrite: false,
            side: THREE.DoubleSide,
        });

        EDGE_PAIRS.forEach(([from, to]) => {
            const a = VERTEX_SIGNS[from];
            const b = VERTEX_SIGNS[to];
            const direction = AXES.find((axis) => a[axis] !== b[axis])!;
            const sides: Record<Axis, Sign | 0> = {
                x: direction === "x" ? 0 : a.x,
                y: direction === "y" ? 0 : a.y,
                z: direction === "z" ? 0 : a.z,
            };

            const geometry = new LineGeometry();
            geometry.setPositions([0, 0, 0, 0, 0, 0]);
            const material = new LineMaterial({
                color: 0xffffff,
                linewidth: NORMAL_LINE_WIDTH,
                worldUnits: true,
            });
            const line = new Line2(geometry, material);
            line.raycast = () => {};

            const picker = new THREE.Mesh(edgePickGeometry, pickMaterial);
            const pickDirection = axisVector(direction).multiplyScalar(b[direction] - a[direction]);
            picker.quaternion.setFromUnitVectors(UP, pickDirection.normalize());
            const handle: EdgeHandle = { type: "edge", from, to, direction, sides, line, picker };

            group.add(line, picker);
            edgeHandles.current.push(handle);
            pickMap.set(picker, handle);
        });

        VERTEX_SIGNS.forEach((signs) => {
            const marker = new THREE.Mesh(
                cornerGeometry,
                new THREE.MeshBasicMaterial({ color: 0x000000 })
            );
            marker.raycast = () => {};
            const picker = new THREE.Mesh(cornerGeometry, pickMaterial);
            const handle: CornerHandle = { type: "corner", signs, marker, picker };

            group.add(marker, picker);
            cornerHandles.current.push(handle);
            pickMap.set(picker, handle);
        });

        return () => {
            finishDrag(undefined, false);
            restoreCursor();
            group.clear();
            edgeHandles.current.forEach(({ line }) => {
                line.geometry.dispose();
                (line.material as LineMaterial).dispose();
            });
            cornerHandles.current.forEach(({ marker }) => {
                (marker.material as THREE.Material).dispose();
            });
            cornerGeometry.dispose();
            edgePickGeometry.dispose();
            pickMaterial.dispose();
            edgeHandles.current = [];
            cornerHandles.current = [];
            pickMap.clear();
            hoveredHandle.current = null;
        };
    }, [finishDrag, restoreCursor]);

    // Parent feedback during a drag is already reflected by applyFrame; it must not replace handles.
    useLayoutEffect(() => {
        if (!dragRef.current) applyFrame(normalizedPosition, normalizedScale);
    }, [applyFrame, normalizedPosition, normalizedScale]);

    function selectedHandle(event: ThreeEvent<PointerEvent>): Handle | null {
        const object = event.intersections?.length ? event.intersections[0].object : event.object;
        return pickHandles.current.get(object) ?? null;
    }

    function onPointerDown(event: ThreeEvent<PointerEvent>) {
        if (dragRef.current || !groupRef.current || !event.ray) return;
        const handle = selectedHandle(event);
        if (!handle) return;

        const group = groupRef.current;
        group.parent?.updateWorldMatrix(true, false);
        const parentInverse = group.parent?.matrixWorld.clone().invert() ?? new THREE.Matrix4();
        const ray = event.ray.clone().applyMatrix4(parentInverse);
        const hitPoint = event.point.clone().applyMatrix4(parentInverse);

        let sides: DragContext["sides"];
        let planeNormal: THREE.Vector3;
        if (handle.type === "corner") {
            sides = AXES.map((axis) => ({ axis, sign: handle.signs[axis] }));
            planeNormal = ray.direction.clone().normalize();
        } else {
            // An edge belongs to two faces. Pick the axis most visible to this pointer ray.
            const candidates = AXES.filter((axis) => axis !== handle.direction);
            const axis =
                Math.abs(ray.direction[candidates[0]]) <= Math.abs(ray.direction[candidates[1]])
                    ? candidates[0]
                    : candidates[1];
            sides = [{ axis, sign: handle.sides[axis] as Sign }];
            // This plane contains the resize axis and meets the initial ray at a stable angle.
            planeNormal = ray.direction
                .clone()
                .addScaledVector(axisVector(axis), -ray.direction[axis])
                .normalize();
        }

        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, hitPoint);
        const startPoint = ray.intersectPlane(plane, new THREE.Vector3());
        if (!startPoint) return;

        const target = event.currentTarget as CaptureTarget;
        if (!target.setPointerCapture) return;
        try {
            target.setPointerCapture(event.pointerId);
        } catch {
            return;
        }

        const nativePointerId = (event.nativeEvent as PointerEvent | undefined)?.pointerId;
        dragRef.current = {
            pointerId: event.pointerId,
            domPointerId: typeof nativePointerId === "number" ? nativePointerId : undefined,
            sides,
            plane,
            parentInverse,
            startPoint,
            startPosition: appliedBounds.current.position.clone(),
            startScale: appliedBounds.current.scale.clone(),
        };
        captureRef.current = { target, pointerId: event.pointerId };
        showHover(null);
        setInteracting(true);
        setCursor("grabbing");
    }

    function onPointerMove(event: ThreeEvent<PointerEvent>) {
        const drag = dragRef.current;
        if (!drag) {
            showHover(selectedHandle(event));
            return;
        }
        if (event.pointerId !== drag.pointerId || !event.ray) return;

        const ray = event.ray.clone().applyMatrix4(drag.parentInverse);
        const point = ray.intersectPlane(drag.plane, new THREE.Vector3());
        if (!point) return;
        const delta = point.sub(drag.startPoint);
        const nextPosition = drag.startPosition.clone();
        const nextScale = drag.startScale.clone();

        drag.sides.forEach(({ axis, sign }) => {
            let size = drag.startScale[axis] + sign * delta[axis];
            if (snapPressed) {
                const defaultStep =
                    shiftScaleStep?.x && shiftScaleStep.x > 0 ? shiftScaleStep.x : 10;
                const configuredStep = shiftScaleStep?.[axis];
                const step = configuredStep && configuredStep > 0 ? configuredStep : defaultStep;
                size = Math.round(size / step) * step;
            }
            nextScale[axis] = Math.max(MIN_SCALE, size);
            nextPosition[axis] =
                drag.startPosition[axis] + (sign * (nextScale[axis] - drag.startScale[axis])) / 2;
        });

        if (
            nextPosition.equals(appliedBounds.current.position) &&
            nextScale.equals(appliedBounds.current.scale)
        )
            return;

        applyFrame(nextPosition, nextScale);
        onChange?.(nextPosition.clone(), nextScale.clone());
    }

    useEffect(() => {
        const onBlur = () => finishDrag();
        const onVisibilityChange = () => {
            if (document.hidden) finishDrag();
        };
        // R3F handles DOM pointercancel as hover cleanup, so use its native event as a fallback.
        const onDomEnd = (event: PointerEvent) => {
            if (dragRef.current?.domPointerId === event.pointerId) finishDrag();
        };

        window.addEventListener("blur", onBlur);
        window.addEventListener("pointerup", onDomEnd);
        window.addEventListener("pointercancel", onDomEnd);
        window.addEventListener("lostpointercapture", onDomEnd);
        document.addEventListener("visibilitychange", onVisibilityChange);
        return () => {
            window.removeEventListener("blur", onBlur);
            window.removeEventListener("pointerup", onDomEnd);
            window.removeEventListener("pointercancel", onDomEnd);
            window.removeEventListener("lostpointercapture", onDomEnd);
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
    }, [finishDrag]);

    useEffect(() => {
        // A pointer from the previous session cannot finish a drag in the new one.
        finishDrag();
        if (!session) return;
        const onEnd = () => finishDrag();
        const onVisibilityChange = () => {
            if (session.visibilityState !== "visible") finishDrag();
        };
        session.addEventListener("end", onEnd);
        session.addEventListener("visibilitychange", onVisibilityChange);
        return () => {
            session.removeEventListener("end", onEnd);
            session.removeEventListener("visibilitychange", onVisibilityChange);
            finishDrag();
        };
    }, [finishDrag, session]);

    return (
        <group
            ref={groupRef}
            onPointerMove={onPointerMove}
            onPointerOut={() => {
                if (!dragRef.current) showHover(null);
            }}
            onPointerLeave={() => {
                if (!dragRef.current) showHover(null);
            }}
            onPointerDown={onPointerDown}
            onPointerUp={(event) => finishDrag(event.pointerId)}
            onPointerCancel={(event) => finishDrag(event.pointerId)}
        />
    );
}
