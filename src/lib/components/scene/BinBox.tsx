import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Group } from "three";
import {
    disableRaycast,
    getLighterColor,
    passThroughPointerEventUserData,
} from "./bin-box/bin-box-style";
import {
    getAxisLabelColors,
    getAxisMarkerPlacementCandidates,
    getCenterInfoLines,
    getNearestAxisEdgeIndices,
    isKnownAxis,
} from "./bin-box/axis-labels";
import {
    getDistanceLabelSizeMultiplier,
    getLabelSizeMultiplier,
    scaleLabelSize,
} from "./bin-box/label-metrics";
import { InfoBlock, LabelSprite } from "./bin-box/BinBoxLabels";
import { toPositiveVector3, toVector3 } from "./bin-box/vector-utils";
import type { AxisEdgeIndices, AxisKey, BinBoxProps } from "./bin-box/types";
export type { BinBoxAxisRange, BinBoxProps } from "./bin-box/types";

export default function BinBox({
    position,
    scale,
    axisRanges,
    contentLabel,
    color = "#ffff00",
    labelFontSize = 56,
    showOnlyOnHover = true,
    onHoverChange,
    passThroughPointerEvents = true,
}: BinBoxProps) {
    const { camera } = useThree();
    const groupRef = useRef<Group>(null);
    const cameraPositionRef = useRef(new THREE.Vector3());
    const boxPositionRef = useRef(new THREE.Vector3());
    const localCameraPositionRef = useRef(new THREE.Vector3());
    const distanceLabelSizeMultiplierRef = useRef(1);
    const [internalHovered, setInternalHovered] = useState(false);
    const [distanceLabelSizeMultiplier, setDistanceLabelSizeMultiplier] = useState(1);
    const [nearestAxisEdgeIndices, setNearestAxisEdgeIndices] = useState<AxisEdgeIndices>({
        x: 0,
        y: 0,
        z: 0,
    });

    const shouldShow = showOnlyOnHover ? internalHovered : true;
    const needsInternalHoverHitbox = showOnlyOnHover;
    const hitboxPassThrough = passThroughPointerEvents && !needsInternalHoverHitbox;

    const normalizedScale = useMemo(() => {
        return toPositiveVector3(scale, new THREE.Vector3(2, 2, 2));
    }, [scale]);

    const normalizedPosition = useMemo(() => {
        return toVector3(position, new THREE.Vector3(0, normalizedScale.y / 2, 0));
    }, [position, normalizedScale.y]);

    const boxGeometry = useMemo(() => {
        return new THREE.BoxGeometry(normalizedScale.x, normalizedScale.y, normalizedScale.z);
    }, [normalizedScale.x, normalizedScale.y, normalizedScale.z]);

    const edgesGeometry = useMemo(() => {
        return new THREE.EdgesGeometry(boxGeometry);
    }, [boxGeometry]);

    const wallColor = useMemo(() => {
        return getLighterColor(color);
    }, [color]);

    const glowScale = useMemo(() => {
        return new THREE.Vector3(
            normalizedScale.x * 1.035,
            normalizedScale.y * 1.035,
            normalizedScale.z * 1.035
        );
    }, [normalizedScale.x, normalizedScale.y, normalizedScale.z]);

    const glowGeometry = useMemo(() => {
        return new THREE.BoxGeometry(glowScale.x, glowScale.y, glowScale.z);
    }, [glowScale.x, glowScale.y, glowScale.z]);

    useEffect(() => {
        return () => {
            glowGeometry.dispose();
            edgesGeometry.dispose();
            boxGeometry.dispose();
        };
    }, [boxGeometry, edgesGeometry, glowGeometry]);

    const visibleAxisRanges = useMemo(() => {
        return axisRanges ?? [];
    }, [axisRanges]);

    const markerAxisRanges = useMemo(() => {
        const usedAxes = new Set<AxisKey>();

        return visibleAxisRanges.filter((range) => {
            const axis = range.axis.toLowerCase();

            if (!isKnownAxis(axis) || usedAxes.has(axis)) {
                return false;
            }

            usedAxes.add(axis);
            return true;
        });
    }, [visibleAxisRanges]);

    const centerInfoLines = useMemo(() => {
        return getCenterInfoLines(contentLabel, visibleAxisRanges);
    }, [contentLabel, visibleAxisRanges]);

    const handlePointerOver = () => {
        setInternalHovered(true);
        onHoverChange?.(true);
    };

    const handlePointerOut = () => {
        setInternalHovered(false);
        onHoverChange?.(false);
    };

    useFrame(() => {
        if (!groupRef.current || !shouldShow) {
            return;
        }

        camera.getWorldPosition(cameraPositionRef.current);
        groupRef.current.getWorldPosition(boxPositionRef.current);
        localCameraPositionRef.current.copy(cameraPositionRef.current);
        groupRef.current.worldToLocal(localCameraPositionRef.current);

        const distance = cameraPositionRef.current.distanceTo(boxPositionRef.current);
        const nextMultiplier = getDistanceLabelSizeMultiplier(distance, normalizedScale);
        const nextNearestAxisEdgeIndices = getNearestAxisEdgeIndices(
            normalizedScale,
            localCameraPositionRef.current
        );

        if (Math.abs(distanceLabelSizeMultiplierRef.current - nextMultiplier) > 0.03) {
            distanceLabelSizeMultiplierRef.current = nextMultiplier;
            setDistanceLabelSizeMultiplier(nextMultiplier);
        }

        setNearestAxisEdgeIndices((currentIndices) => {
            if (
                currentIndices.x === nextNearestAxisEdgeIndices.x &&
                currentIndices.y === nextNearestAxisEdgeIndices.y &&
                currentIndices.z === nextNearestAxisEdgeIndices.z
            ) {
                return currentIndices;
            }

            return nextNearestAxisEdgeIndices;
        });
    });

    return (
        <group ref={groupRef} position={normalizedPosition}>
            {/* Transparent hitbox supports internal hover and is flagged as passthrough for picks. */}
            <mesh
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
                raycast={hitboxPassThrough ? disableRaycast : undefined}
                userData={passThroughPointerEvents ? passThroughPointerEventUserData : undefined}
            >
                <boxGeometry args={[normalizedScale.x, normalizedScale.y, normalizedScale.z]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {shouldShow && (
                <>
                    <mesh
                        geometry={glowGeometry}
                        renderOrder={999}
                        raycast={passThroughPointerEvents ? disableRaycast : undefined}
                    >
                        <meshBasicMaterial
                            color={color}
                            transparent
                            opacity={0.05}
                            side={THREE.BackSide}
                            depthWrite={false}
                            depthTest={false}
                            blending={THREE.AdditiveBlending}
                        />
                    </mesh>

                    <mesh
                        geometry={boxGeometry}
                        renderOrder={1000}
                        raycast={passThroughPointerEvents ? disableRaycast : undefined}
                    >
                        <meshBasicMaterial
                            color={wallColor}
                            transparent
                            opacity={0.16}
                            side={THREE.DoubleSide}
                            depthWrite={false}
                            depthTest={false}
                            polygonOffset
                            polygonOffsetFactor={-4}
                            polygonOffsetUnits={-4}
                        />
                    </mesh>

                    <lineSegments
                        geometry={edgesGeometry}
                        renderOrder={1001}
                        raycast={passThroughPointerEvents ? disableRaycast : undefined}
                    >
                        <lineBasicMaterial
                            color={color}
                            transparent
                            opacity={1}
                            depthWrite={false}
                            depthTest={false}
                        />
                    </lineSegments>

                    {markerAxisRanges.map((range) => {
                        const axis = range.axis.toLowerCase() as AxisKey;
                        const placement = getAxisMarkerPlacementCandidates(axis, normalizedScale)[
                            nearestAxisEdgeIndices[axis]
                        ];
                        const labelColors = getAxisLabelColors(range.axis);

                        if (!placement) {
                            return null;
                        }

                        const fontMultiplier = getLabelSizeMultiplier(normalizedScale);
                        const titleFontSize = Math.round(
                            Math.max(
                                28,
                                labelFontSize * 0.9 * fontMultiplier * distanceLabelSizeMultiplier
                            )
                        );

                        return (
                            <LabelSprite
                                key={`${axis}-marker-${nearestAxisEdgeIndices[axis]}`}
                                text={axis}
                                position={placement.position}
                                rotation={placement.rotation}
                                textColor={labelColors.title}
                                fontSize={titleFontSize}
                                scale={scaleLabelSize(
                                    [0.45, 0.28, 1],
                                    fontMultiplier * distanceLabelSizeMultiplier
                                )}
                                mirrorX={placement.mirrorX}
                                passThroughPointerEvents={passThroughPointerEvents}
                            />
                        );
                    })}

                    {centerInfoLines.length > 0 && (
                        <InfoBlock
                            lines={centerInfoLines}
                            boxScale={normalizedScale}
                            fontSize={labelFontSize}
                            scaleMultiplier={distanceLabelSizeMultiplier}
                            passThroughPointerEvents={passThroughPointerEvents}
                        />
                    )}
                </>
            )}
        </group>
    );
}
