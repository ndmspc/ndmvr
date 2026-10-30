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
  stateSubjectGet,
} from "@ndmspc/ndmvr-core";
import { vector3ToArray } from "../../utils/vector3-to-array.ts";
import { histogramEvents, useSceneModeStore } from "../../stores/sceneMode/store.ts";
import BoundingFrameBox from "./BoundingFrameBox";
import BinBox from "./BinBox";
import { disableRaycast } from "./bin-box/bin-box-style";
import {
  applyObjectBoundsTransform,
  clonePainterLimits,
  getBoundingFramePosition,
  getBoundingFrameScale,
  getHistogramPadBounds,
  getObjectBounds,
  getObjectPainterLimits,
  getResizedHistogramPadBounds,
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
  set?: string;
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
const CLICK_DELAY_MS = 300;
const XR_SYNTHETIC_CLICK_SUPPRESSION_MS = CLICK_DELAY_MS;

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
  triggerSource: string,
) {
  const intersections: THREE.Intersection[] = Array.isArray(event?.intersections)
    ? event.intersections
    : [];
  const eventObject = event?.object;

  const matchingHit = intersections.find((intersection): intersection is HistogramIntersection => {
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

function syncHistogramAxesVisibility(painter: THnPainter) {
  const config = configSubjectGet().mergeHistogramConfig(painter.opts?.config);
  const axes = config.axes as { enabled?: boolean } | undefined;
  painter.axes.axes.visible = axes?.enabled !== false;
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
  const OVERLAY_OPACITY = 0.4;

  const activeMode = useSceneModeStore((state) => state.activeMode);
  const getActiveConfigHistogramEvents = useSceneModeStore(
    (state) => state.modesConfig[state.activeMode]?.histogramEvents,
  );
  const binBoxEnabled = useSceneModeStore((state) => state.binBoxEnabled);

  const session = useXR((s) => s.session);
  const squeezeHeld = useRef(false);

  const [jsrootMesh, setJsrootMesh] = useState<THREE.Group | null>(null);
  const [jsrootError, setJsrootError] = useState<unknown>(null);
  const [isJsrootRenderer, setIsJsrootRenderer] = useState(false);
  const [currentShiftStep, setCurrentShiftStep] = useState(() =>
    getShiftScaleStep(configSubjectGet().getValue()),
  );

  const [nestedMesh, setNestedMesh] = useState<THREE.InstancedMesh | null>(null);
  const [wireframeObj, setWireframeObj] = useState<THREE.Object3D | null>(null);
  const [axesObj, setAxesObj] = useState<THREE.Object3D | null>(null);
  const [painterLimits, setPainterLimits] = useState<PainterLimits | null>(null);
  const resizeBounds = useRef<{ pad: PainterLimits; frame: PainterLimits } | null>(null);
  const nestedMeshObject = useRef<THREE.Object3D | null>(null);
  const wireframeObject = useRef<THREE.Object3D | null>(null);
  const binHoverOverlay = useRef<THREE.Mesh>(null);
  const hideBinHoverOverlay = useCallback(() => {
    if (binHoverOverlay.current) binHoverOverlay.current.visible = false;
  }, []);

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
    (mesh: THREE.Object3D | null | undefined, position: THREE.Vector3, scale: THREE.Vector3) => {
      applyObjectBoundsTransform(mesh, jsrootBaseBounds.current, position, scale);
    },
    [],
  );

  // Subscribe after the JSROOT painter so its config handler cannot undo centering.
  useEffect(() => {
    if (!jsrootMesh) return;
    const subscription = configSubjectGet()
      .getObservable()
      .subscribe((config) => {
        if (
          jsrootMeshObject.current !== jsrootMesh ||
          pendingPainters.current.has(jsrootHistogram.current)
        )
          return;
        const bounds = getHistogramPadBounds(config, id);
        if (!bounds) return;
        applyJsrootMeshBounds(
          jsrootMesh,
          getBoundingFramePosition(bounds),
          getBoundingFrameScale(bounds),
        );
        setPainterLimits(bounds);
      });
    return () => subscription.unsubscribe();
  }, [applyJsrootMeshBounds, id, jsrootMesh]);

  const isCurrentNestedPainter = useCallback(
    (painter: SyncablePainter | null | undefined) =>
      !!painter && nestedHistogram.current === painter && !retiredPainters.current.has(painter),
    [],
  );

  const syncNestedPainterObjects = useCallback(
    (painter: SyncablePainter) => {
      if (!isCurrentNestedPainter(painter) || pendingPainters.current.has(painter)) return;
      const mesh = painter?.mesh ?? null;
      const wireframe = painter?.wireframe?.wireframe ?? null;

      if (nestedMeshObject.current !== mesh) {
        hideBinHoverOverlay();
        mesh?.parent?.remove(mesh);
        nestedMeshObject.current = mesh;
        if (mesh)
          mesh.raycast = function (
            raycasterArg: THREE.Raycaster,
            intersects: THREE.Intersection[],
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
      // Core keeps this group stable while its asynchronous builds replace children.
      syncHistogramAxesVisibility(painter);
      setAxesObj(painter.axes?.axes ?? null);
    },
    [hideBinHoverOverlay, isCurrentNestedPainter],
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
    [isCurrentNestedPainter, syncNestedPainterObjects],
  );

  useEffect(() => {
    const subscription = configSubjectGet()
      .getObservable()
      .subscribe((config) => {
        setCurrentShiftStep(getShiftScaleStep(config));
        if (nestedHistogram.current) syncHistogramAxesVisibility(nestedHistogram.current);
      });

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

  const onBoundingBoxDragStart = (position: THREE.Vector3, scale: THREE.Vector3) => {
    const pad = getHistogramPadBounds(configSubjectGet().getValue(), id);
    resizeBounds.current = pad ? { pad, frame: clonePainterLimits(position, scale) } : null;
  };

  const applyHistogramModification = useCallback(
    (position: THREE.Vector3, scale: THREE.Vector3) => {
      configSubjectGet().updateHistogramPad(id, {
        position: { x: position.x, y: position.y, z: position.z },
        scale: { x: scale.x, y: scale.y, z: scale.z },
      });
    },
    [id],
  );

  useEffect(() => {
    hideBinHoverOverlay();
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
  }, [
    activeMode,
    getActiveConfigHistogramEvents,
    hideBinHoverOverlay,
    id,
    isCurrentNestedPainter,
    nestedMesh,
  ]);

  const onBoundingBoxDragEnd = (position: THREE.Vector3, scale: THREE.Vector3) => {
    const original = resizeBounds.current;
    resizeBounds.current = null;
    if (!original) return;
    const bounds = isJsrootRenderer
      ? clonePainterLimits(position, scale)
      : getResizedHistogramPadBounds(original.pad, original.frame, position, scale);
    applyHistogramModification(getBoundingFramePosition(bounds), getBoundingFrameScale(bounds));
  };

  const clearJsrootMesh = useCallback(() => {
    jsrootMeshObject.current = null;
    setJsrootMesh(null);
    jsrootBaseBounds.current = null;
    setPainterLimits(null);
  }, []);

  const clearNestedMeshes = useCallback(() => {
    hideBinHoverOverlay();
    nestedMeshObject.current = null;
    wireframeObject.current = null;
    setNestedMesh(null);
    setWireframeObj(null);
    setAxesObj(null);
    setPainterLimits(null);
  }, [hideBinHoverOverlay]);

  const safeRemoveHistogram = useCallback(
    (histogram: THnPainter | HistogramJsrootClass | null, label: string) => {
      if (!histogram || retiredPainters.current.has(histogram)) return;
      retiredPainters.current.add(histogram);
      try {
        histogram.remove();
      } catch (e) {
        console.warn(`[HistogramWrapper] Failed to remove ${label}:`, e);
      }
    },
    [],
  );

  useEffect(() => {
    const sources = new Set<XRInputSource>();
    const onSqueezeStart = (event: XRInputSourceEvent) => {
      if (isInputBlocked() || document.hidden || session?.visibilityState !== "visible") return;
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
      hideBinHoverOverlay();
    };
    const block = () => {
      if (isInputBlocked() || document.hidden || (session && session.visibilityState !== "visible"))
        cancel();
    };
    const sourcesChanged = () => {
      for (const source of sources) {
        if (!Array.from(session?.inputSources ?? []).includes(source)) sources.delete(source);
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
  }, [clearPendingClick, hideBinHoverOverlay, session]);

  function scheduleSingleClick(
    painter: SyncablePainter,
    hit: HistogramIntersection,
    source: string,
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
      hideBinHoverOverlay();
      painter.intersectionHandler(hit, source);
    }, CLICK_DELAY_MS);
  }

  function raycastHandler(event: HistogramPointerEvent) {
    if (isInputBlocked()) {
      hideBinHoverOverlay();
      return;
    }
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
      hideBinHoverOverlay();

      const source = isShift ? "shiftmousedbclick" : "mousedbclick";
      const hit = getHistogramIntersection(event, painter, source);
      if (!hit) return;
      painter.intersectionHandler(hit, source);
    } else if (event.type === "pointermove" || event.type === "pointerover") {
      hideBinHoverOverlay();
      const hit = getHistogramIntersection(event, painter, "mousemove");
      if (!hit) {
        setHoveredBinFrameVisible(false);
        return;
      }

      const overlay = binHoverOverlay.current;
      if (
        overlay &&
        getActiveConfigHistogramEvents?.mousemove != null &&
        blockingIntersection?.object === event.object &&
        painter.material.colorWrite &&
        Array.isArray(hit.instanceId)
      ) {
        // The cache already includes nested placement and content/error scaling.
        const { position, scale } = painter.getBinPosScaleByIndexMC(hit.instanceId, hit.set);
        if (
          position.length === 3 &&
          scale.length === 3 &&
          position.every(Number.isFinite) &&
          scale.every((value) => Number.isFinite(value) && value > 0)
        ) {
          overlay.position.fromArray(position);
          overlay.scale.fromArray(scale).multiplyScalar(1.001);
          overlay.visible = true;
        }
      }

      setHoveredBinFrameVisible(binBoxEnabled);
      painter.intersectionHandler(hit, "mousemove");
    }
  }

  function clearHoveredBinFrame(event: ThreeEvent<PointerEvent>) {
    hideBinHoverOverlay();
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
      jsroot: boolean,
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
        hideBinHoverOverlay();
        const operation = ++revision;
        try {
          const isJsroot = histo?.opts?.render === "jsroot";
          setIsJsrootRenderer(isJsroot);

          if (isJsroot) {
            clearNestedHistogramFunctions(id);
            retireNested();
            setJsrootError(null);

            if (jsrootHistogram.current) {
              jsrootHistogram.current.updateHistogram(histo.obj);
            } else {
              jsrootHistogram.current = new HistogramJsrootClass(id, histo.obj, camera);
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
                const configuredBounds = getHistogramPadBounds(configSubjectGet().getValue(), id);
                if (configuredBounds) {
                  applyJsrootMeshBounds(
                    mesh,
                    getBoundingFramePosition(configuredBounds),
                    getBoundingFrameScale(configuredBounds),
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
                const mesh = jsrootMeshObject.current;
                const configuredBounds = getHistogramPadBounds(configSubjectGet().getValue(), id);
                if (mesh && configuredBounds) {
                  applyJsrootMeshBounds(
                    mesh,
                    getBoundingFramePosition(configuredBounds),
                    getBoundingFrameScale(configuredBounds),
                  );
                }
                setPainterLimits(mesh ? (configuredBounds ?? getObjectPainterLimits(mesh)) : null);
                setJsrootError(error);
              })
              .finally(() => {
                if (isCurrentOperation(painter, operation, true))
                  pendingPainters.current.delete(painter);
              });
          } else {
            retireJsroot();
            setJsrootError(null);
            const updating = !!nestedHistogram.current;
            if (!updating) {
              // Normalize retained draw choices before constructing a new painter.
              const preparedState = prepareHistogramPadState(id, histo);
              const painter = new THnPainter(histo, id, histo?.opts);
              if (preparedState) {
                painter.selectedArray = preparedState.selectedArray;
                if (preparedState.selectedSet.length > 0) {
                  painter.selectedSet = preparedState.selectedSet;
                }
                Object.assign(stateSubjectGet(id).getValue(), {
                  selectedArray: painter.selectedArray,
                  selectedSet: painter.selectedSet,
                });
              }
              nestedHistogram.current = painter;
            }
            const painter = nestedHistogram.current!;
            installNestedPainterMeshSync(painter);
            pendingPainters.current.add(painter);
            let renderPromise;
            try {
              renderPromise = updating
                ? painter.updateHistogram(histo)
                : painter.renderHistogram(0, painter.totalInstances, 0);
            } catch (error) {
              // Handle synchronous failures through the same owned operation.
              renderPromise = Promise.reject(error);
            }
            Promise.resolve(renderPromise)
              .then(() => {
                if (!isCurrentOperation(painter, operation, false)) return;
                pendingPainters.current.delete(painter);
                syncNestedPainterObjects(painter);
              })
              .catch((error: unknown) => {
                if (!isCurrentOperation(painter, operation, false)) return;
                console.warn("[HistogramWrapper] Failed to render nested histogram:", error);
                clearNestedHistogramFunctions(id);
                retireNested();
              })
              .finally(() => {
                if (isCurrentOperation(painter, operation, false))
                  pendingPainters.current.delete(painter);
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
    hideBinHoverOverlay,
    clearJsrootMesh,
    clearNestedMeshes,
    safeRemoveHistogram,
  ]);

  return (
    <group onPointerDown={() => activateHistogramPad(id)}>
      <group>
        <Text
          position={vector3ToArray((jsrootError as { position?: THREE.Vector3 } | null)?.position)}
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
              setRaycasterTriggerSource(raycaster, isShift ? "shiftmouseclick" : "mouseclick");
            }}
            onDoubleClick={(e) => {
              if (isInputBlocked()) return;
              const isShift = e.nativeEvent?.shiftKey || squeezeHeld.current;
              setRaycasterTriggerSource(raycaster, isShift ? "shiftmousedbclick" : "mousedbclick");
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
      {axesObj && <primitive object={axesObj} />}

      <mesh ref={binHoverOverlay} visible={false} raycast={disableRaycast}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          color="white"
          transparent
          opacity={OVERLAY_OPACITY}
          depthWrite={false}
          toneMapped={false}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>

      {painterLimits && activeMode === "modify" && (
        <BoundingFrameBox
          position={getBoundingFramePosition(painterLimits)}
          scale={getBoundingFrameScale(painterLimits)}
          shiftScaleStep={currentShiftStep}
          onChange={onBoundingBoxChange}
          onDragStart={onBoundingBoxDragStart}
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
