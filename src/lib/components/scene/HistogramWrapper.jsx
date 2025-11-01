import { useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { filter } from "rxjs";
import {
  histogramSubjectGet,
  NestedHistogram,
  HistogramJsrootClass,
  configSubjectGet,
} from "@ndmspc/ndmvr-aframe";
import * as THREE from "three";
import {build3d, create} from "jsroot";

export default function HistogramWrapper({ id, px = 0.1, py = 0.1, pz = 0.1 }) {
    const { scene, camera } = useThree();
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
                if (histo?.opts?.render === "jsroot") {
                    if (nestedHistogram.current) {
                        nestedHistogram.current.remove?.();
                        nestedHistogram.current = undefined;
                    }
                    clearNestedMeshes();

                    if (jsrootHistogram.current) {
                        jsrootHistogram.current.updateHistogram(histo.histogram);
                    } else {
                        jsrootHistogram.current = new HistogramJsrootClass(
                            id,
                            histo.histogram,
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
                        nestedHistogram.current.updateHistogram(histo, histo.opts);
                    } else {
                        nestedHistogram.current = new NestedHistogram(
                            px,
                            py,
                            pz,
                            histo,
                            id, histo.opts
                        );
                        setNestedMesh(nestedHistogram.current.instancedMesh);
                        setWireframeObj(nestedHistogram.current.wireframe.wireframe);
                    }
                }
            });

        return () => {
            histoSub.unsubscribe();

            if (jsrootHistogram.current) {
                jsrootHistogram.current.remove?.();
                jsrootHistogram.current = undefined;
            }
            if (nestedHistogram.current) {
                nestedHistogram.current.remove?.();
                nestedHistogram.current = undefined;
            }

            clearJsrootMesh();
            clearNestedMeshes();
        };
    }, [config, id, px, py, pz]);

    return (
        <>
            {jsrootMesh && <primitive object={jsrootMesh}/>}
            {nestedMesh && <primitive object={nestedMesh}/>}
            {wireframeObj && <primitive object={wireframeObj}/>}
        </>
    );
}
