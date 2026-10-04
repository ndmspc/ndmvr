import "../../styles/uikit-styles";
import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { XR, XROrigin } from "@react-three/xr";
import { canvasInputProps } from "@react-three/uikit";
import { configSubjectGet } from "@ndmspc/ndmvr-core";

import CameraSync from "../systems/CameraSync.tsx";
import Controllers from "../systems/inputs/Controllers.tsx";
import KeyboardListener from "../systems/inputs/KeyboardListener.tsx";
import MobileMoveController from "../systems/inputs/MobileMoveController.tsx";
import FullscreenButton from "../ui/desktop/FullscreenButton.tsx";
import UIToggleButton from "../ui/desktop/UIToggleButton.tsx";
import { shouldUseMobileControls } from "../../interactions/device/shouldUseMobileControls";
import {
    INTERACTION_EVENTS,
    type MobileMoveDirection,
    type MobileMoveDetail,
} from "../../interactions/events";
import { store } from "../../stores/xr/store";

export interface NdmvrBaseProps {
    children?: React.ReactNode;
}

type RuntimeConfig = {
    environment?: {
        camera?: { position?: { x?: number; y?: number; z?: number } };
        desktopSpeed?: number;
        vrSpeed?: number;
    };
};

export default function NdmvrBase({ children }: NdmvrBaseProps) {
    const xrOriginRef = useRef<THREE.Group>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera>(null);
    const [config, setConfig] = useState<RuntimeConfig | null>(null);
    const [touch, setTouch] = useState(() => shouldUseMobileControls());

    useEffect(() => {
        const sub = configSubjectGet()
            .getObservable()
            .subscribe((value) => setConfig({ ...value.config }));
        return () => sub.unsubscribe();
    }, []);

    useEffect(() => {
        const updateTouch = () => setTouch(shouldUseMobileControls());
        updateTouch();
        window.addEventListener("resize", updateTouch);
        window.addEventListener("orientationchange", updateTouch);
        return () => {
            window.removeEventListener("resize", updateTouch);
            window.removeEventListener("orientationchange", updateTouch);
        };
    }, []);

    const { x = 0, y = 1.7, z = 10 } = config?.environment?.camera?.position ?? {};
    const startMove = (dir: MobileMoveDirection) => {
        window.dispatchEvent(
            new CustomEvent<MobileMoveDetail>(INTERACTION_EVENTS.MOBILE_MOVE, {
                detail: { dir, pressed: true },
            })
        );
    };
    const stopMove = (dir: MobileMoveDirection) => {
        window.dispatchEvent(
            new CustomEvent<MobileMoveDetail>(INTERACTION_EVENTS.MOBILE_MOVE, {
                detail: { dir, pressed: false },
            })
        );
    };

    return (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <Canvas
                {...canvasInputProps}
                style={{ touchAction: "none" }}
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
                    <KeyboardListener />
                    <ambientLight intensity={0.4} />
                    <directionalLight position={[0, 5, 5]} intensity={1} />
                    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                        <planeGeometry args={[100, 100]} />
                        <meshStandardMaterial color="lightgray" />
                    </mesh>

                    {children}

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
            <FullscreenButton />
            <UIToggleButton />
        </div>
    );
}
