import * as THREE from "three";
import { Sky } from "@react-three/drei";
import {configSubjectGet, NdmvrRaycaster} from "@ndmspc/ndmvr-aframe";
// import {configSubjectGet, NdmvrRaycaster} from "../../../../ndmvr-aframe/index.js";

import NestedHistogramWrapper from "../../components/NestedHistogramWrapper.jsx";
import BinInfo from "../../components/VRUI/BinInfo.jsx";
import {useThree} from "@react-three/fiber";
import {useEffect, useState} from "react";
import CanvasComponent from "./CanvasComponent.jsx";
import JsrootHistogramWrapper from "./JsrootHistogramWrapper.jsx";
import HistogramWrapper from "./HistogramWrapper.jsx";

export default function Scene() {
  const { scene } = useThree();
  const [raycaster, setRaycaster] = useState(null);
  const [config, setConfig] = useState(null);

  useEffect(() => {
      const configSub = configSubjectGet().getObservable()
          .subscribe(c =>{
              setConfig(c.config);
          })
      return () => configSub.unsubscribe();
  }, [])

  useEffect(() => {
    if (scene) {
      setRaycaster(new NdmvrRaycaster(scene));
    }
  }, [scene]);

  return (
    <>
        <CanvasComponent id="nh-cinema"/>
      {/*<NestedHistogramWrapper id="nh" />*/}
      {/*<JsrootHistogramWrapper id="nh-jsroot" />*/}
        {config?.histogramPads?.map((object) => (
            <HistogramWrapper key={object.id} id={object.id} />
        ))}

        <HistogramWrapper id="nh"/>

      <Sky />
      <fog attach="fog" args={["#997D31", 5, 60]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[0, 5, 5]} intensity={1} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="lightgray" />
      </mesh>

      <group position={[0, 1.4, -2]}>
        <BinInfo />
      </group>

      <primitive object={new THREE.GridHelper(100, 100)} />
      <primitive object={new THREE.AxesHelper(5)} />
    </>
  );
}
