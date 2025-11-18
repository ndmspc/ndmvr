import {useThree} from "@react-three/fiber";
import {useEffect, useRef, useState} from "react";
import {filter} from "rxjs";
import {configSubjectGet, HistogramJsrootClass, histogramSubjectGet, THnPainter,} from "@ndmspc/ndmvr-aframe";

export default function HistogramWrapper({id}) {
    const {scene, camera} = useThree();
    const jsrootHistogram = useRef();
    const nestedHistogram = useRef();
    const [config, setConfig] = useState(null);

    const [jsrootMesh, setJsrootMesh] = useState(null);
    const [nestedMesh, setNestedMesh] = useState(null);
    const [wireframeObj, setWireframeObj] = useState(null);

    const disposeThree = (obj) => {
        if (!obj) return;
        const disposeOne = (o) => {
            if (o.geometry) o.geometry.dispose?.();
            if (o.material) {
                if (Array.isArray(o.material))
                    o.material.forEach((m) => m?.dispose?.());
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
        };
    }, [scene]);

    useEffect(() => {
        if (!config) return;

        const histoSub = histogramSubjectGet()
            .getStream(id)
            .pipe(filter((e) => e.id === id))
            .subscribe((histo) => {
                try {
                    if (histo?.opts?.render === "jsroot") {
                        if (nestedHistogram.current) {
                            console.log('remove v jsroot')
                            nestedHistogram.current.remove?.();
                            nestedHistogram.current = undefined;
                        }
                        clearNestedMeshes();

                        if (jsrootHistogram.current) {
                            jsrootHistogram.current.updateHistogram(histo.obj);
                        } else {
                            jsrootHistogram.current = new HistogramJsrootClass(
                                id,
                                histo.obj,
                                camera
                            );
                            const mesh = jsrootHistogram.current.getHistogramMesh();
                            setJsrootMesh(mesh);
                        }
                    } else {
                        if (jsrootHistogram.current) {
                            jsrootHistogram.current.remove?.();
                            jsrootHistogram.current = undefined;
                        }
                        clearJsrootMesh();

                        if (nestedHistogram.current) {
                            console.log('REMOVEEEEE__________')
                            nestedHistogram.current.updateHistogram(histo)
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
            {jsrootMesh && <primitive object={jsrootMesh}/>}
            {nestedMesh && <primitive object={nestedMesh}/>}
            {wireframeObj && <primitive object={wireframeObj}/>}
        </>
    );
}
