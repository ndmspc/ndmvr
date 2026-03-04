import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { NdmvrRaycaster } from "@ndmspc/ndmvr-core";
import RaycasterBridge from "./RaycasterBridge.tsx";
import { useSceneModeStore } from "../../stores/sceneMode/store.ts";

export interface RaycasterManagerProps {
    originRef: React.RefObject<THREE.Group>;
}

export default function RaycasterManager({ originRef }: RaycasterManagerProps) {
    const { scene, gl } = useThree();
    const raycasterRef = useRef(null);
    const [raycaster, setRaycaster] = useState<NdmvrRaycaster | null>(null);
    const { vrEnabled, uiHover, shouldDisableRaycaster } = useSceneModeStore();

    useEffect(() => {
        if (scene && gl.domElement) {
            const newRaycaster = new NdmvrRaycaster(scene, gl.domElement);
            raycasterRef.current = newRaycaster;
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setRaycaster(newRaycaster);
            console.log(newRaycaster);
        }
        return () => {
            raycasterRef.current?.destroyRaycasting();
        };
    }, [scene, gl]);

    useEffect(() => {
        if (shouldDisableRaycaster()) {
            console.log("DisableRaycaster");
            raycasterRef.current?.destroyRaycasting();
            if (raycasterRef.current.raycastOn != undefined) {
                raycasterRef.current.raycastOn = false;
            }
        } else {
            console.log("EnableRaycaster");
            raycasterRef.current?.setupRaycasting();
            if (raycasterRef.current.raycastOn != undefined) {
                raycasterRef.current.raycastOn = true;
            }
        }
    }, [vrEnabled, uiHover, shouldDisableRaycaster]);

    return raycaster ? <RaycasterBridge rc={raycaster} originRef={originRef} /> : null;
}
