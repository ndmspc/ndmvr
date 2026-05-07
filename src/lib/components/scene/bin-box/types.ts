import * as THREE from "three";

export type Vector3Like =
    | THREE.Vector3
    | { x: number; y: number; z: number }
    | [number, number, number];

export interface BinBoxAxisRange {
    axis: "x" | "y" | "z" | string;
    title: string;
    min?: number;
    max?: number;
    label?: string;
}

export interface BinBoxProps {
    position: Vector3Like;
    scale: Vector3Like;
    axisRanges?: BinBoxAxisRange[];
    contentLabel?: string;
    color?: THREE.ColorRepresentation;
    labelFontSize?: number;
    showOnlyOnHover?: boolean;
    onHoverChange?: (hovered: boolean) => void;
    passThroughPointerEvents?: boolean;
}

export type InfoBlockLine = {
    text: string;
    color: string;
};

export type AxisMarkerPlacement = {
    position: [number, number, number];
    rotation: [number, number, number];
    mirrorX?: boolean;
};

export type AxisKey = "x" | "y" | "z";
export type AxisEdgeIndices = Record<AxisKey, 0 | 1>;
