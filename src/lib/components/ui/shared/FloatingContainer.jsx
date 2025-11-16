import {Container} from "@react-three/uikit";
import {useRef} from "react";
import * as THREE from "three";
import {useFrame} from "@react-three/fiber";

export default function FloatingContainer({
    children,
    originRef,
    offset = {x: 0, y: 1.2, z: -4},
    smoothFollow = false,
    lerpFactor = 0.1,
    ...containerProps
}) {
    const groupRef = useRef(null);

    useFrame(() => {
        if (originRef?.current && groupRef.current) {
            const {x, y, z} = originRef.current.position;
            const targetPosition = new THREE.Vector3(
                x + offset.x,
                y + offset.y,
                z + offset.z
            );

            if (smoothFollow) {
                groupRef.current.position.lerp(targetPosition, lerpFactor);
            } else {
                groupRef.current.position.copy(targetPosition);
            }
        }
    });

    return (
        <Container ref={groupRef} {...containerProps}>
            {children}
        </Container>
    );
}