import { useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { XR, XROrigin } from "@react-three/xr";

import CameraSync from "./CameraSync.jsx";
import Menu from "./ui/shared/Menu.jsx";
import BinInfo from "./ui/shared/BinInfo.jsx";
import Controllers from "./inputs/Controllers.jsx";
import Scene from "../lib/components/Scene.jsx";
import { store } from "../App.jsx";

export default function SceneWrapper(props) {
    const xrOriginRef = useRef();
    const cameraRef = useRef();

    const [showBinInfo, setShowBinInfo] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    return (
        <div style={{ width: "100%", height: "100%", ...props.style }}>
            <Canvas shadows>
                <color attach="background" args={["#ececec"]}/>
                <PerspectiveCamera
                    ref={cameraRef}
                    makeDefault
                    position={[0, 1.6, 10]}
                    fov={90}
                />

                <XR store={store}>
                    <CameraSync cameraRef={cameraRef} originRef={xrOriginRef}/>

                    <Scene/>

                    {showMenu && <Menu originRef={xrOriginRef}/>}
                    {showBinInfo && <BinInfo originRef={xrOriginRef}/>}

                    <Controllers
                        originRef={xrOriginRef}
                        cameraRef={cameraRef}
                        setShowMenu={setShowMenu}
                        setShowBinInfo={setShowBinInfo}
                    />
                    <XROrigin ref={xrOriginRef} position={[0, 1.6, 10]}/>
                </XR>
            </Canvas>
        </div>
    );
}
