import { useXR } from "@react-three/xr";
import * as THREE from "three";

import VRController from "./VRController.tsx";
import DesktopController from "./DesktopController.tsx";

export interface ControllersProps {
    originRef: React.RefObject<THREE.Group>;
    cameraRef: React.RefObject<THREE.Camera>;
    desktopSpeed?: number;
    vrSpeed?: number;
}

export default function Controllers({
    originRef,
    cameraRef,
    desktopSpeed = 5,
    vrSpeed = 2,
}: ControllersProps) {
    const session = useXR((state) => state.session);

    return (
        <>
            {session ? (
                <VRController originRef={originRef} speed={vrSpeed} />
            ) : (
                <DesktopController
                    originRef={originRef}
                    cameraRef={cameraRef}
                    speed={desktopSpeed}
                />
            )}
        </>
    );
}
