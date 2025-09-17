import { useEffect } from "react";
import { useXR } from "@react-three/xr";

export default function CameraSync({ cameraRef, originRef }) {
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
