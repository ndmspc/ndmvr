import '../../scripts/uikit-styles'
import * as THREE from "three";
import {createContext, useEffect, useRef, useState} from "react";
import {Canvas} from "@react-three/fiber";
import {PerspectiveCamera} from "@react-three/drei";
import {createXRStore, XR, XROrigin} from "@react-three/xr"
import {configSubjectGet, histogramSubjectGet} from "@ndmspc/ndmvr-aframe";
import {FocusProvider} from './context/FocusContext.jsx';

import CameraSync from "../systems/CameraSync.jsx";
import Menu from "../ui/shared/Menu.jsx";
import BinInfo from "../ui/shared/BinInfo.jsx";
import Controllers from "../systems/inputs/Controllers.jsx";
import NdmvrScene from "../scene/NdmvrScene.jsx";
import ControlsHelp from "../ui/shared/ControlsHelp.jsx";
import Demo from "../ui/shared/Demo.jsx";
import {map, merge} from "rxjs";

export const store = createXRStore();
export const HistogramContext = createContext(null);

export default function NdmvrEnv({controlsHelp = true, currentConfig, onConfigChange}) {
    const xrOriginRef = useRef(null);
    const cameraRef = useRef(null);
    const [showMenu, setShowMenu] = useState(true);
    const [showBinInfo, setShowBinInfo] = useState(false);
    const [showDemo, setShowDemo] = useState(false);

    const [config, setConfig] = useState(null);
    const [histogram, setHistogram] = useState(null);

    useEffect(() => {
        const pads = config?.environment?.histogramPads ?? [];


        const streams = pads.map((pad) =>
            histogramSubjectGet()
                .getStream(pad.id)
                .pipe(map((histo) => ({id: pad.id, obj: histo})))
        );

        const histoSub = merge(...streams).subscribe(({obj}) => {
            console.log(obj);
            setHistogram(obj);
        });
        return () => {
            histoSub.unsubscribe();
        }
    }, [config]);

    useEffect(() => {
        const sub = configSubjectGet().getObservable().subscribe((c) => setConfig(c.config));
        return () => sub.unsubscribe();

    }, []);

    const {
        x = 0,
        y = 1.7,
        z = 10,
    } = config?.environment?.camera?.position ?? {};

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
            }}
        >
            <Canvas
                shadows
                gl={{localClippingEnabled: true}}
                onCreated={({gl}) => {
                    gl.toneMapping = THREE.NoToneMapping;
                    gl.outputColorSpace = THREE.SRGBColorSpace;
                    gl.toneMappingExposure = 1;
                }}
            >

                <color attach="background" args={["#ececec"]}/>
                <PerspectiveCamera
                    ref={cameraRef}
                    makeDefault
                    position={[x, y, z]}
                    fov={90}
                />

                <XR store={store}>
                    <CameraSync cameraRef={cameraRef} originRef={xrOriginRef}/>

                    <NdmvrScene controlsHelp={controlsHelp} originRef={xrOriginRef}/>

                    {controlsHelp && <ControlsHelp/>}

                    <HistogramContext.Provider value={histogram}>
                        <FocusProvider>
                            {showMenu && <Menu originRef={xrOriginRef}
                                               currentConfig={currentConfig}
                                               onConfigChange={onConfigChange}
                                               onClose={() => setShowMenu(false)}
                            />}

                            {showBinInfo && <BinInfo originRef={xrOriginRef}/>}

                            {showDemo && <Demo originRef={xrOriginRef}/>}

                            <Controllers
                                originRef={xrOriginRef}
                                cameraRef={cameraRef}
                                showMenu={showMenu}
                                setShowMenu={setShowMenu}
                                setShowBinInfo={setShowBinInfo}
                                setShowDemo={setShowDemo}
                                desktopSpeed={config?.environment?.desktopSpeed ?? 5}
                                vrSpeed={config?.environment?.vrSpeed ?? 2}
                            />
                        </FocusProvider>
                    </HistogramContext.Provider>
                    <XROrigin ref={xrOriginRef} position={[x, y, z]}/>
                </XR>
            </Canvas>
        </div>
    );
}
