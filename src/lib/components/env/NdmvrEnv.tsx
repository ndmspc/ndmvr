import "../../scripts/uikit-styles";
import * as THREE from "three";
import { createContext, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { createXRStore, XR, XROrigin } from "@react-three/xr";
import { configSubjectGet, histogramSubjectGet } from "@ndmspc/ndmvr-core";

import CameraSync from "../systems/CameraSync.tsx";
import Menu from "../ui/shared/Menu.tsx";
import Controllers from "../systems/inputs/Controllers.tsx";
import NdmvrScene from "../scene/NdmvrScene.tsx";
import ControlsHelp from "../ui/shared/ControlsHelp.tsx";
import { NdmvrConfig } from "../../interfaces/NdmvrConfig.ts";
import { map, merge } from "rxjs";
import HelperTips from "../ui/shared/HelperTips.tsx";
import FileBrowser from "../ui/shared/FileBrowser.tsx";
import { Vector3 } from "three";

// eslint-disable-next-line react-refresh/only-export-components
export const store = createXRStore();
// eslint-disable-next-line react-refresh/only-export-components
export const HistogramContext = createContext(null);

export interface NdmvrEnvProps {
    children?: React.ReactNode;
    controlsHelp?: boolean;
    currentConfig?: NdmvrConfig;
    onConfigChange?: ((config: NdmvrConfig) => void) | null;
    menu?: boolean;
    help?: boolean;
    showUIExternal?: boolean;
    onUIStateChange?: (isVisible: boolean) => void; // Новий prop!
    onHistogramModify?: (id, scale: Vector3, vector3: Vector3) => void;
    hierarchy?: any;
    rootNode?: any;
    hierarchyDocRef?: React.MutableRefObject<HTMLDivElement>;
    onSelectItem?: (path: string) => void;
    browser?: boolean;
}

export default function NdmvrEnv({
    children,
    currentConfig = null,
    onConfigChange = null,
    menu = false,
    help = false,
    showUIExternal = false,
    onUIStateChange = null,
    onHistogramModify = null,
    hierarchy = null,
    rootNode = null,
    hierarchyDocRef = null,
    onSelectItem = null,
    browser = false,
}: NdmvrEnvProps) {
    const xrOriginRef = useRef(null);
    const cameraRef = useRef(null);
    const [showMenu, setShowMenu] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    const [config, setConfig] = useState(null);
    const [histogram, setHistogram] = useState(null);
    const [isSceneReady, setIsSceneReady] = useState(false);

    const prevShowUIExternalRef = useRef(showUIExternal);

    const applyHistogramModification = (id, position: THREE.Vector3, scale: THREE.Vector3) => {
        onHistogramModify?.(id ,position.clone(), scale.clone());
    }

    useEffect(() => {
        const timeout = setTimeout(() => {
            setIsSceneReady(true);
        }, 100);

        return () => clearTimeout(timeout);
    }, []);

    useEffect(() => {
        if (!isSceneReady) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowMenu(menu);
        setShowHelp(menu ? false : help);
    }, [isSceneReady, menu, help]);

    useEffect(() => {
        const prevShowUI = prevShowUIExternalRef.current;
        const currentShowUI = showUIExternal;

        prevShowUIExternalRef.current = currentShowUI;

        if (!currentShowUI && prevShowUI) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setShowMenu(false);
            setShowHelp(false);
            return;
        }

        if (currentShowUI && !prevShowUI) {
            if (!showMenu && !showHelp) {
                setShowMenu(true);
            }
        }
    }, [showUIExternal, showMenu, showHelp]);

    useEffect(() => {
        const isUIVisible = showMenu || showHelp;
        onUIStateChange?.(isUIVisible);
    }, [showMenu, showHelp, onUIStateChange]);

    useEffect(() => {
        const pads = config?.environment?.histogramPads ?? [];

        const streams = pads.map((pad) =>
            histogramSubjectGet()
                .getStream(pad.id)
                .pipe(map((histo) => ({ id: pad.id, obj: histo })))
        );

        const histoSub = merge(...streams).subscribe(({ obj }) => {
            console.log(obj);
            setHistogram(obj);
        });
        return () => {
            histoSub.unsubscribe();
        };
    }, [config]);

    useEffect(() => {
        const sub = configSubjectGet()
            .getObservable()
            .subscribe((c) => setConfig(c.config));
        return () => sub.unsubscribe();
    }, []);

    const { x = 0, y = 1.7, z = 10 } = config?.environment?.camera?.position ?? {};

    const newSetShowMenu = (p) => {
        setShowMenu(p);
        if (p) setShowHelp(false);
    };

    const newSetShowHelp = (p) => {
        setShowHelp(p);
        if (p) setShowMenu(false);
    };

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
            }}
        >
            <Canvas
                shadows
                gl={{ localClippingEnabled: true }}
                onCreated={({ gl }) => {
                    gl.toneMapping = THREE.NoToneMapping;
                    gl.outputColorSpace = THREE.SRGBColorSpace;
                    gl.toneMappingExposure = 1;
                }}
            >
                <color attach="background" args={["#ececec"]} />
                <PerspectiveCamera ref={cameraRef} makeDefault position={[x, y, z]} fov={90} />

                <XR store={store}>
                    <CameraSync cameraRef={cameraRef} originRef={xrOriginRef} />
                    {/*<FileBrowser*/}
                    {/*    hierarchy={hierarchy}*/}
                    {/*    root={rootNode}*/}
                    {/*    doc={hierarchyDocRef}*/}
                    {/*    onSelect={(p) => onSelectItem?.(p)}*/}
                    {/*/>*/}

                    { browser && ( <group position={[-12, 2, 0]}>
                        <FileBrowser
                            hierarchy={hierarchy}
                            root={rootNode}
                            doc={hierarchyDocRef}
                            onSelect={(p) => onSelectItem?.(p)}
                        />
                    </group> )
                    }

                    <NdmvrScene originRef={xrOriginRef} onHistogramModify={applyHistogramModification} />

                    <HistogramContext.Provider value={histogram}>
                        {showMenu && (
                            <Menu
                                originRef={xrOriginRef}
                                currentConfig={currentConfig}
                                onConfigChange={onConfigChange}
                                onClose={() => setShowMenu(false)}
                                help={help}
                                openHelp={() => {
                                    setShowMenu(false);
                                    setShowHelp(true);
                                }}
                            />
                        )}

                        {showHelp && <HelperTips originRef={xrOriginRef} />}

                        {/*{showBinInfo && <BinInfo originRef={xrOriginRef} />}*/}

                        {/*{showDemo && <Demo originRef={xrOriginRef} />}*/}
                        {children}

                        <Controllers
                            originRef={xrOriginRef}
                            cameraRef={cameraRef}
                            setShowMenu={newSetShowMenu}
                            setShowHelp={newSetShowHelp}
                            desktopSpeed={config?.environment?.desktopSpeed ?? 5}
                            vrSpeed={config?.environment?.vrSpeed ?? 2}
                        />
                    </HistogramContext.Provider>
                    <XROrigin ref={xrOriginRef} position={[x, y, z]} />
                </XR>
            </Canvas>
        </div>
    );
}
