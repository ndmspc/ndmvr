import { useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { filter } from "rxjs";
import { Text } from "@react-three/drei";
import {
    configSubjectGet,
    HistogramJsrootClass,
    histogramSubjectGet,
    THnPainter,
} from "@ndmspc/ndmvr-core";
import { vector3ToArray } from "../../utils/helper-functions.ts";

export interface HistogramWrapperProps {
    id: string;
}

export default function HistogramWrapper({ id }: HistogramWrapperProps) {
    const { scene, camera } = useThree();
    const jsrootHistogram = useRef(null);
    const nestedHistogram = useRef(null);
    const [config, setConfig] = useState(null);

    const [jsrootMesh, setJsrootMesh] = useState(null);
    const [jsrootError, setJsrootError] = useState(null);
    const [nestedMesh, setNestedMesh] = useState(null);
    const [wireframeObj, setWireframeObj] = useState(null);

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
    };

    useEffect(() => {
        const configSub = configSubjectGet()
            .getObservable()
            .subscribe((c) => setConfig(c.config));

        return () => {
            configSub.unsubscribe();
            nestedHistogram.current?.remove();
            jsrootHistogram.current?.remove();
        };
    }, [scene]);

    useEffect(() => {
        if (!config) return;

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
                            // nestedHistogram.current.remove();
                            // nestedHistogram.current = undefined;
                        } else {
                            const painter = new THnPainter(histo, id, histo?.opts);
                            nestedHistogram.current = painter;

                            setNestedMesh(() => painter.mesh);
                            setWireframeObj(() => painter.wireframe.wireframe);
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
    }, [config, id]);

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

                {jsrootMesh && <primitive object={jsrootMesh} />}
            </group>
            {nestedMesh && <primitive object={nestedMesh} />}
            {wireframeObj && <primitive object={wireframeObj} />}
        </>
    );
}
