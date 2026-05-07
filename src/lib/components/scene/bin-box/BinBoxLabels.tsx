import { Billboard, Text } from "@react-three/drei";
import * as THREE from "three";
import { disableRaycast, clamp } from "./bin-box-style";
import { getLabelSizeMultiplier } from "./label-metrics";
import type { InfoBlockLine } from "./types";

interface LabelSpriteProps {
    text: string;
    position: [number, number, number];
    rotation?: [number, number, number];
    textColor?: string;
    fontSize?: number;
    scale?: [number, number, number];
    mirrorX?: boolean;
    passThroughPointerEvents?: boolean;
}

// Renders one billboard-like text label for an axis marker.
export function LabelSprite({
    text,
    position,
    rotation = [0, 0, 0],
    textColor = "#ffffff",
    fontSize = 64,
    scale = [0.8, 0.24, 1],
    mirrorX = false,
    passThroughPointerEvents = false,
}: LabelSpriteProps) {
    const textHeight = scale[1] * 0.9 * clamp(fontSize / 64, 0.85, 1.6);

    return (
        <Text
            position={position}
            rotation={rotation}
            fontWeight="bold"
            fontSize={textHeight}
            color={textColor}
            anchorX="center"
            anchorY="middle"
            scale={mirrorX ? [-1, 1, 1] : [1, 1, 1]}
            maxWidth={scale[0] * 1.8}
            outlineWidth={0.02}
            outlineColor="#000000"
            textAlign="center"
            renderOrder={1002}
            raycast={passThroughPointerEvents ? disableRaycast : undefined}
        >
            {text}
            <meshBasicMaterial
                color={textColor}
                transparent
                side={THREE.DoubleSide}
                depthWrite={false}
                depthTest={false}
            />
        </Text>
    );
}

interface InfoBlockProps {
    lines: InfoBlockLine[];
    boxScale: THREE.Vector3;
    fontSize?: number;
    scaleMultiplier?: number;
    passThroughPointerEvents?: boolean;
}

// Renders the central billboard panel with bin content and axis ranges.
export function InfoBlock({
    lines,
    boxScale,
    fontSize = 56,
    scaleMultiplier = 1,
    passThroughPointerEvents = false,
}: InfoBlockProps) {
    const longestLineLength = lines.reduce((max, line) => {
        return Math.max(max, line.text.length);
    }, 1);
    const labelSizeMultiplier = getLabelSizeMultiplier(boxScale) * scaleMultiplier;
    const initialTextHeight = clamp(
        labelSizeMultiplier * 0.18 * clamp(fontSize / 56, 0.8, 1.5),
        0.16,
        0.36
    );
    const outlineWidth = 0.02;
    const binLimitedWidth = Math.min(boxScale.x, boxScale.z) * 0.95;
    const binLimitedHeight = boxScale.y * 0.95;

    const requiredWidth = (textHeight: number) => {
        return longestLineLength * textHeight * 0.42 + 0.72;
    };
    const requiredHeight = (textHeight: number) => {
        return lines.length * (textHeight * 1.65 + outlineWidth) + 0.48;
    };
    const requiredInitialWidth = requiredWidth(initialTextHeight);
    const requiredInitialHeight = requiredHeight(initialTextHeight);
    const defaultBlockWidth = clamp(requiredInitialWidth, 1.35, 4.3);
    const defaultBlockHeight = clamp(requiredInitialHeight, 0.75, 2.9);
    const fitsWithinBin =
        requiredInitialWidth <= binLimitedWidth && requiredInitialHeight <= binLimitedHeight;
    const maxBlockWidth = fitsWithinBin ? binLimitedWidth : defaultBlockWidth;
    const maxBlockHeight = fitsWithinBin ? binLimitedHeight : defaultBlockHeight;
    const minBlockWidth = Math.min(1.35, maxBlockWidth);
    const minBlockHeight = Math.min(0.75, maxBlockHeight);
    const textHeight = Math.min(
        initialTextHeight,
        (defaultBlockWidth - 0.72) / Math.max(longestLineLength * 0.42, 0.001),
        (defaultBlockHeight - 0.48 - lines.length * outlineWidth) /
            Math.max(lines.length * 1.65, 0.001)
    );
    const lineStep = textHeight * 1.65 + outlineWidth;
    const blockWidth = clamp(requiredWidth(textHeight), minBlockWidth, maxBlockWidth);
    const blockHeight = clamp(requiredHeight(textHeight), minBlockHeight, maxBlockHeight);

    return (
        <Billboard position={[0, 0, 0]} renderOrder={1003}>
            <mesh
                position={[0, 0, -0.015]}
                raycast={passThroughPointerEvents ? disableRaycast : undefined}
            >
                <planeGeometry args={[blockWidth, blockHeight]} />
                <meshBasicMaterial
                    color="#111827"
                    transparent
                    opacity={0.78}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                    depthTest={false}
                />
            </mesh>
            {lines.map((line, index) => {
                const topOffset = ((lines.length - 1) * lineStep) / 2;
                const y = topOffset - index * lineStep;

                return (
                    <Text
                        key={`${line.text}-${index}`}
                        position={[0, y, 0.01]}
                        fontWeight="bold"
                        fontSize={textHeight}
                        color={line.color}
                        anchorX="center"
                        anchorY="middle"
                        maxWidth={blockWidth * 0.88}
                        textAlign="center"
                        outlineWidth={outlineWidth}
                        outlineColor="#000000"
                        renderOrder={1004}
                        raycast={passThroughPointerEvents ? disableRaycast : undefined}
                    >
                        {line.text}
                        <meshBasicMaterial
                            color={line.color}
                            transparent
                            side={THREE.DoubleSide}
                            depthWrite={false}
                            depthTest={false}
                        />
                    </Text>
                );
            })}
        </Billboard>
    );
}
