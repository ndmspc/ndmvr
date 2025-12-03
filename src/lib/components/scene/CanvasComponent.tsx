import { useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { CanvasClass, Position, Rotation, Scale } from "@ndmspc/ndmvr-aframe";

interface CanvasLocation {
    position?: Position;
    scale?: Scale;
    rotation?: Rotation;
}

interface CanvasComponentProps {
    id?: string;
    location?: CanvasLocation;
    position?: Position;
    rotation?: Rotation;
    scale?: Scale;
}

export default function CanvasComponent({
    id = "nh-canvas",
    location = {
        position: { x: 0, y: 5, z: 10 },
        scale: { x: 10, y: 10, z: 0 },
        rotation: { x: 10, y: 0, z: 0 },
    },
    position = { x: 0, y: 5, z: 10 },
    rotation = { x: 10, y: 0, z: 0 },
    scale = { x: 10, y: 10, z: 0 },
}: CanvasComponentProps) {


    const { scene } = useThree();
    const canvas = useRef(null);
    const [plane, setPlane] = useState(null);

    useEffect(() => {
        try {
            canvas?.current?.remove?.();
        }
        catch (e) {
            console.log(e);
        }
        canvas.current = new CanvasClass(null, location?.position ?? position, location?.rotation ?? rotation, location?.scale ?? scale, id);
        console.log(canvas.current)
        console.log('scene add, ', canvas.current.getPlane());
        setPlane(canvas.current.getPlane());
        return () => {
            try {
                canvas?.current?.remove?.();
            }
            catch (e) {
                console.log(e);
            }
        }
    }, [scene]);

    return plane ? <primitive object={plane} /> : null;
}
