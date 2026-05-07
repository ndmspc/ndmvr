import * as THREE from "three";
import type { BinBoxAxisRange } from "../BinBox";

export interface HoveredBinLike {
    instanceId?: string | number | null;
    level?: string | number | null;
    object?: THREE.InstancedMesh | null;
    coords?: Array<{
        [key: string]: unknown;
        x?: AxisInfoLike;
        y?: AxisInfoLike;
        z?: AxisInfoLike;
    } | null>;
    binWholePosSize?: {
        position?: ArrayLike<number>;
        scale?: ArrayLike<number>;
    };
    [key: string]: unknown;
}

interface AxisInfoLike {
    min?: unknown;
    max?: unknown;
    name?: unknown;
    title?: unknown;
    label?: unknown;
}

interface HoveredBinAxisRange {
    axis: string;
    min?: number;
    max?: number;
    title?: string;
    name?: string;
    label?: string;
}

export interface HoveredBinFrameData {
    position: THREE.Vector3;
    scale: THREE.Vector3;
    axisRanges: BinBoxAxisRange[];
    contentLabel?: string;
}

// Checks if a raw coordinate value looks like axis metadata.
function isAxisInfo(value: unknown): value is AxisInfoLike {
    return (
        !!value &&
        typeof value === "object" &&
        ("min" in value || "max" in value || "label" in value)
    );
}

// Safely converts unknown input into a finite number.
function toFiniteNumber(value: unknown): number | undefined {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : undefined;
}

// Builds a readable axis title from title/name fields.
function getAxisTitle(axisKey: string, axis: AxisInfoLike): string {
    const title = typeof axis.title === "string" && axis.title.trim() ? axis.title : undefined;
    const name = typeof axis.name === "string" && axis.name.trim() ? axis.name : undefined;

    if (title && name && title !== name) {
        return `${title} (${name})`;
    }

    return title ?? name ?? axisKey;
}

// Maps different axis names from JSRoot/core payloads to x/y/z when possible.
function normalizeAxisKey(axisKey: string, axis: AxisInfoLike): string {
    const candidates = [axisKey, axis.name, axis.title]
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim().toLowerCase());

    if (candidates.some((value) => value === "x" || value.startsWith("xaxis"))) {
        return "x";
    }

    if (candidates.some((value) => value === "y" || value.startsWith("yaxis"))) {
        return "y";
    }

    if (candidates.some((value) => value === "z" || value.startsWith("zaxis"))) {
        return "z";
    }

    return axisKey;
}

// Extracts axis min/max ranges from the deepest hovered bin coordinate entry.
function getHoveredBinAxisRanges(hovered: HoveredBinLike | null): HoveredBinAxisRange[] {
    if (!hovered?.coords || !Array.isArray(hovered.coords) || hovered.coords.length === 0) {
        return [];
    }

    const deepestCoordEntry = [...hovered.coords]
        .reverse()
        .find((coordEntry) => coordEntry && typeof coordEntry === "object");

    if (!deepestCoordEntry) {
        return [];
    }

    const rangesByAxis = new Map<string, HoveredBinAxisRange>();
    const axisOrder = ["x", "y", "z"];

    const addAxisRange = (axisKey: string, axis: AxisInfoLike) => {
        const normalizedAxisKey = normalizeAxisKey(axisKey, axis);

        if (rangesByAxis.has(normalizedAxisKey)) {
            return;
        }

        rangesByAxis.set(normalizedAxisKey, {
            axis: normalizedAxisKey,
            min: toFiniteNumber(axis.min),
            max: toFiniteNumber(axis.max),
            title: typeof axis.title === "string" ? axis.title : undefined,
            name: typeof axis.name === "string" ? axis.name : undefined,
            label: typeof axis.label === "string" ? axis.label : undefined,
        });
    };

    (["x", "y", "z"] as const).forEach((axisKey) => {
        const axis = deepestCoordEntry[axisKey];
        if (isAxisInfo(axis)) {
            addAxisRange(axisKey, axis);
        }
    });

    Object.entries(deepestCoordEntry).forEach(([axisKey, value]) => {
        if (isAxisInfo(value)) {
            addAxisRange(axisKey, value);
        }
    });

    return [...rangesByAxis.values()].sort((a, b) => {
        const aIndex = axisOrder.indexOf(a.axis);
        const bIndex = axisOrder.indexOf(b.axis);

        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
    });
}

// Formats bin content and error into one label for the info block.
function getHoveredBinContentLabel(hovered: HoveredBinLike | null): string | undefined {
    const content = toFiniteNumber(hovered?.content);
    const error = toFiniteNumber(hovered?.error);

    if (content === undefined) {
        return undefined;
    }

    return `${content.toFixed(3)} +- ${error?.toFixed(3) ?? "N/A"}`;
}

// Converts raw hovered-bin ranges into BinBox axis range props.
function getHoveredBinAxisRangeData(hovered: HoveredBinLike | null): BinBoxAxisRange[] {
    return getHoveredBinAxisRanges(hovered).map((range) => ({
        axis: range.axis,
        title: getAxisTitle(range.axis, range),
        min: range.min,
        max: range.max,
        label: range.label,
    }));
}

// Resolves hovered JSRoot instance transform from its instance matrix.
function getJsrootHoveredBinTransform(hovered: HoveredBinLike | null) {
    const object = hovered?.object;
    const instanceId = Number(hovered?.instanceId);

    if (
        !object ||
        !Number.isInteger(instanceId) ||
        instanceId < 0 ||
        typeof object.getMatrixAt !== "function"
    ) {
        return null;
    }

    const instanceMatrix = new THREE.Matrix4();
    const worldMatrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    try {
        object.updateWorldMatrix(true, false);
        object.getMatrixAt(instanceId, instanceMatrix);
        worldMatrix.multiplyMatrices(object.matrixWorld, instanceMatrix);
        worldMatrix.decompose(position, quaternion, scale);
    } catch (e) {
        console.warn("[HistogramWrapper] Could not resolve JSRoot bin transform:", e);
        return null;
    }

    if (
        !Number.isFinite(position.x) ||
        !Number.isFinite(position.y) ||
        !Number.isFinite(position.z) ||
        !Number.isFinite(scale.x) ||
        !Number.isFinite(scale.y) ||
        !Number.isFinite(scale.z)
    ) {
        return null;
    }

    return {
        position,
        scale: new THREE.Vector3(Math.abs(scale.x), Math.abs(scale.y), Math.abs(scale.z)),
    };
}

// Reads nested histogram bin position and scale from core-provided payload.
function getNestedBinTransform(hovered: HoveredBinLike | null) {
    if (!hovered?.binWholePosSize) {
        return null;
    }

    const { position, scale } = hovered.binWholePosSize;

    if (!position || !scale || position.length < 3 || scale.length < 3) {
        return null;
    }

    const boxPosition = new THREE.Vector3(
        Number(position[0]),
        Number(position[1]),
        Number(position[2])
    );
    const boxScale = new THREE.Vector3(Number(scale[0]), Number(scale[1]), Number(scale[2]));

    if (
        !Number.isFinite(boxPosition.x) ||
        !Number.isFinite(boxPosition.y) ||
        !Number.isFinite(boxPosition.z) ||
        !Number.isFinite(boxScale.x) ||
        !Number.isFinite(boxScale.y) ||
        !Number.isFinite(boxScale.z)
    ) {
        return null;
    }

    return {
        position: boxPosition,
        scale: boxScale,
    };
}

// Builds all data needed to render the yellow BinBox overlay.
export function getHoveredBinFrameData(
    hovered: HoveredBinLike | null,
    isJsrootRenderer: boolean
): HoveredBinFrameData | null {
    const transform =
        getNestedBinTransform(hovered) ??
        (isJsrootRenderer ? getJsrootHoveredBinTransform(hovered) : null);

    if (!transform) {
        return null;
    }

    return {
        position: transform.position,
        scale: transform.scale,
        axisRanges: getHoveredBinAxisRangeData(hovered),
        contentLabel: getHoveredBinContentLabel(hovered),
    };
}
