import * as THREE from "three";
import { Sky } from "@react-three/drei";
import { binInfoSubjectGet, configSubjectGet, NdmvrRaycaster } from "@ndmspc/ndmvr-core";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import CanvasComponent from "./CanvasComponent.tsx";
import HistogramWrapper from "./HistogramWrapper.tsx";
import RaycasterBridge from "./RaycasterBridge.tsx";
import { useSceneModeStore } from "../../stores/sceneMode/store.ts";

export interface NdmvrSceneProps {
    originRef: React.RefObject<THREE.Group>;
    onHistogramModify?: (id, scale: THREE.Vector3) => void;
}

export default function NdmvrScene({ originRef, onHistogramModify }: NdmvrSceneProps) {
    const { scene, gl } = useThree();
    const raycasterRef = useRef(null);
    const [config, setConfig] = useState(null);

    const grid = useMemo(() => new THREE.GridHelper(100, 100), []);
    const axes = useMemo(() => new THREE.AxesHelper(5), []);

    const { vrEnabled, uiHover, shouldDisableRaycaster } = useSceneModeStore();

    const applyHistogramModification = (id, scale: THREE.Vector3) => {
        console.log("Config changed from SettingsPanel:", scale);
        onHistogramModify?.(id, scale);
    }

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
        if (scene && gl.domElement) {
            const newRaycaster = new NdmvrRaycaster(scene, gl.domElement);
            raycasterRef.current = newRaycaster;
            console.log(newRaycaster);
        }
        return () => {
            raycasterRef.current?.destroyRaycasting();
        };
    }, [scene, gl]);

    useEffect(() => {
        if (shouldDisableRaycaster()) {
            console.log("DisableRaycaster");
            raycasterRef.current?.destroyRaycasting();
            if (raycasterRef.current.raycastOn != undefined) {
                raycasterRef.current.raycastOn = false;
            }
        } else {
            console.log("EnableRaycaster");
            raycasterRef.current?.setupRaycasting();
            if (raycasterRef.current.raycastOn != undefined) {
                raycasterRef.current.raycastOn = true;
            }
        }
    }, [vrEnabled, uiHover, shouldDisableRaycaster]);

    return (
        <>
            <group>
                {config?.environment?.histogramPads?.map((object) => (
                    <HistogramWrapper key={object.id} id={object.id} onHistogramModify={applyHistogramModification} />
                ))}
                {config?.environment?.histogramPads?.length > 0 && (
                    <CanvasComponent
                        location={config?.environment?.canvas}
                        id={`${config?.environment?.histogramPads?.[0]?.id}-cinema`}
                    />
                )}
            </group>

            <Sky />
            {/*<fog attach="fog" args={["#997D31", 5, 60]}/>*/}
            <ambientLight intensity={0.4} />
            <directionalLight position={[0, 5, 5]} intensity={1} />

            {/* <mesh toneMapped={false} rotation={[-Math.PI / 2, 0, 0]} receiveShadow> */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color="lightgray" />
            </mesh>

            {/* eslint-disable-next-line react-hooks/refs */}
            {raycasterRef.current && (
                // eslint-disable-next-line react-hooks/refs
                <RaycasterBridge rc={raycasterRef.current} originRef={originRef} />
            )}

            <primitive object={grid} />
            <primitive object={axes} />
        </>
    );
}
