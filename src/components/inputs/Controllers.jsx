import { useXR } from "@react-three/xr";

import VRController from "./VRController";
import DesktopController from "./DesktopController";

export default function Controllers({
    originRef,
    cameraRef,
    setShowMenu,
    setShowBinInfo,
}) {

    const session = useXR((state) => state.session);

    if (session) {
        return (
            <VRController
                originRef={originRef}
                speed={2}
                onToggleMenu={() => setShowMenu((p) => !p)}
                onToggleBinInfo={() => setShowBinInfo((p) => !p)}
            />
        );
    }
    else {
        return (
            <DesktopController
                originRef={originRef}
                cameraRef={cameraRef}
                onToggleMenu={() => setShowMenu((p) => !p)}
                onToggleBinInfo={() => {
                    setShowBinInfo((p) => !p)
                }}
            />
        );
    }
}
