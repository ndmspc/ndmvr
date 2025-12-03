import { useEffect } from "react";
import { useXR } from "@react-three/xr";
import * as THREE from "three";

interface CameraSyncProps {
    cameraRef: React.RefObject<THREE.Camera>;
    originRef: React.RefObject<THREE.Group>;
}

export default function CameraSync({ cameraRef, originRef }: CameraSyncProps) {
    const session = useXR((state) => state.session);

    useEffect(() => {
        if (!cameraRef.current || !originRef.current) return;

        const cam = cameraRef.current;
        const origin = originRef.current;

        if (session) {
            origin.position.copy(cam.position);
        } else {
            cam.position.copy(origin.position);
        }
    }, [session, cameraRef, originRef]);

    return null;
}
