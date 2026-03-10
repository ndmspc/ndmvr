import {useThree} from "@react-three/fiber";
import {useEffect, useCallback, useMemo, useRef, useState} from "react";
import {filter} from "rxjs";
import {Text} from "@react-three/drei";
import * as THREE from "three";
import {useXR} from "@react-three/xr";
import {
    configSubjectGet,
    HistogramJsrootClass,
    histogramSubjectGet,
    THnPainter,
} from "@ndmspc/ndmvr-core";
import {vector3ToArray} from "../../utils/helper-functions.ts";
import {useSceneModeStore} from "../../stores/sceneMode/store.ts";
import BoundingFrameBox from "./BoundingFrameBox";

export interface HistogramWrapperProps {
    id: string;
}

export default function HistogramWrapper({ id }: HistogramWrapperProps) {
    const { scene, camera } = useThree();
    const jsrootHistogram = useRef(null);
    const nestedHistogram = useRef(null);
    const modifyModeEnabled = useSceneModeStore((state) => state.modifyModeEnabled);
    const session = useXR((s) => s.session);
    const squeezeHeld = useRef(false);
    const [jsrootMesh, setJsrootMesh] = useState(null);
    const [jsrootError, setJsrootError] = useState(null);


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
        }
        return nestedMesh;
    }, [nestedMesh])
    const meshRef = useRef(null)

    const [wireframeObj, setWireframeObj] = useState(null);
    const [painterLimits, setPainterLimits] = useState(null);
    const onBoundingBoxChange = (position: THREE.Vector3, scale: THREE.Vector3) => {
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
            const pad = newConfig.config?.environment?.histogramPads?.find((p) => p.id === id);
            if (!pad) return;

            pad.position = { x: position.x, y: position.y, z: position.z };
            pad.scale = { x: scale.x, y: scale.y, z: scale.z };

            configSubjectGet().next(newConfig);
        },
        [id]
    );

    const onBoundingBoxDragEnd = (position: THREE.Vector3, scale: THREE.Vector3) => {
        console.log("Config changed from Wrapper:   ", position, scale);
        applyHistogramModification(position.clone(), scale.clone());
    };

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
        const onSqueezeStart = () => { squeezeHeld.current = true; };
        const onSqueezeEnd = () => { squeezeHeld.current = false; };
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
        const histoSub = histogramSubjectGet()
            .getStream(id)
            .pipe(filter((e) => (e as { id: string | number }).id === id))
            .subscribe((histo) => {
                try {
                    if (histo?.opts?.render === "jsroot") {
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
                                    setJsrootMesh(mesh);
                                    setJsrootError(null);
                                })
                                .catch((e) => {
                                    console.log(e);
                                    setJsrootError(e);
                                });
                        }
                    } else {
                        if (jsrootHistogram.current) {
                            jsrootHistogram.current.remove?.();
                            jsrootHistogram.current = undefined;
                        }
                        clearJsrootMesh();

                        if (nestedHistogram.current) {
                            nestedHistogram.current.updateHistogram(histo);
                            // Update painter limits when histogram is updated
                            setPainterLimits(nestedHistogram.current.limits);
                            // nestedHistogram.current.remove();
                            // nestedHistogram.current = undefined;
                        } else {
                            const painter = new THnPainter(histo, id, histo?.opts);
                            nestedHistogram.current = painter;

                            setNestedMesh(() => painter.mesh);
                            setWireframeObj(() => painter.wireframe.wireframe);
                            setPainterLimits(painter.limits);
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

                {jsrootMesh && <primitive object={jsrootMesh}/>}
            </group>
            {nestedMesh && <primitive key={nestedMesh.uuid} ref={meshRef} object={instMesh}
                                      onClick={raycastHandler}
                                      onDoubleClick={raycastHandler}
                                      onPointerMove={raycastHandler}
            />}
            {wireframeObj && <primitive object={wireframeObj}/>}
            {painterLimits && modifyModeEnabled && (
                <BoundingFrameBox
                    position={painterLimits.position}
                    scale={new THREE.Vector3().copy(painterLimits.scale)}
                    onChange={onBoundingBoxChange}
                    onDragEnd={onBoundingBoxDragEnd}
                />
            )}
        </>
    );
}
