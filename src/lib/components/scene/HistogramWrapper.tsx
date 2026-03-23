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
    THnPainter,
} from "@ndmspc/ndmvr-core";
import { vector3ToArray } from "../../utils/helper-functions.ts";
import { useSceneModeStore } from "../../stores/sceneMode/store.ts";
import BoundingFrameBox from "./BoundingFrameBox";

export interface HistogramWrapperProps {
    id: string;
}

export default function HistogramWrapper({id}: HistogramWrapperProps) {
    const { scene, camera, raycaster } = useThree();
    const jsrootHistogram = useRef(null);
    const nestedHistogram = useRef(null);
    const modifyModeEnabled = useSceneModeStore((state) => state.modifyModeEnabled);
    const setModifyModeEnabled = useSceneModeStore((state) => state.setModifyModeEnabled);
    const session = useXR((s) => s.session);
    const squeezeHeld = useRef(false);
    const [jsrootMesh, setJsrootMesh] = useState(null);
    const [jsrootError, setJsrootError] = useState(null);
    const [isJsrootRenderer, setIsJsrootRenderer] = useState(false);

    const [currentShiftStep, setCurrentShiftStep] = useState({x: 0, y: 0, z: 0});
    

    const [nestedMesh, setNestedMesh] = useState(null);
    const instMesh = useMemo(() => {
        if (nestedMesh === null) return null;
        nestedMesh.raycast = function (raycaster, intersects) {
            const painter = nestedHistogram.current;
            if (!painter) return;
            try {
                const res = painter.checkIntersectionBVH(raycaster.ray);
                const hit = res[0];
                if (hit) {
                    intersects.push({
                        ...hit,
                        point: hit.target,
                        object: this,
                    });
                }
            } catch (e) {
                console.error(e);
            }
        };
        return nestedMesh;
    }, [nestedMesh]);
    const meshRef = useRef(null);

    const [wireframeObj, setWireframeObj] = useState(null);
    const [painterLimits, setPainterLimits] = useState(null);
    const onBoundingBoxChange = (position: THREE.Vector3, scale: THREE.Vector3) => {
        if (isJsrootRenderer) return;

        setPainterLimits({
            position: position.clone(),
            scale: scale.clone(),
        });
    };

    const applyHistogramModification = useCallback(
        (position: THREE.Vector3, scale: THREE.Vector3) => {
            const currentConfig = configSubjectGet().getValue();
            if (!currentConfig) return;

            const newConfig = structuredClone(currentConfig);
            setCurrentShiftStep({
                x: newConfig.config?.environment?.shiftScale?.x ?? 10,
                y: newConfig.config?.environment?.shiftScale?.y ?? 10,
                z: newConfig.config?.environment?.shiftScale?.z ?? 10,
            });
            const pad = newConfig.config?.environment?.histogramPads?.find((p) => p.id === id);
            if (!pad) return;

            pad.position = { x: position.x, y: position.y, z: position.z };
            pad.scale = { x: scale.x, y: scale.y, z: scale.z };

            configSubjectGet().next(newConfig);
        },
        [id]
    );


    const onBoundingBoxDragEnd = (position: THREE.Vector3, scale: THREE.Vector3) => {
        if (isJsrootRenderer) return;

        console.log("Config changed from Wrapper:   ", position, scale);
        applyHistogramModification(position.clone(), scale.clone());
    };

    useEffect(() => {
        if (isJsrootRenderer && modifyModeEnabled) {
            setModifyModeEnabled(false);
        }
    }, [isJsrootRenderer, modifyModeEnabled, setModifyModeEnabled]);

    const disposeThree = (obj) => {
        if (!obj) return;
        const disposeOne = (o) => {
            if (o.geometry) o.geometry.dispose?.();
            if (o.material) {
                if (Array.isArray(o.material)) o.material.forEach((m) => m?.dispose?.());
                else o.material.dispose?.();
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

    useEffect(() => {

        return () => {
            nestedHistogram.current?.remove();
            jsrootHistogram.current?.remove();
        };
    }, [scene]);

    // Track VR squeeze as modifier (like Shift on desktop)
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

    const clickTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    function raycastHandler(event) {
        const painter = nestedHistogram.current;
        if (!painter) return;

        // Skip if a closer object (e.g. UI panel) was hit first
        if (event.intersections[0]?.object !== event.object) return;

        console.log(`[HistogramWrapper] Raycatst event: ${event.type}, shift/squeeze: ${event.nativeEvent?.shiftKey || squeezeHeld.current}`);

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
        } else if (event.type === "pointermove") {
            painter.intersectionHandler(event, "mousemove");
        }
    }

    useEffect(() => {
        console.log(`[HistogramWrapper] Subscribing to histogram ${id} updates`);
        const histoSub = histogramSubjectGet()
            .getStream(id)
            .pipe(filter((e) => (e as { id: string | number }).id === id))
            .subscribe((histo) => {
                try {
                    const isJsroot = histo?.opts?.render === "jsroot";
                    setIsJsrootRenderer(isJsroot);

                    if (histo?.opts?.render === "jsroot") {
                        setModifyModeEnabled(false);

                        if (nestedHistogram.current) {
                            console.log("remove v jsroot");
                            nestedHistogram.current.remove?.();
                            nestedHistogram.current = undefined;
                        }
                        clearNestedMeshes();
                        setJsrootError(null);

                        if (jsrootHistogram.current) {
                            jsrootHistogram.current.updateHistogram(histo.obj);
                            jsrootHistogram.current.buildPromise
                                .then(() => {
                                    const mesh = jsrootHistogram.current.getHistogramMesh();
                                    // JSROOT mode ignores modify scale and always renders with unit scale.
                                    mesh?.scale?.set(1, 1, 1);
                                    setJsrootMesh(mesh);
                                    setJsrootError(null);
                                })
                                .catch((e) => {
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
                                    // JSROOT mode ignores modify scale and always renders with unit scale.
                                    mesh?.scale?.set(1, 1, 1);
                                    setJsrootMesh(mesh);
                                    setJsrootError(null);
                                })
                                .catch((e) => {
                                    console.log(e);
                                    setJsrootError(e);
                                });
                        }
                    }
                    else {
                        if (jsrootHistogram.current) {
                            jsrootHistogram.current.remove?.();
                            jsrootHistogram.current = undefined;
                        }
                        clearJsrootMesh();


                        if (nestedHistogram.current) {
                            nestedHistogram.current.updateHistogram(histo).then(() => {
                                // Update painter limits when histogram is updated
                                setPainterLimits(nestedHistogram.current.limits);
                                // nestedHistogram.current.remove();
                                // nestedHistogram.current = undefined;
                                console.log("[HistogramWrapper] UPDATE: ", name, nestedHistogram.current);
                            });
                        } else {
                            const painter = new THnPainter(histo, id, histo?.opts);

                            painter.renderHistogram(0, painter.totalInstances, 0).then(() => {
                                nestedHistogram.current = painter;

                                setNestedMesh(() => painter.mesh);
                                setWireframeObj(() => painter.wireframe.wireframe);
                                setPainterLimits(painter.limits);
                                console.log("[HistogramWrapper] NEW:", name, painter);
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
    }, [id]);

    return (
        <>
            <group>
                {
                    <Text
                        position={vector3ToArray(jsrootError?.position)}
                        fontSize={0.5}
                        color="red"
                        visible={jsrootError !== null}
                    >
                        Object cannot be rendered
                    </Text>
                }

                {jsrootMesh && (
                    <primitive
                        key={jsrootMesh.uuid}
                        object={jsrootMesh}
                        onPointerMove={() => {
                            (raycaster as any)._triggerSource = "mousemove";
                        }}
                        onClick={(e) => {
                            const isShift = e.nativeEvent?.shiftKey || squeezeHeld.current;
                            (raycaster as any)._triggerSource = isShift ? "shiftmouseclick" : "mouseclick";
                        }}
                        onDoubleClick={(e) => {
                            const isShift = e.nativeEvent?.shiftKey || squeezeHeld.current;
                            (raycaster as any)._triggerSource = isShift ? "shiftmousedbclick" : "mousedbclick";
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
                    onPointerMove={raycastHandler}
                />
            )}
            {wireframeObj && <primitive object={wireframeObj} />}
            {painterLimits && modifyModeEnabled && !isJsrootRenderer && (
                <BoundingFrameBox
                    position={new THREE.Vector3(
                        painterLimits.position?.x ?? 0,
                        painterLimits.position?.y ?? 0,
                        painterLimits.position?.z ?? 0
                    )}
                    scale={new THREE.Vector3(
                        painterLimits.scale?.x ?? 2,
                        painterLimits.scale?.y ?? 2,
                        painterLimits.scale?.z ?? 2
                    )}
                    shiftScaleStep={currentShiftStep}
                    onChange={onBoundingBoxChange}
                    onDragEnd={onBoundingBoxDragEnd}
                />
            )}
        </>
    );
}
