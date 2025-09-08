import {useThree} from "@react-three/fiber";
import {useEffect, useRef} from "react";
import {HistogramJsrootClass} from "@ndmspc/ndmvr-aframe";
// import {HistogramJsrootClass} from "../../../../ndmvr-aframe/index.js";
import * as THREE from "three";


export default function JsrootHistogramWrapper({id}) {

    const {scene} = useThree();
    const jsrootHistogram = useRef();

    useEffect(() => {
        jsrootHistogram.current = new HistogramJsrootClass(id);

        scene.add(jsrootHistogram.current.getHistogramMesh());
    }, [scene]);

    return null;
}