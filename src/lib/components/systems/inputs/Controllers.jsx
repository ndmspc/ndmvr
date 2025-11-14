import {useXR} from "@react-three/xr";

import VRController from "./VRController.jsx";
import DesktopController from "./DesktopController.jsx";

export default function Controllers({
    originRef,
    cameraRef,
    setShowMenu,
    setShowBinInfo,
    setShowDemo,
    desktopSpeed = 5,
    vrSpeed = 2,
}) {

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
