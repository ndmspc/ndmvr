import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { CanvasClass } from "@ndmspc/ndmvr-aframe";
// import {CanvasClass} from "../../../../ndmvr-aframe/index.js";

export default function CanvasComponent({
    id = "nh-canvas",
    position = { x: 0, y: 5, z: 10 },
    rotation = { x: 10, y: 0, z: 0 },
    scale = { x: 10, y: 10, z: 0 },
}) {

    const { scene } = useThree();
    const canvas = useRef(null);

    useEffect(() => {
        canvas.current?.remove?.();

        canvas.current = new CanvasClass(null, position, rotation, scale, id);
        console.log('scene add, ', canvas.current.getPlane());
        scene.add(canvas.current.getPlane())
    }, [scene]);

    return null;
}