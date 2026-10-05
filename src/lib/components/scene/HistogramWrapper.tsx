import { isInputBlocked } from "../../interactions/input/useInputBinding";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import { filter } from "rxjs";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { useXR } from "@react-three/xr";
import {
    configSubjectGet,
    HistogramJsrootClass,
    type HistogramData,
    histogramSubjectGet,
    functionSubjectGet,
    THnPainter,
    binInfoSubjectGet,
} from "@ndmspc/ndmvr-core";
import { vector3ToArray } from "../../utils/vector3-to-array.ts";
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
import { activateHistogramPad, prepareHistogramPadState } from "../../stores/histogramWorkspace";

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

type HistogramPointerEvent = ThreeEvent<MouseEvent | PointerEvent> & {
    intersection?: unknown;
    raycaster?: THREE.Raycaster;
};

type SyncablePainter = THnPainter & {
    _ndmvrMeshSyncInstalled?: boolean;
};
type HistogramCleanup = Partial<
    Pick<
        THnPainter,
        | "functionSub"
        | "configSub"
        | "dispatchSub"
        | "stateSub"
        | "keyDownHandler"
        | "keyUpHandler"
        | "wireframe"
        | "mesh"
        | "remove"
    >
> &
    Partial<Pick<HistogramJsrootClass, "sub" | "dummyEl" | "binInfoComponent" | "histogramGroup">>;
type DisposableObject = THREE.Object3D & {
    geometry?: THREE.BufferGeometry;
    material?: THREE.Material | THREE.Material[];
};

const CLICK_DELAY_MS = 300;
const XR_SYNTHETIC_CLICK_SUPPRESSION_MS = CLICK_DELAY_MS;

function disposeThree(obj: THREE.Object3D | null | undefined, disposed = new Set<object>()) {
    if (!obj) return;
    const disposeResource = (resource: { dispose(): void } | undefined) => {
        if (!resource || disposed.has(resource)) return;
        disposed.add(resource);
        resource.dispose?.();
    };
    const disposeOne = (object: DisposableObject) => {
        disposeResource(object.geometry);
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(disposeResource);
    };
    if (obj.traverse) obj.traverse(disposeOne);
    else disposeOne(obj);
}

function cleanupHistogramFallbacks(
    histogram: HistogramCleanup,
    label: string,
    dummyEl = histogram.dummyEl
) {
    if (!histogram) return;
    const attempt = (cleanup: () => void) => {
        try {
            cleanup();
        } catch (error) {
            console.warn(`[HistogramWrapper] Failed to clean ${label}:`, error);
        }
    };

    // Core removal can throw on detached objects before reaching these subscriptions.
    for (const key of ["functionSub", "configSub", "dispatchSub", "stateSub", "sub"] as const) {
        attempt(() => histogram[key]?.unsubscribe?.());
    }
    if (histogram.keyDownHandler)
        attempt(() => window.removeEventListener("keydown", histogram.keyDownHandler!));
    if (histogram.keyUpHandler) {
        attempt(() => window.removeEventListener("keydown", histogram.keyUpHandler!));
        attempt(() => window.removeEventListener("keyup", histogram.keyUpHandler!));
    }
    // Remove only this instance's element; a replacement can reuse its DOM id.
    attempt(() => dummyEl?.parentNode?.removeChild(dummyEl));

    const binInfo = histogram.binInfoComponent;
    attempt(() => binInfo?.dispose?.());
    attempt(() => binInfo?.queueSub?.unsubscribe?.());
    attempt(() => histogram.wireframe?.stateSub?.unsubscribe?.());

    const disposed = new Set<object>();
    for (const object of [
        histogram.histogramGroup,
        histogram.mesh,
        histogram.wireframe?.wireframe,
        binInfo?.group,
    ]) {
        attempt(() => object?.parent?.remove(object));
        attempt(() => disposeThree(object, disposed));
    }
}

function setRaycasterTriggerSource(raycaster: THREE.Raycaster, source: string) {
    (raycaster as SourceRaycaster)._triggerSource = source;
}

function hasHistogramIntersectionPayload(value: unknown): value is HistogramIntersection {
    const intersection = value as HistogramIntersection | undefined;
    return Array.isArray(intersection?.index) && Array.isArray(intersection?.range);
}

function getHistogramIntersection(
    event: HistogramPointerEvent,
    painter: THnPainter,
    triggerSource: string
) {
    const intersections: THREE.Intersection[] = Array.isArray(event?.intersections)
        ? event.intersections
        : [];
    const eventObject = event?.object;

    const matchingHit = intersections.find(
        (intersection): intersection is HistogramIntersection => {
            return (
                intersection?.object === eventObject &&
                hasHistogramIntersectionPayload(intersection)
            );
        }
    );
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
    const bvhHit: unknown = ray ? painter.checkIntersectionBVH?.(ray)?.[0] : null;

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
    const jsrootHistogram = useRef<HistogramJsrootClass | null>(null);
    // JSROOT needs the untransformed mesh bounds so drag-end scaling can be applied correctly.
    const jsrootBaseBounds = useRef<ObjectBounds | null>(null);
    const nestedHistogram = useRef<SyncablePainter | null>(null);
    const retiredPainters = useRef(new WeakSet<object>());
    const pendingPainters = useRef(new WeakSet<object>());
    const jsrootMeshObject = useRef<THREE.Object3D | null>(null);

    const activeMode = useSceneModeStore((state) => state.activeMode);
    const getActiveConfigHistogramEvents = useSceneModeStore(
        (state) => state.modesConfig[state.activeMode]?.histogramEvents
    );
    const binBoxEnabled = useSceneModeStore((state) => state.binBoxEnabled);

    const session = useXR((s) => s.session);
    const squeezeHeld = useRef(false);

    const [jsrootMesh, setJsrootMesh] = useState<THREE.Group | null>(null);
    const [jsrootError, setJsrootError] = useState<unknown>(null);
    const [isJsrootRenderer, setIsJsrootRenderer] = useState(false);
    const [currentShiftStep, setCurrentShiftStep] = useState(() =>
        getShiftScaleStep(configSubjectGet().getValue())
    );

    const [nestedMesh, setNestedMesh] = useState<THREE.InstancedMesh | null>(null);
    const [wireframeObj, setWireframeObj] = useState<THREE.Object3D | null>(null);
    const [painterLimits, setPainterLimits] = useState<PainterLimits | null>(null);
    const nestedMeshObject = useRef<THREE.Object3D | null>(null);
    const wireframeObject = useRef<THREE.Object3D | null>(null);
    const syncedWireframe = useRef<THnPainter["wireframe"] | null>(null);

    const clickTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const clearPendingClick = useCallback(() => {
        if (clickTimeout.current !== null) clearTimeout(clickTimeout.current);
        clickTimeout.current = null;
    }, []);
    const lastXRTriggerRelease = useRef(0);

    const [hoveredBin, setHoveredBin] = useState<HoveredBinLike | null>(null);
    // Keep the last bin payload so re-entering the same bin can show the frame again.
    const [hoveredBinFrameVisible, setHoveredBinFrameVisible] = useState(false);

    const applyJsrootMeshBounds = useCallback(
        (
            mesh: THREE.Object3D | null | undefined,
            position: THREE.Vector3,
            scale: THREE.Vector3
        ) => {
            applyObjectBoundsTransform(mesh, jsrootBaseBounds.current, position, scale);
        },
        []
    );

    const isCurrentNestedPainter = useCallback(
        (painter: SyncablePainter | null | undefined) =>
            !!painter &&
            nestedHistogram.current === painter &&
            !retiredPainters.current.has(painter),
        []
    );

    const syncNestedPainterObjects = useCallback(
        (painter: SyncablePainter) => {
            if (!isCurrentNestedPainter(painter) || pendingPainters.current.has(painter)) return;
            const mesh = painter?.mesh ?? null;
            const wireframe = painter?.wireframe?.wireframe ?? null;

            if (syncedWireframe.current && syncedWireframe.current !== painter.wireframe) {
                // Core replaces this helper without releasing its state subscription/material.
                syncedWireframe.current.stateSub?.unsubscribe?.();
                disposeThree(wireframeObject.current);
            }
            syncedWireframe.current = painter.wireframe;

            if (nestedMeshObject.current !== mesh) {
                // Redraws replace the mesh but reuse its material (and sometimes geometry).
                const reused = new Set<object>([
                    mesh.geometry,
                    ...(Array.isArray(mesh.material) ? mesh.material : [mesh.material]),
                ]);
                disposeThree(nestedMeshObject.current, reused);
                mesh?.parent?.remove(mesh);
                nestedMeshObject.current = mesh;
                mesh.raycast = function (
                    raycasterArg: THREE.Raycaster,
                    intersects: THREE.Intersection[]
                ) {
                    if (
                        !isCurrentNestedPainter(painter) ||
                        nestedMeshObject.current !== mesh ||
                        pendingPainters.current.has(painter)
                    )
                        return;
                    try {
                        const hit = painter.checkIntersectionBVH(raycasterArg.ray)?.[0];
                        if (hit) {
                            intersects.push({
                                ...hit,
                                point: hit.target,
                                object: this,
                            } as THREE.Intersection);
                        }
                    } catch (error) {
                        console.error(error);
                    }
                };
                setNestedMesh(() => mesh);
            }

            if (wireframeObject.current !== wireframe) {
                wireframe?.parent?.remove(wireframe);
                wireframeObject.current = wireframe;
                setWireframeObj(() => wireframe);
            }

            setPainterLimits(painter?.limits ?? null);
        },
        [isCurrentNestedPainter]
    );

    const installNestedPainterMeshSync = useCallback(
        (painter: SyncablePainter | null | undefined) => {
            if (!painter || painter._ndmvrMeshSyncInstalled) return;

            const originalPushVisibleInstances = painter.pushVisibleInstances?.bind(painter);
            if (typeof originalPushVisibleInstances !== "function") return;

            painter.pushVisibleInstances = () => {
                if (!isCurrentNestedPainter(painter)) return;
                const result = originalPushVisibleInstances();
                syncNestedPainterObjects(painter);
                return result;
            };
            painter._ndmvrMeshSyncInstalled = true;
        },
        [isCurrentNestedPainter, syncNestedPainterObjects]
    );

    useEffect(() => {
        const subscription = configSubjectGet()
            .getObservable()
            .subscribe((config) => setCurrentShiftStep(getShiftScaleStep(config)));

        return () => subscription.unsubscribe();
    }, []);

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

            if (!currentConfig) return;

            const newConfig = structuredClone(currentConfig);

            const changed = applyHistogramPadBounds(newConfig, id, position, scale);
            if (!changed) return;

            configSubjectGet().next(newConfig);
        },
        [id]
    );

    useEffect(() => {
        if (
            !nestedMesh ||
            nestedMeshObject.current !== nestedMesh ||
            !isCurrentNestedPainter(nestedHistogram.current)
        )
            return;

        const target = {
            entity: "nested-histogram",
            id: id,
        };

        if (!activeMode) {
            return;
        }

        const modeConfig = getActiveConfigHistogramEvents;
        if (!modeConfig) {
            return;
        }

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
            functionSubjectGet().addFunctions(functionsToAdd);
        }
    }, [activeMode, getActiveConfigHistogramEvents, id, isCurrentNestedPainter, nestedMesh]);

    const onBoundingBoxDragEnd = (position: THREE.Vector3, scale: THREE.Vector3) => {
        if (isJsrootRenderer) {
            applyJsrootMeshBounds(jsrootMesh, position, scale);
            setPainterLimits(clonePainterLimits(position, scale));
        }

        applyHistogramModification(position.clone(), scale.clone());
    };

    const clearJsrootMesh = useCallback(() => {
        disposeThree(jsrootMeshObject.current);
        jsrootMeshObject.current = null;
        setJsrootMesh(null);
        jsrootBaseBounds.current = null;
        setPainterLimits(null);
    }, []);

    const clearNestedMeshes = useCallback(() => {
        const disposed = new Set<object>();
        disposeThree(nestedMeshObject.current, disposed);
        disposeThree(wireframeObject.current, disposed);
        syncedWireframe.current?.stateSub?.unsubscribe?.();

        syncedWireframe.current = null;
        nestedMeshObject.current = null;
        wireframeObject.current = null;
        setNestedMesh(null);
        setWireframeObj(null);
        setPainterLimits(null);
    }, []);

    const safeRemoveHistogram = useCallback((histogram: HistogramCleanup | null, label: string) => {
        if (!histogram || retiredPainters.current.has(histogram)) return;
        retiredPainters.current.add(histogram);
        const dummyEl = histogram.dummyEl;
        try {
            histogram.remove?.();
        } catch (e) {
            console.warn(`[HistogramWrapper] Failed to remove ${label}:`, e);
        } finally {
            cleanupHistogramFallbacks(histogram, label, dummyEl);
        }
    }, []);

    useEffect(() => {
        const sources = new Set<XRInputSource>();
        const onSqueezeStart = (event: XRInputSourceEvent) => {
            if (isInputBlocked() || document.hidden || session?.visibilityState !== "visible")
                return;
            sources.add(event.inputSource);
            squeezeHeld.current = true;
        };
        const onSqueezeEnd = (event: XRInputSourceEvent) => {
            sources.delete(event.inputSource);
            squeezeHeld.current = sources.size > 0;
        };
        const cancel = () => {
            sources.clear();
            squeezeHeld.current = false;
            clearPendingClick();
        };
        const block = () => {
            if (
                isInputBlocked() ||
                document.hidden ||
                (session && session.visibilityState !== "visible")
            )
                cancel();
        };
        const sourcesChanged = () => {
            for (const source of sources) {
                if (!Array.from(session?.inputSources ?? []).includes(source))
                    sources.delete(source);
            }
            squeezeHeld.current = sources.size > 0;
            clearPendingClick();
        };

        session?.addEventListener("squeezestart", onSqueezeStart);
        session?.addEventListener("squeezeend", onSqueezeEnd);
        session?.addEventListener("end", cancel);
        session?.addEventListener("inputsourceschange", sourcesChanged);
        session?.addEventListener("visibilitychange", block);
        window.addEventListener("blur", cancel);
        document.addEventListener("focusin", block);
        document.addEventListener("visibilitychange", block);

        return () => {
            session?.removeEventListener("squeezestart", onSqueezeStart);
            session?.removeEventListener("squeezeend", onSqueezeEnd);
            session?.removeEventListener("end", cancel);
            session?.removeEventListener("inputsourceschange", sourcesChanged);
            session?.removeEventListener("visibilitychange", block);
            window.removeEventListener("blur", cancel);
            document.removeEventListener("focusin", block);
            document.removeEventListener("visibilitychange", block);
            cancel();
        };
    }, [clearPendingClick, session]);

    function scheduleSingleClick(
        painter: SyncablePainter,
        hit: HistogramIntersection,
        source: string
    ) {
        clearPendingClick();

        clickTimeout.current = setTimeout(() => {
            clickTimeout.current = null;
            if (
                !isCurrentNestedPainter(painter) ||
                pendingPainters.current.has(painter) ||
                isInputBlocked() ||
                document.hidden
            )
                return;
            painter.intersectionHandler(hit, source);
        }, CLICK_DELAY_MS);
    }

    function raycastHandler(event: HistogramPointerEvent) {
        if (isInputBlocked()) return;
        const painter = nestedHistogram.current;
        if (
            !painter ||
            !isCurrentNestedPainter(painter) ||
            pendingPainters.current.has(painter) ||
            event.object !== nestedMeshObject.current
        )
            return;

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

    function clearHoveredBinFrame(event: ThreeEvent<PointerEvent>) {
        if (hasBlockingIntersectionForObject(event.intersections, event.object)) {
            return;
        }

        // Hide only the frame; keep hoveredBin cached for same-bin re-entry.
        setHoveredBinFrameVisible(false);
    }

    useEffect(() => {
        let active = true;
        let revision = 0;
        const isCurrentOperation = (
            painter: HistogramJsrootClass | SyncablePainter,
            operation: number,
            jsroot: boolean
        ) =>
            active &&
            revision === operation &&
            !retiredPainters.current.has(painter) &&
            (jsroot ? jsrootHistogram.current : nestedHistogram.current) === painter;

        const retireNested = () => {
            const painter = nestedHistogram.current;
            nestedHistogram.current = null;
            safeRemoveHistogram(painter, "nested histogram");
            clearNestedMeshes();
        };
        const retireJsroot = () => {
            const painter = jsrootHistogram.current;
            jsrootHistogram.current = null;
            safeRemoveHistogram(painter, "JSRoot histogram");
            clearJsrootMesh();
        };

        const histoSub = histogramSubjectGet()
            .getStream(id)
            .pipe(filter((e) => (e as { id: string | number }).id === id))
            .subscribe((histo: HistogramData) => {
                clearPendingClick();
                const operation = ++revision;
                try {
                    const isJsroot = histo?.opts?.render === "jsroot";
                    setIsJsrootRenderer(isJsroot);

                    if (isJsroot) {
                        clearNestedHistogramFunctions(id);
                        retireNested();
                        setJsrootError(null);

                        // Core mutates a shared group before its build promise settles.
                        // Replacing an in-flight instance prevents overlapping builds from
                        // appending stale objects to the currently displayed group.
                        if (
                            jsrootHistogram.current &&
                            pendingPainters.current.has(jsrootHistogram.current)
                        ) {
                            retireJsroot();
                        }
                        if (jsrootHistogram.current) {
                            // updateHistogram clears the group without disposing its old children.
                            disposeThree(jsrootMeshObject.current);
                            jsrootHistogram.current.updateHistogram(histo.obj);
                        } else {
                            jsrootHistogram.current = new HistogramJsrootClass(
                                id,
                                histo.obj,
                                camera
                            );
                        }
                        const painter = jsrootHistogram.current;
                        const buildPromise = painter.buildPromise;
                        pendingPainters.current.add(painter);
                        Promise.resolve(buildPromise)
                            .then(() => {
                                if (!isCurrentOperation(painter, operation, true)) return;
                                const mesh = painter.getHistogramMesh();
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
                                jsrootMeshObject.current = mesh;
                                setJsrootMesh(mesh);
                                setPainterLimits(configuredBounds ?? getObjectPainterLimits(mesh));
                                setJsrootError(null);
                            })
                            .catch((error: unknown) => {
                                if (!isCurrentOperation(painter, operation, true)) return;
                                console.log(error);
                                setPainterLimits(null);
                                setJsrootError(error);
                            })
                            .finally(() => {
                                pendingPainters.current.delete(painter);
                                if (retiredPainters.current.has(painter)) {
                                    // Core can create objects after remove(); never call remove twice.
                                    cleanupHistogramFallbacks(painter, "retired JSRoot histogram");
                                }
                            });
                    } else {
                        retireJsroot();
                        setJsrootError(null);
                        // Core's update requires attached objects and cannot cancel a
                        // previous render. Keep the settled update path; retire unfinished
                        // or detached instances before starting the next operation.
                        if (
                            nestedHistogram.current &&
                            (pendingPainters.current.has(nestedHistogram.current) ||
                                !nestedHistogram.current.mesh?.parent ||
                                !nestedHistogram.current.wireframe?.wireframe?.parent)
                        ) {
                            retireNested();
                        }
                        const updating = !!nestedHistogram.current;
                        if (!updating) {
                            // Core subscribes to retained pad state before creating its mesh.
                            // Clear constructor-unsafe state while retaining valid draw choices.
                            prepareHistogramPadState(id, histo);
                            nestedHistogram.current = new THnPainter(histo, id, histo?.opts);
                        }
                        const painter = nestedHistogram.current!;
                        installNestedPainterMeshSync(painter);
                        pendingPainters.current.add(painter);
                        const previousWireframe = updating ? painter.wireframe : null;
                        let renderPromise;
                        try {
                            renderPromise = updating
                                ? painter.updateHistogram(histo)
                                : painter.renderHistogram(0, painter.totalInstances, 0);
                        } catch (error) {
                            // Handle synchronous failures through the same owned operation.
                            renderPromise = Promise.reject(error);
                        } finally {
                            if (previousWireframe && previousWireframe !== painter.wireframe) {
                                previousWireframe.stateSub?.unsubscribe?.();
                                disposeThree(previousWireframe.wireframe);
                            }
                        }
                        Promise.resolve(renderPromise)
                            .then(() => {
                                if (!isCurrentOperation(painter, operation, false)) return;
                                pendingPainters.current.delete(painter);
                                syncNestedPainterObjects(painter);
                            })
                            .catch((error: unknown) => {
                                if (!isCurrentOperation(painter, operation, false)) return;
                                console.warn(
                                    "[HistogramWrapper] Failed to render nested histogram:",
                                    error
                                );
                                clearNestedHistogramFunctions(id);
                                retireNested();
                            })
                            .finally(() => {
                                pendingPainters.current.delete(painter);
                                if (retiredPainters.current.has(painter)) {
                                    cleanupHistogramFallbacks(painter, "retired nested histogram");
                                }
                            });
                    }
                } catch (e) {
                    console.log(e);
                    retireNested();
                    retireJsroot();
                }
            });

        return () => {
            active = false;
            ++revision;
            histoSub.unsubscribe();
            clearPendingClick();
            clearNestedHistogramFunctions(id);
            retireNested();
            retireJsroot();
        };
    }, [
        applyJsrootMeshBounds,
        camera,
        scene,
        id,
        installNestedPainterMeshSync,
        syncNestedPainterObjects,
        clearPendingClick,
        clearJsrootMesh,
        clearNestedMeshes,
        safeRemoveHistogram,
    ]);

    return (
        <group onPointerDown={() => activateHistogramPad(id)}>
            <group>
                <Text
                    position={vector3ToArray(
                        (jsrootError as { position?: THREE.Vector3 } | null)?.position
                    )}
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
                            if (isInputBlocked()) return;
                            setRaycasterTriggerSource(raycaster, "mousemove");
                        }}
                        onClick={(e) => {
                            if (isInputBlocked()) return;
                            const isShift = e.nativeEvent?.shiftKey || squeezeHeld.current;
                            setRaycasterTriggerSource(
                                raycaster,
                                isShift ? "shiftmouseclick" : "mouseclick"
                            );
                        }}
                        onDoubleClick={(e) => {
                            if (isInputBlocked()) return;
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
                    object={nestedMesh}
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
