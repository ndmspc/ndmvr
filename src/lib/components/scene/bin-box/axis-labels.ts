import * as THREE from "three";
import type {
    AxisEdgeIndices,
    AxisKey,
    AxisMarkerPlacement,
    BinBoxAxisRange,
    InfoBlockLine,
} from "./types";

function formatLabelValue(value: number | undefined): string {
    if (value === undefined || Number.isNaN(value)) {
        return "-";
    }

    const abs = Math.abs(value);

    if (value !== 0 && (abs >= 1e6 || (abs > 0 && abs < 1e-3))) {
        return value.toExponential(2);
    }

    if (Number.isInteger(value)) {
        return String(value);
    }

    return value.toFixed(2);
}

export function getAxisLabelColors(axis: string) {
    switch (axis.toLowerCase()) {
        case "x":
            return {
                min: "#A855F7",
                title: "#A855F7",
                max: "#A855F7",
            };

        case "y":
            return {
                min: "#EF4444",
                title: "#EF4444",
                max: "#EF4444",
            };

        case "z":
            return {
                title: "#10B981",
                min: "#10B981",
                max: "#10B981",
            };

        default:
            return {
                min: "#000000",
                title: "#000000",
                max: "#000000",
            };
    }
}

// Checks if an axis can be rendered as one of the known x/y/z markers.
export function isKnownAxis(axis: string): axis is AxisKey {
    return axis === "x" || axis === "y" || axis === "z";
}

// Builds possible label positions for an axis around the selected bin box.
export function getAxisMarkerPlacementCandidates(
    axis: string,
    boxScale: THREE.Vector3
): AxisMarkerPlacement[] {
    const x = boxScale.x / 2;
    const y = boxScale.y / 2;
    const z = boxScale.z / 2;

    switch (axis.toLowerCase()) {
        case "x":
            return [
                {
                    position: [0, -y, z],
                    rotation: [0, 0, 0],
                },
                {
                    position: [0, -y, -z],
                    rotation: [0, 0, 0],
                },
            ];

        case "y":
            return [
                {
                    position: [-x, -y, 0],
                    rotation: [0, -Math.PI / 2, 0],
                },
                {
                    position: [x, -y, 0],
                    rotation: [0, Math.PI / 2, 0],
                },
            ];

        case "z":
            return [
                {
                    position: [x, 0, z],
                    rotation: [0, 0, -Math.PI],
                },
                {
                    position: [-x, 0, -z],
                    rotation: [0, 0, -Math.PI],
                    mirrorX: true,
                },
            ];

        default:
            return [];
    }
}

// Chooses the axis label edge that is closest to the camera.
export function getNearestAxisEdgeIndices(
    boxScale: THREE.Vector3,
    localCameraPosition: THREE.Vector3
): AxisEdgeIndices {
    const getNearestIndex = (axis: AxisKey): 0 | 1 => {
        const candidates = getAxisMarkerPlacementCandidates(axis, boxScale);
        const distances = candidates.map((candidate) => {
            const [x, y, z] = candidate.position;

            return localCameraPosition.distanceToSquared(new THREE.Vector3(x, y, z));
        });

        return distances[0] <= distances[1] ? 0 : 1;
    };

    return {
        x: getNearestIndex("x"),
        y: getNearestIndex("y"),
        z: getNearestIndex("z"),
    };
}

// Creates the text lines shown in the center info block.
export function getCenterInfoLines(
    contentLabel: string | undefined,
    axisRanges: BinBoxAxisRange[]
): InfoBlockLine[] {
    return [
        contentLabel ? { text: contentLabel, color: "#ffffff" } : undefined,
        ...axisRanges.map((range) => {
            const axis = range.axis.toUpperCase();
            const title = range.title || axis;
            const labelColors = getAxisLabelColors(range.axis);

            return {
                text: `${axis}: ${title} [${formatLabelValue(range.min)}, ${formatLabelValue(range.max)}]`,
                color: labelColors.title,
            };
        }),
    ].filter((line): line is InfoBlockLine => Boolean(line));
}
