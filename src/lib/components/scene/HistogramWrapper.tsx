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
    applyObjectBoundsTransform,
    applyHistogramPadBounds,
    clonePainterLimits,
    getBoundingFramePosition,
    getBoundingFrameScale,
    getHistogramPadBounds,
    getObjectBounds,
    getObjectPainterLimits,
    getShiftScaleStep,
    type ObjectBounds,
    type PainterLimits,
} from "./histogram-wrapper/bounding-box-helpers";
import {
    getFirstBlockingIntersection,
    hasBlockingIntersectionForObject,
} from "./histogram-wrapper/intersections";
import { getHoveredBinFrameData, type HoveredBinLike } from "./histogram-wrapper/hovered-bin-frame";
import {
    activateHistogramPad,
    prepareHistogramPadState,
} from "../../stores/histogramWorkspace";

export interface HistogramWrapperProps {
    id: string;
}

type SourceRaycaster = THREE.Raycaster & {
    _triggerSource?: string;
};

type HistogramIntersection = THREE.Intersection & {
    index?: unknown;
    range?: unknown;
    target?: THREE.Vector3;
    triggerSource?: string;
};

type SyncablePainter = any & {
    _ndmvrMeshSyncInstalled?: boolean;
};

const CLICK_DELAY_MS = 300;
const XR_SYNTHETIC_CLICK_SUPPRESSION_MS = CLICK_DELAY_MS;

function setRaycasterTriggerSource(raycaster: THREE.Raycaster, source: string) {
    (raycaster as SourceRaycaster)._triggerSource = source;
}

function hasHistogramIntersectionPayload(value: unknown): value is HistogramIntersection {
    const intersection = value as HistogramIntersection | undefined;
    return Array.isArray(intersection?.index) && Array.isArray(intersection?.range);
}

function getHistogramIntersection(event: any, painter: any, triggerSource: string) {
    const intersections = Array.isArray(event?.intersections) ? event.intersections : [];
    const eventObject = event?.object;

    const matchingHit = intersections.find((intersection: HistogramIntersection) => {
        return intersection?.object === eventObject && hasHistogramIntersectionPayload(intersection);
    });
    const hit =
        matchingHit ??
        intersections.find(hasHistogramIntersectionPayload) ??
        (hasHistogramIntersectionPayload(event?.intersection) ? event.intersection : null) ??
        (hasHistogramIntersectionPayload(event) ? event : null);

    if (hit) {
        return {
            ...hit,
            object: hit.object ?? eventObject,
            point: hit.point ?? hit.target,
            triggerSource,
        };
    }

    const ray = event?.ray ?? event?.raycaster?.ray;
    const bvhHit = ray ? painter.checkIntersectionBVH?.(ray)?.[0] : null;

    if (!hasHistogramIntersectionPayload(bvhHit)) return null;

    return {
        ...bvhHit,
        object: bvhHit.object ?? eventObject,
        point: bvhHit.point ?? bvhHit.target,
        triggerSource,
    };
}

function isXRTriggerRelease(event: unknown, isXR: boolean) {
    const pointerEvent = event as { type?: unknown; nativeEvent?: { type?: unknown } } | undefined;
    if (!isXR || pointerEvent?.type !== "pointerup") return false;

    const nativeType = pointerEvent.nativeEvent?.type;
    return typeof nativeType === "string" && nativeType.startsWith("select");
}

function clearNestedHistogramFunctions(id: string) {
    functionSubjectGet().removeFunctions({
        target: {
            entity: "nested-histogram",
            id,
        },
    });
}

export default function HistogramWrapper({ id }: HistogramWrapperProps) {
    const { scene, camera, raycaster } = useThree();
    const jsrootHistogram = useRef<any>(null);
    // JSROOT needs the untransformed mesh bounds so drag-end scaling can be applied correctly.
    const jsrootBaseBounds = useRef<ObjectBounds | null>(null);
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
    const nestedMeshObject = useRef<THREE.Object3D | null>(null);
    const wireframeObject = useRef<THREE.Object3D | null>(null);

    const meshRef = useRef<any>(null);
    const clickTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastXRTriggerRelease = useRef(0);

    const [hoveredBin, setHoveredBin] = useState<HoveredBinLike | null>(null);
    // Keep the last bin payload so re-entering the same bin can show the frame again.
    const [hoveredBinFrameVisible, setHoveredBinFrameVisible] = useState(false);

    const applyJsrootMeshBounds = useCallback(
        (mesh: THREE.Object3D | null | undefined, position: THREE.Vector3, scale: THREE.Vector3) => {
            applyObjectBoundsTransform(mesh, jsrootBaseBounds.current, position, scale);
        },
        []
    );

    const syncNestedPainterObjects = useCallback((painter: any) => {
        const mesh = painter?.mesh ?? null;
        const wireframe = painter?.wireframe?.wireframe ?? null;

        if (nestedMeshObject.current !== mesh) {
            mesh?.parent?.remove(mesh);
            nestedMeshObject.current = mesh;
            setNestedMesh(() => mesh);
        }

        if (wireframeObject.current !== wireframe) {
            wireframe?.parent?.remove(wireframe);
            wireframeObject.current = wireframe;
            setWireframeObj(() => wireframe);
        }

        setPainterLimits(painter?.limits ?? null);
    }, []);

    const installNestedPainterMeshSync = useCallback(
        (painter: SyncablePainter | null | undefined) => {
            if (!painter || painter._ndmvrMeshSyncInstalled) return;

            const originalPushVisibleInstances = painter.pushVisibleInstances?.bind(painter);
            if (typeof originalPushVisibleInstances !== "function") return;

            painter.pushVisibleInstances = (...args: any[]) => {
                const result = originalPushVisibleInstances(...args);
                syncNestedPainterObjects(painter);
                return result;
            };
            painter._ndmvrMeshSyncInstalled = true;
        },
        [syncNestedPainterObjects]
    );

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
        clearNestedHistogramFunctions(id);

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
        if (isJsrootRenderer) {
            applyJsrootMeshBounds(jsrootMesh, position, scale);
            setPainterLimits(clonePainterLimits(position, scale));
        }

        console.log("Config changed from Wrapper:", position, scale);
        applyHistogramModification(position.clone(), scale.clone());
    };

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
        jsrootBaseBounds.current = null;
        setPainterLimits(null);
    };

    const clearNestedMeshes = () => {
        if (nestedMesh) disposeThree(nestedMesh);
        if (wireframeObj) disposeThree(wireframeObj);

        nestedMeshObject.current = null;
        wireframeObject.current = null;
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

    function clearPendingClick() {
        if (!clickTimeout.current) return;

        clearTimeout(clickTimeout.current);
        clickTimeout.current = null;
    }

    function scheduleSingleClick(painter: any, hit: HistogramIntersection, source: string) {
        clearPendingClick();

        clickTimeout.current = setTimeout(() => {
            clickTimeout.current = null;
            painter.intersectionHandler(hit, source);
        }, CLICK_DELAY_MS);
    }

    function raycastHandler(event: any) {
        const painter = nestedHistogram.current;
        if (!painter) return;

        if (event.type === "click" || event.type === "dblclick" || event.type === "pointerup") {
            activateHistogramPad(id);
        }

        const isXR = session !== null && session !== undefined;
        const isXRClick = isXRTriggerRelease(event, isXR);
        const blockingIntersection = getFirstBlockingIntersection(event.intersections);

        if (
            event.type !== "pointermove" &&
            event.type !== "pointerover" &&
            blockingIntersection?.object &&
            blockingIntersection.object !== event.object
        ) {
            return;
        }

        const isShift = event.nativeEvent?.shiftKey || squeezeHeld.current;

        if (isXRClick) {
            lastXRTriggerRelease.current = performance.now();
        } else if (
            isXR &&
            event.type === "click" &&
            lastXRTriggerRelease.current > 0 &&
            performance.now() - lastXRTriggerRelease.current < XR_SYNTHETIC_CLICK_SUPPRESSION_MS
        ) {
            return;
        }

        if (event.type === "click" || isXRClick) {
            const clickCount = Number(event.nativeEvent?.detail ?? 1);
            if (!isXRClick && clickCount > 1) {
                clearPendingClick();
                return;
            }

            const source = isShift ? "shiftmouseclick" : "mouseclick";
            const hit = getHistogramIntersection(event, painter, source);
            if (!hit) return;

            scheduleSingleClick(painter, hit, source);
        } else if (event.type === "dblclick") {
            clearPendingClick();

            const source = isShift ? "shiftmousedbclick" : "mousedbclick";
            const hit = getHistogramIntersection(event, painter, source);
            if (!hit) return;
            painter.intersectionHandler(hit, source);
        } else if (event.type === "pointermove" || event.type === "pointerover") {
            const hit = getHistogramIntersection(event, painter, "mousemove");
            if (!hit) {
                setHoveredBinFrameVisible(false);
                return;
            }

            setHoveredBinFrameVisible(binBoxEnabled);
            painter.intersectionHandler(hit, "mousemove");
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
                        clearNestedHistogramFunctions(id);

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
                                    mesh?.position?.set(0, 0, 0);

                                    jsrootBaseBounds.current = getObjectBounds(mesh);

                                    const configuredBounds = getHistogramPadBounds(
                                        configSubjectGet().getValue(),
                                        id
                                    );
                                    if (configuredBounds) {
                                        applyJsrootMeshBounds(
                                            mesh,
                                            getBoundingFramePosition(configuredBounds),
                                            getBoundingFrameScale(configuredBounds)
                                        );
                                    }

                                    setJsrootMesh(mesh);
                                    setPainterLimits(
                                        configuredBounds ?? getObjectPainterLimits(mesh)
                                    );
                                    setJsrootError(null);
                                })
                                .catch((e: any) => {
                                    console.log(e);
                                    setPainterLimits(null);
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
                                    mesh?.position?.set(0, 0, 0);

                                    jsrootBaseBounds.current = getObjectBounds(mesh);

                                    const configuredBounds = getHistogramPadBounds(
                                        configSubjectGet().getValue(),
                                        id
                                    );
                                    if (configuredBounds) {
                                        applyJsrootMeshBounds(
                                            mesh,
                                            getBoundingFramePosition(configuredBounds),
                                            getBoundingFrameScale(configuredBounds)
                                        );
                                    }

                                    setJsrootMesh(mesh);
                                    setPainterLimits(
                                        configuredBounds ?? getObjectPainterLimits(mesh)
                                    );
                                    setJsrootError(null);
                                })
                                .catch((e: any) => {
                                    console.log(e);
                                    setPainterLimits(null);
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
                            installNestedPainterMeshSync(nestedHistogram.current);
                            nestedHistogram.current.updateHistogram(histo).then(() => {
                                syncNestedPainterObjects(nestedHistogram.current);

                                console.log("[HistogramWrapper] UPDATE:", nestedHistogram.current);
                            });
                        } else {
                            // Core subscribes to retained pad state before creating its mesh.
                            // Clear constructor-unsafe state while retaining valid draw choices.
                            prepareHistogramPadState(id, histo);
                            const painter = new THnPainter(histo, id, histo?.opts);
                            nestedHistogram.current = painter;
                            installNestedPainterMeshSync(painter);

                            painter.renderHistogram(0, painter.totalInstances, 0).then(() => {
                                syncNestedPainterObjects(painter);

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
            clearNestedHistogramFunctions(id);
            clearJsrootMesh();
            clearNestedMeshes();
        };
    }, [applyJsrootMeshBounds, camera, id, installNestedPainterMeshSync, syncNestedPainterObjects]);

    return (
        <group onPointerDown={() => activateHistogramPad(id)}>
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
                    onPointerUp={raycastHandler}
                    onPointerOver={raycastHandler}
                    onPointerMove={raycastHandler}
                    onPointerOut={clearHoveredBinFrame}
                />
            )}

            {wireframeObj && <primitive object={wireframeObj} />}

            {painterLimits && activeMode === "modify" && (
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
        </group>
    );
}
