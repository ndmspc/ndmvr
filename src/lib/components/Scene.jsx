import * as THREE from "three";
import { Sky } from "@react-three/drei";
import {
    binInfoSubjectGet,
    configSubjectGet,
    NdmvrRaycaster,
} from "@ndmspc/ndmvr-aframe";
// import {configSubjectGet, NdmvrRaycaster} from "../../../../ndmvr-aframe/index.js";

import { useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import CanvasComponent from "./CanvasComponent.jsx";
// import JsrootHistogramWrapper from "./JsrootHistogramWrapper.jsx";
import HistogramWrapper from "./HistogramWrapper.jsx";
import RaycasterBridge from "../../components/RaycasterBridge.jsx";

export default function Scene({ originRef }) {
    const { scene } = useThree();
    const [raycaster, setRaycaster] = useState(null);
    const [config, setConfig] = useState(null);

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
            <CanvasComponent id="nh-cinema"/>

            {config?.histogramPads?.map((object) => (
                <HistogramWrapper key={object.id} id={object.id}/>
            ))}

            <Sky/>
            <fog attach="fog" args={["#997D31", 5, 60]}/>
            <ambientLight intensity={0.4}/>
            <directionalLight position={[0, 5, 5]} intensity={1}/>

            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[100, 100]}/>
                <meshStandardMaterial color="lightgray"/>
            </mesh>

            <RaycasterBridge rc={raycaster} originRef={originRef}/>

            <primitive object={new THREE.GridHelper(100, 100)}/>
            <primitive object={new THREE.AxesHelper(5)}/>
        </>
    );
}
