import "../../scripts/uikit-styles";
import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { createXRStore, XR, XROrigin } from "@react-three/xr";
import { configSubjectGet } from "@ndmspc/ndmvr-core";

import CameraSync from "../systems/CameraSync.tsx";
import Menu from "../ui/shared/Menu.tsx";
import Controllers from "../systems/inputs/Controllers.tsx";
import NdmvrContent from "../scene/NdmvrContent.tsx";
import SceneDecorations from "../scene/SceneDecorations.tsx";
import { NdmvrConfig } from "../../interfaces/NdmvrConfig.ts";
import Demo from "../ui/shared/Demo.tsx";
import { WsConnectionMenu, HttpConnectionMenu } from "../ui/shared/ConnectionMenu.tsx";
import BinInfo from "../ui/shared/BinInfo.tsx";
import DrawOptions from "../ui/shared/DrawOptions.tsx";
import SettingsPanel from "../ui/shared/SettingsPanel.tsx";
import FileBrowser from "../ui/shared/FileBrowser.tsx";

// eslint-disable-next-line react-refresh/only-export-components
export const store = createXRStore();

export interface NdmvrEnvProps {
    children?: React.ReactNode;
    browser?: boolean;
    showUIExternal?: boolean;
    currentConfig?: NdmvrConfig;
    hierarchy?: any;
    rootNode?: any;
    hierarchyDocRef?: React.MutableRefObject<HTMLDivElement>;
    onConfigChange?: ((config: NdmvrConfig) => void) | null;
    onUIStateChange?: (isVisible: boolean) => void;
    onSelectItem?: (path: string) => void;
}

export default function NdmvrEnv({
    children,
    browser = false,
    hierarchy = null,
    rootNode = null,
    hierarchyDocRef = null,
    onSelectItem = null,
}: NdmvrEnvProps) {
    const xrOriginRef = useRef(null);
    const cameraRef = useRef(null);

    const [config, setConfig] = useState(null);

    useEffect(() => {
        const sub = configSubjectGet()
            .getObservable()
            .subscribe((c) => setConfig(c.config));
        return () => sub.unsubscribe();
    }, []);

    const { x = 0, y = 1.7, z = 10 } = config?.environment?.camera?.position ?? {};

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

                    {browser && (
                        <group position={[-12, 2, 0]}>
                            <FileBrowser
                                hierarchy={hierarchy}
                                root={rootNode}
                                doc={hierarchyDocRef}
                                onSelect={(p) => onSelectItem?.(p)}
                            />
                        </group>
                    )}

                    <NdmvrContent>
                        <Menu defaultOpen={true} originRef={xrOriginRef}>
                            <Demo />
                            <HttpConnectionMenu />
                            <WsConnectionMenu />
                            <BinInfo />
                            <DrawOptions />
                            <SettingsPanel />
                            {/* <HelperTips /> */}
                        </Menu>
                        <SceneDecorations />
                        {children}
                    </NdmvrContent>

                    <Controllers
                        originRef={xrOriginRef}
                        cameraRef={cameraRef}
                        desktopSpeed={config?.environment?.desktopSpeed ?? 5}
                        vrSpeed={config?.environment?.vrSpeed ?? 2}
                    />
                    <XROrigin ref={xrOriginRef} position={[x, y, z]} />
                </XR>
            </Canvas>
        </div>
    );
}
