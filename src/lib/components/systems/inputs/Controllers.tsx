import {useXR} from "@react-three/xr";
import * as THREE from "three";

import VRController from "./VRController.tsx";
import DesktopController from "./DesktopController.tsx";

interface ControllersProps {
    originRef: React.RefObject<THREE.Group>;
    cameraRef: React.RefObject<THREE.Camera>;
    setShowMenu: React.Dispatch<React.SetStateAction<boolean>>;
    setShowBinInfo: React.Dispatch<React.SetStateAction<boolean>>;
    setShowDemo: React.Dispatch<React.SetStateAction<boolean>>;
    desktopSpeed?: number;
    vrSpeed?: number;
}

export default function Controllers({
    originRef,
    cameraRef,
    setShowMenu,
    setShowBinInfo,
    setShowDemo,
    desktopSpeed = 5,
    vrSpeed = 2,
}: ControllersProps) {

    const session = useXR((state) => state.session);

    if (session) {
        return (
            <VRController
                originRef={originRef}
                speed={vrSpeed}
                onToggleMenu={() => setShowMenu((p) => !p)}
                onToggleBinInfo={() => setShowBinInfo((p) => !p)}
                onToggleDemo={() => setShowDemo((p) => !p)}
            />
        );
    } else {
        return (
            <DesktopController
                originRef={originRef}
                cameraRef={cameraRef}
                onToggleMenu={() => setShowMenu((p) => !p)}
                onToggleBinInfo={() => setShowBinInfo((p) => !p)}
                onToggleDemo={() => setShowDemo((p) => !p)}
                speed={desktopSpeed}
            />
        );
    }
}
