import {useThree} from "@react-three/fiber";
import {useEffect, useRef, useState} from "react";
import {filter} from "rxjs";
import {histogramSubjectGet, NestedHistogram, HistogramJsrootClass, configSubjectGet} from "@ndmspc/ndmvr-aframe";
import * as THREE from "three";
// import {histogramSubjectGet, NestedHistogram, HistogramJsrootClass} from '../../../../ndmvr-aframe/index.js';


export default function HistogramWrapper({
                                             id,
                                             px = 0.1,
                                             py = 0.1,
                                             pz = 0.1,
                                         }) {

    const {scene} = useThree();
    const jsrootHistogram = useRef();
    const nestedHistogram = useRef();
    const [config, setConfig] = useState(null);


    useEffect(() => {
        console.log(id)
        const configSub = configSubjectGet().getObservable()
            // .pipe(
            //     filter(e => e.id === id)
            // )
            .subscribe(c => {
                setConfig(c.config);
            })

        return () => {
            console.log('UNSUB');
            configSub.unsubscribe();
        }
    }, [scene]);

    useEffect(() => {
        if (!config) return;
        const histoSub = histogramSubjectGet().getStream(id)
            .pipe(
                filter(e => e.id === id)
            )
            .subscribe((histo) => {
                console.log('dojdeeee', histo)
                // histo.opts ??= {};
                // histo.opts.render = 'nested';

                if (histo?.opts?.render === 'jsroot') {
                    if (nestedHistogram.current) {
                        nestedHistogram.current.remove();
                        nestedHistogram.current = undefined;
                    }

                    if (jsrootHistogram.current) {
                        jsrootHistogram.current.updateHistogram(histo.histogram);
                    } else {
                        jsrootHistogram.current = new HistogramJsrootClass(id, histo.histogram);
                        scene.add(jsrootHistogram.current.getHistogramMesh());
                    }
                } else {
                    if (jsrootHistogram.current) {
                        jsrootHistogram.current.remove();
                        jsrootHistogram.current = undefined;
                    }

                    if (nestedHistogram.current) {
                        nestedHistogram.current.updateHistogram(histo);
                    } else {
                        nestedHistogram.current = new NestedHistogram(px, py, pz, histo, id);
                        scene.add(nestedHistogram.current.instancedMesh);
                        scene.add(nestedHistogram.current.wireframe.wireframe);
                    }
                }
            });
        return () => {
            console.log('UNSUB');
            histoSub.unsubscribe();
        }
    }, [config]);

    return null;
}