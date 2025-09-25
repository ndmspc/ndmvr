import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { createXRStore, XR, XROrigin } from "@react-three/xr";

import CameraSync from "../systems/CameraSync.jsx";
import Menu from "../ui/shared/Menu.jsx";
import BinInfo from "../ui/shared/BinInfo.jsx";
import Controllers from "../systems/inputs/Controllers.jsx";
import NdmvrScene from "../scene/NdmvrScene.jsx";
import { configSubjectGet } from "@ndmspc/ndmvr-aframe";

export const store = createXRStore();

export default function NdmvrEnv({controlsHelp = false}) {
    const xrOriginRef = useRef(null);
    const cameraRef = useRef(null);
    const [showMenu, setShowMenu] = useState(true);
    const [showBinInfo, setShowBinInfo] = useState(false);

    const [config, setConfig] = useState(null);

    useEffect(() => {
        const sub = configSubjectGet().getObservable().subscribe((c) => setConfig(c.config));
        return () => sub.unsubscribe();
    }, []);

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
            }}
        >
            <Canvas  shadows>
                <color attach="background" args={["#ececec"]}/>
                <PerspectiveCamera
                    ref={cameraRef}
                    makeDefault
                    position={[0, 1.6, 10]}
                    fov={90}
                />

                <XR store={store}>
                    <CameraSync cameraRef={cameraRef} originRef={xrOriginRef}/>

                    <NdmvrScene controlsHelp={controlsHelp} originRef={xrOriginRef}/>

                    {showMenu && <Menu originRef={xrOriginRef}/>}
                    {showBinInfo && <BinInfo originRef={xrOriginRef}/>}

                    <Controllers
                        originRef={xrOriginRef}
                        cameraRef={cameraRef}
                        showMenu={showMenu}
                        setShowMenu={setShowMenu}
                        setShowBinInfo={setShowBinInfo}
                        desktopSpeed={config?.environment?.desktopSpeed ?? 5}
                        vrHSpeed={config?.environment?.vrHSpeed ?? 2}
                        vrVSpeed={config?.environment?.vrVSpeed ?? 2}
                    />
                    <XROrigin ref={xrOriginRef} position={[0, 1.6, 10]}/>

                </XR>
            </Canvas>
        </div>
    );
}
