import {useThree} from "@react-three/fiber";
import {useEffect, useRef} from "react";
import {filter} from "rxjs";
import {histogramSubjectGet, NestedHistogram, HistogramJsrootClass} from "@ndmspc/ndmvr-aframe";



export default function HistogramWrapper({
     id,
     px = 0.1,
     py = 0.1,
     pz = 0.1,
 }) {

    const {scene} = useThree();
    const jsrootHistogram = useRef();
    const nestedHistogram = useRef();
    const histoSub = useRef();

    useEffect(() => {

        return () =>{
            // if (jsrootHistogram.current) jsrootHistogram.current.remove();
            // if (nestedHistogram.current) nestedHistogram.current.remove();
            if (histoSub.current) histoSub.current.unsubscribe();
        }
    }, []);

    useEffect(() => {
        console.log(id)

        histoSub.current = histogramSubjectGet().getStream()
            // .pipe(
            //     filter(e => e.id === id)
            // )
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
                        console.log(jsrootHistogram.current.getHistogramMesh());
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
        // jsrootHistogram.current = new HistogramJsrootClass(id);
        // scene.add(jsrootHistogram.current.getHistogramMesh());
    }, [scene]);

    return null;
}