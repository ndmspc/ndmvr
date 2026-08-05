import "../../scripts/uikit-styles";
import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { XR, XROrigin } from "@react-three/xr";
import { canvasInputProps } from "@react-three/uikit";
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
import CloseBrowserMenu from "../ui/shared/CloseBrowserMenuProps.tsx";
import OpenBrowserMenu from "../ui/shared/OpenBrowserMenuProps.tsx";
import FloatingContainer from "../ui/shared/FloatingContainer.tsx";
import type { NdmspcConfig } from "../../interfaces/NdmspcConfig.ts";
import { store } from "./xrStore";
import MobileMoveController from "../systems/inputs/MobileMoveController.tsx";

export { store };

export function shouldUseMobileControls() {
    if (typeof window === "undefined") return false;

    const hasMultiTouch = navigator.maxTouchPoints >= 2;

    const noHover = window.matchMedia?.("(any-hover: none)").matches ?? false;
    const coarse = window.matchMedia?.("(any-pointer: coarse)").matches ?? false;

    const screenWidth = window.screen?.width;
    const screenHeight = window.screen?.height;
    const width =
        typeof screenWidth === "number" && screenWidth > 0 ? screenWidth : window.innerWidth;
    const height =
        typeof screenHeight === "number" && screenHeight > 0 ? screenHeight : window.innerHeight;
    const shortSide = Math.min(width, height);
    const phoneSized = shortSide <= 900;

    const uaMobile = (navigator as any).userAgentData?.mobile === true;

    return uaMobile || (hasMultiTouch && noHover && coarse && phoneSized);
}

export interface NdmvrEnvProps {
    children?: React.ReactNode;
    showUIExternal?: boolean;
    currentConfig?: NdmvrConfig;
    hierarchy?: any;
    rootNode?: any;
    hierarchyDocRef?: React.MutableRefObject<HTMLDivElement>;
    onConfigChange?: ((config: NdmvrConfig) => void) | null;
    onUIStateChange?: (isVisible: boolean) => void;
    onSelectItem?: (path: string) => void;
    browser?: boolean;
    setBrowser?: React.Dispatch<React.SetStateAction<NdmspcConfig | null>>;
    rendererMode?: "jsroot" | "ndmvr";
    setRendererMode?: React.Dispatch<React.SetStateAction<"jsroot" | "ndmvr">>;
    menuDefaultOpen?: boolean;
    browserInputMenu?: React.ReactNode;
}

export default function NdmvrEnv({
    children,
    hierarchy = null,
    rootNode = null,
    hierarchyDocRef = null,
    onSelectItem = null,
    browser = false,
    setBrowser,
    rendererMode,
    setRendererMode,
    menuDefaultOpen = true,
    browserInputMenu = null,
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

    const touch = shouldUseMobileControls();

    const startMove = (dir: "forward" | "back" | "left" | "right" | "up" | "down") => {
        window.dispatchEvent(new CustomEvent("mobile-move", { detail: { dir, pressed: true } }));
    };

    const stopMove = (dir: "forward" | "back" | "left" | "right" | "up" | "down") => {
        window.dispatchEvent(new CustomEvent("mobile-move", { detail: { dir, pressed: false } }));
    };

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
            }}
        >
            <Canvas
                {...canvasInputProps}
                shadows
                gl={{ localClippingEnabled: true }}
                onCreated={({ gl }) => {
                    gl.toneMapping = THREE.NoToneMapping;
                    gl.outputColorSpace = THREE.SRGBColorSpace;
                    gl.toneMappingExposure = 1;
                }}
            >
                <color attach="background" args={["#c7e8f6"]} />
                <PerspectiveCamera ref={cameraRef} makeDefault position={[x, y, z]} fov={75} />

                <XR store={store}>
                    <CameraSync cameraRef={cameraRef} originRef={xrOriginRef} />

                    {browser && (
                        <group position={[-12, 2, 0]}>
                            <FileBrowser
                                hierarchy={hierarchy}
                                root={rootNode}
                                doc={hierarchyDocRef}
                                onSelect={(p) => onSelectItem?.(p)}
                                rendererMode={rendererMode}
                                setRendererMode={setRendererMode}
                            />
                        </group>
                    )}

                    <NdmvrContent originRef={xrOriginRef}>
                        <Menu defaultOpen={menuDefaultOpen} originRef={xrOriginRef}>
                            <Demo />
                            <HttpConnectionMenu />
                            <WsConnectionMenu />
                            {setBrowser && browser ? (
                                <CloseBrowserMenu setBrowser={setBrowser} />
                            ) : setBrowser ? (
                                <OpenBrowserMenu setBrowser={setBrowser} />
                            ) : null}
                            <BinInfo />
                            <DrawOptions />
                            <SettingsPanel />
                            {/* <HelperTips /> */}
                        </Menu>

                        {browserInputMenu && (
                            <FloatingContainer
                                originRef={xrOriginRef}
                                offset={{ x: 0, y: 1.2, z: -4 }}
                                faceUser={true}
                                classList={["menuContainer"]}
                            >
                                {browserInputMenu}
                            </FloatingContainer>
                        )}

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

            {touch && <MobileMoveController onMoveStart={startMove} onMoveEnd={stopMove} />}
        </div>
    );
}
