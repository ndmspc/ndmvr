import * as THREE from "three";
import { Sky } from "@react-three/drei";
import {
    binInfoSubjectGet,
    configSubjectGet,
    NdmvrRaycaster,
} from "@ndmspc/ndmvr-aframe";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import CanvasComponent from "./CanvasComponent.jsx";
import HistogramWrapper from "./HistogramWrapper.jsx";
import RaycasterBridge from "./RaycasterBridge.jsx";
import ControlsHelp from "../ui/shared/ControlsHelp.jsx";

export default function NdmvrScene({ originRef, controlsHelp = false }) {
    const { scene } = useThree();
    const [raycaster, setRaycaster] = useState(null);
    const [config, setConfig] = useState(null);

    const grid = useMemo(() => new THREE.GridHelper(100, 100), []);
    const axes = useMemo(() => new THREE.AxesHelper(5), []);

    useEffect(() => {
        const configSub = configSubjectGet()
            .getObservable()
            .subscribe((c) => {
                setConfig(c.config);
            });
        const binInfoSub = binInfoSubjectGet()
            .getObservable()
            .subscribe((c) => {
                console.log(c);
            });
        return () => {
            configSub.unsubscribe();
            binInfoSub.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (scene) {
            const raycaster = new NdmvrRaycaster(scene);
            console.log(raycaster);
            setRaycaster(raycaster);
        }
    }, [scene]);

    return (
        <>

          <group>
            {config?.environment?.histogramPads?.map((object) => (
              <HistogramWrapper key={object.id} id={object.id}/>
            ))}
            {config?.environment?.histogramPads?.length > 0 &&
              <CanvasComponent location={config?.environment?.canvas} id={`${config?.environment?.histogramPads?.[0]?.id}-cinema`} />
            }
          </group>

            {controlsHelp &&
                <>
                    <group position={[-3.5, 1.5, 7]} rotation={[0, Math.PI / 4, 0]}>
                        <ControlsHelp/>
                    </group>
                    <group position={[-3.5, 1.5, 7]} rotation={[0, Math.PI / 4 + Math.PI, 0]}>
                        <ControlsHelp/>
                    </group>
                </>
            }

            <Sky/>
            {/*<fog attach="fog" args={["#997D31", 5, 60]}/>*/}
            <ambientLight intensity={0.4}/>
            <directionalLight position={[0, 5, 5]} intensity={1}/>

            <mesh toneMapped={false} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[100, 100]}/>
                <meshStandardMaterial color="lightgray"/>
            </mesh>

            <RaycasterBridge rc={raycaster} originRef={originRef}/>

            <primitive object={grid}/>
            <primitive object={axes}/>
        </>
    );
}
