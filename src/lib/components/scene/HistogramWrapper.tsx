import { useThree } from "@react-three/fiber";
import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import { filter } from "rxjs";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { useXR } from "@react-three/xr";
import {
    configSubjectGet,
    HistogramJsrootClass,
    histogramSubjectGet,
    functionSubjectGet,
    THnPainter,
    binInfoSubjectGet,
} from "@ndmspc/ndmvr-core";
import { vector3ToArray } from "../../utils/helper-functions.ts";
import { histogramEvents, useSceneModeStore } from "../../stores/sceneMode/store.ts";
import BoundingFrameBox from "./BoundingFrameBox";
import BinBox from "./BinBox";
import {
    applyHistogramPadBounds,
    clonePainterLimits,
    getBoundingFramePosition,
    getBoundingFrameScale,
    getShiftScaleStep,
    type PainterLimits,
} from "./histogram-wrapper/bounding-box-helpers";
import {
    getFirstBlockingIntersection,
    hasBlockingIntersectionForObject,
} from "./histogram-wrapper/intersections";
import { getHoveredBinFrameData, type HoveredBinLike } from "./histogram-wrapper/hovered-bin-frame";

export interface HistogramWrapperProps {
    id: string;
}

type SourceRaycaster = THREE.Raycaster & {
    _triggerSource?: string;
};

function setRaycasterTriggerSource(raycaster: THREE.Raycaster, source: string) {
    (raycaster as SourceRaycaster)._triggerSource = source;
}

export default function HistogramWrapper({ id }: HistogramWrapperProps) {
    const { scene, camera, raycaster } = useThree();
    const jsrootHistogram = useRef<any>(null);
    const nestedHistogram = useRef<any>(null);

    const activeMode = useSceneModeStore((state) => state.activeMode);
    const setActiveMode = useSceneModeStore((state) => state.setActiveMode);
    const getActiveConfigHistogramEvents = useSceneModeStore((state) => state.modesConfig[state.activeMode]?.histogramEvents);
    const binBoxEnabled = useSceneModeStore((state) => state.binBoxEnabled);

    const session = useXR((s) => s.session);
    const squeezeHeld = useRef(false);

    const [jsrootMesh, setJsrootMesh] = useState<any>(null);
    const [jsrootError, setJsrootError] = useState<any>(null);
    const [isJsrootRenderer, setIsJsrootRenderer] = useState(false);
    const [currentShiftStep, setCurrentShiftStep] = useState({ x: 0, y: 0, z: 0 });


    const [nestedMesh, setNestedMesh] = useState<any>(null);
    const [wireframeObj, setWireframeObj] = useState<any>(null);
    const [painterLimits, setPainterLimits] = useState<PainterLimits | null>(null);

    const meshRef = useRef<any>(null);
    const clickTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [hoveredBin, setHoveredBin] = useState<HoveredBinLike | null>(null);
    // Keep the last bin payload so re-entering the same bin can show the frame again.
    const [hoveredBinFrameVisible, setHoveredBinFrameVisible] = useState(false);

    const instMesh = useMemo(() => {
        if (nestedMesh === null) return null;

        nestedMesh.raycast = function (
            raycasterArg: THREE.Raycaster,
            intersects: THREE.Intersection[]
        ) {
            const painter = nestedHistogram.current;
            if (!painter) return;

            try {
                const res = painter.checkIntersectionBVH(raycasterArg.ray);
                const hit = res?.[0];

                if (hit) {
                    intersects.push({
                        ...hit,
                        point: hit.target,
                        object: this,
                    } as THREE.Intersection);
                }
            } catch (e) {
                console.error(e);
            }
        };

        return nestedMesh;
    }, [nestedMesh]);

    useEffect(() => {
        const sub = binInfoSubjectGet()
            .getObservable()
            .subscribe((next: HoveredBinLike | null) => {
                if (!binBoxEnabled) {
                    setHoveredBinFrameVisible(false);
                    return;
                }

                if (next?.instanceId === null || next?.instanceId === undefined) {
                    setHoveredBinFrameVisible(false);
                    setHoveredBin(null);
                    return;
                }

                setHoveredBinFrameVisible(true);
                setHoveredBin(next);
            });

        return () => sub.unsubscribe();
    }, [binBoxEnabled]);

    const hoveredBinFrameData = useMemo(() => {
        return getHoveredBinFrameData(hoveredBin, isJsrootRenderer);
    }, [hoveredBin, isJsrootRenderer]);

    const onBoundingBoxChange = (position: THREE.Vector3, scale: THREE.Vector3) => {
        if (isJsrootRenderer) return;

        setPainterLimits(clonePainterLimits(position, scale));
    };

    const applyHistogramModification = useCallback(
        (position: THREE.Vector3, scale: THREE.Vector3) => {
            const currentConfig = configSubjectGet().getValue();

            console.log("Applying histogram modification: ", currentConfig);

            if (!currentConfig) return;

            const newConfig = structuredClone(currentConfig);

            setCurrentShiftStep(getShiftScaleStep(newConfig));

            const changed = applyHistogramPadBounds(newConfig, id, position, scale);
            if (!changed) return;

            configSubjectGet().next(newConfig);
        },
        [id]
    );

    useEffect(() => {
        if (!nestedMesh || !nestedHistogram.current) return;

        const target = {
            entity: "nested-histogram",
            id: id,
        };

        if (!activeMode) {
            console.log("[Mode toggled] No active mode, skipping function addition");
            return;
        }

        const modeConfig = getActiveConfigHistogramEvents;
        if (!modeConfig) {
            console.log("[Mode toggled] Invalid mode config, skipping function addition");
            return;
        }

        console.log("[Mode toggled] Current mode:", activeMode);
        console.log("[Mode toggled] Removing functions for histogram:", id);
        functionSubjectGet().removeFunctions(histogramEvents.map((event) => ({ event, target })));

        const functionsToAdd = histogramEvents.flatMap((event) => {
            const eventConfig = modeConfig[event];
            if (eventConfig === null || eventConfig === undefined) return [];
            if (eventConfig === "default") return [{ event, target }];

            const handlers = Array.isArray(eventConfig) ? eventConfig : [eventConfig];
            return handlers.map((handler) => ({
                event,
                target,
                function: handler,
            }));
        });

        if (functionsToAdd.length > 0) {
            console.log("[Mode toggled] Adding functions for histogram:", id, "Functions:", functionsToAdd);
            functionSubjectGet().addFunctions(functionsToAdd);
        }
    }, [activeMode, getActiveConfigHistogramEvents, id, nestedMesh]);

    const onBoundingBoxDragEnd = (position: THREE.Vector3, scale: THREE.Vector3) => {
        if (isJsrootRenderer) return;

        console.log("Config changed from Wrapper:", position, scale);
        applyHistogramModification(position.clone(), scale.clone());
    };

    useEffect(() => {
        if (isJsrootRenderer && activeMode === "modify") {
            setActiveMode("default");
        }
    }, [isJsrootRenderer, activeMode, setActiveMode]);

    const disposeThree = (obj: any) => {
        if (!obj) return;

        const disposeOne = (o: any) => {
            o.geometry?.dispose?.();

            if (o.material) {
                if (Array.isArray(o.material)) {
                    o.material.forEach((m: any) => m?.dispose?.());
                } else {
                    o.material.dispose?.();
                }
            }
        };

        disposeOne(obj);
        obj.traverse?.(disposeOne);
    };

    const clearJsrootMesh = () => {
        if (jsrootMesh) disposeThree(jsrootMesh);
        setJsrootMesh(null);
    };

    const clearNestedMeshes = () => {
        if (nestedMesh) disposeThree(nestedMesh);
        if (wireframeObj) disposeThree(wireframeObj);

        setNestedMesh(null);
        setWireframeObj(null);
        setPainterLimits(null);
    };

    const safeRemoveHistogram = (histogram: any, label: string) => {
        try {
            histogram?.remove?.();
        } catch (e) {
            console.warn(`[HistogramWrapper] Failed to remove ${label}:`, e);
        }
    };

    useEffect(() => {
        return () => {
            safeRemoveHistogram(nestedHistogram.current, "nested histogram");
            safeRemoveHistogram(jsrootHistogram.current, "JSRoot histogram");
            nestedHistogram.current = undefined;
            jsrootHistogram.current = undefined;
        };
    }, [scene]);

    useEffect(() => {
        if (!session) return;

        const onSqueezeStart = () => {
            squeezeHeld.current = true;
        };

        const onSqueezeEnd = () => {
            squeezeHeld.current = false;
        };

        session.addEventListener("squeezestart", onSqueezeStart);
        session.addEventListener("squeezeend", onSqueezeEnd);

        return () => {
            session.removeEventListener("squeezestart", onSqueezeStart);
            session.removeEventListener("squeezeend", onSqueezeEnd);
        };
    }, [session]);

    function raycastHandler(event: any) {
        const painter = nestedHistogram.current;
        if (!painter) return;

        if (
            event.type !== "pointermove" &&
            event.type !== "pointerover" &&
            getFirstBlockingIntersection(event.intersections)?.object !== event.object
        ) {
            return;
        }

        const isShift = event.nativeEvent?.shiftKey || squeezeHeld.current;

        if (event.type === "click") {
            const source = isShift ? "shiftmouseclick" : "mouseclick";

            clickTimeout.current = setTimeout(() => {
                clickTimeout.current = null;
                painter.intersectionHandler(event, source);
            }, 250);
        } else if (event.type === "dblclick") {
            if (clickTimeout.current) {
                clearTimeout(clickTimeout.current);
                clickTimeout.current = null;
            }

            const source = isShift ? "shiftmousedbclick" : "mousedbclick";
            painter.intersectionHandler(event, source);
        } else if (event.type === "pointermove" || event.type === "pointerover") {
            setHoveredBinFrameVisible(binBoxEnabled);
            painter.intersectionHandler(event, "mousemove");
        }
    }

    function clearHoveredBinFrame(event: any) {
        if (hasBlockingIntersectionForObject(event.intersections, event.object)) {
            return;
        }

        // Hide only the frame; keep hoveredBin cached for same-bin re-entry.
        setHoveredBinFrameVisible(false);
    }

    useEffect(() => {
        console.log(`[HistogramWrapper] Subscribing to histogram ${id} updates`);

        const histoSub = histogramSubjectGet()
            .getStream(id)
            .pipe(filter((e) => (e as { id: string | number }).id === id))
            .subscribe((histo: any) => {
                try {
                    const isJsroot = histo?.opts?.render === "jsroot";
                    setIsJsrootRenderer(isJsroot);

                    if (isJsroot) {
                        if (activeMode === "modify") {
                            setActiveMode("default");
                        }

                        if (nestedHistogram.current) {
                            console.log("remove v jsroot");
                            safeRemoveHistogram(nestedHistogram.current, "nested histogram");
                            nestedHistogram.current = undefined;
                        }

                        clearNestedMeshes();
                        setJsrootError(null);

                        if (jsrootHistogram.current) {
                            jsrootHistogram.current.updateHistogram(histo.obj);
                            jsrootHistogram.current.buildPromise
                                .then(() => {
                                    const mesh = jsrootHistogram.current.getHistogramMesh();
                                    mesh?.scale?.set(1, 1, 1);
                                    setJsrootMesh(mesh);
                                    setJsrootError(null);
                                })
                                .catch((e: any) => {
                                    console.log(e);
                                    setJsrootError(e);
                                });
                        } else {
                            jsrootHistogram.current = new HistogramJsrootClass(
                                id,
                                histo.obj,
                                camera
                            );
                            jsrootHistogram.current.buildPromise
                                .then(() => {
                                    const mesh = jsrootHistogram.current.getHistogramMesh();
                                    mesh?.scale?.set(1, 1, 1);
                                    setJsrootMesh(mesh);
                                    setJsrootError(null);
                                })
                                .catch((e: any) => {
                                    console.log(e);
                                    setJsrootError(e);
                                });
                        }
                    } else {
                        if (jsrootHistogram.current) {
                            safeRemoveHistogram(jsrootHistogram.current, "JSRoot histogram");
                            jsrootHistogram.current = undefined;
                        }

                        clearJsrootMesh();

                        if (nestedHistogram.current) {
                            nestedHistogram.current.updateHistogram(histo).then(() => {
                                setPainterLimits(nestedHistogram.current.limits);
                                setNestedMesh(() => nestedHistogram.current.mesh);
                                setWireframeObj(
                                    () => nestedHistogram.current.wireframe?.wireframe ?? null
                                );

                                console.log("[HistogramWrapper] UPDATE:", nestedHistogram.current);
                            });
                        } else {
                            const painter = new THnPainter(histo, id, histo?.opts);

                            painter.renderHistogram(0, painter.totalInstances, 0).then(() => {
                                nestedHistogram.current = painter;

                                setNestedMesh(() => painter.mesh);
                                setWireframeObj(() => painter.wireframe?.wireframe ?? null);
                                setPainterLimits(painter.limits);

                                console.log("[HistogramWrapper] NEW:", painter);
                            });
                        }
                    }
                } catch (e) {
                    console.log(e);
                }
            });

        return () => {
            histoSub.unsubscribe();
            clearJsrootMesh();
            clearNestedMeshes();
        };
    }, [camera, id, setActiveMode]);

    return (
        <>
            <group>
                <Text
                    position={vector3ToArray(jsrootError?.position)}
                    fontSize={0.5}
                    color="red"
                    visible={jsrootError !== null}
                >
                    Object cannot be rendered
                </Text>

                {jsrootMesh && (
                    <primitive
                        key={jsrootMesh.uuid}
                        object={jsrootMesh}
                        onPointerMove={() => {
                            setRaycasterTriggerSource(raycaster, "mousemove");
                        }}
                        onClick={(e: any) => {
                            const isShift = e.nativeEvent?.shiftKey || squeezeHeld.current;
                            setRaycasterTriggerSource(
                                raycaster,
                                isShift ? "shiftmouseclick" : "mouseclick"
                            );
                        }}
                        onDoubleClick={(e: any) => {
                            const isShift = e.nativeEvent?.shiftKey || squeezeHeld.current;
                            setRaycasterTriggerSource(
                                raycaster,
                                isShift ? "shiftmousedbclick" : "mousedbclick"
                            );
                        }}
                    />
                )}
            </group>

            {nestedMesh && (
                <primitive
                    key={nestedMesh.uuid}
                    ref={meshRef}
                    object={instMesh}
                    onClick={raycastHandler}
                    onDoubleClick={raycastHandler}
                    onPointerOver={raycastHandler}
                    onPointerMove={raycastHandler}
                    onPointerOut={clearHoveredBinFrame}
                />
            )}

            {wireframeObj && <primitive object={wireframeObj} />}

            {painterLimits && activeMode === "modify" && !isJsrootRenderer && (
                <BoundingFrameBox
                    position={getBoundingFramePosition(painterLimits)}
                    scale={getBoundingFrameScale(painterLimits)}
                    shiftScaleStep={currentShiftStep}
                    onChange={onBoundingBoxChange}
                    onDragEnd={onBoundingBoxDragEnd}
                />
            )}

            {binBoxEnabled &&
                hoveredBinFrameVisible &&
                hoveredBinFrameData &&
                activeMode !== "modify" && (
                    <BinBox
                        position={hoveredBinFrameData.position}
                        scale={hoveredBinFrameData.scale}
                        axisRanges={hoveredBinFrameData.axisRanges}
                        contentLabel={hoveredBinFrameData.contentLabel}
                        color="#ffff00"
                        showOnlyOnHover={false}
                        labelFontSize={64}
                        passThroughPointerEvents={true}
                    />
                )}
        </>
    );
}
