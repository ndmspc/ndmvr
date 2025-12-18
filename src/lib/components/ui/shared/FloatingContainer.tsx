import { Container } from "@react-three/uikit";
import { useMoveAndRotation } from "../../systems/inputs/MoveAndRotation";
import * as THREE from "three";

interface FloatingContainerProps {
    children?: React.ReactNode;
    originRef: React.RefObject<THREE.Group> | null;
    offset?: { x: number; y: number; z: number };
    classList?: string[];
    smoothFollow?: boolean;
    lerpFactor?: number;
    [key: string]: unknown;
}

export default function FloatingContainer({
    children,
    originRef,
    offset = { x: 0, y: 1.2, z: -4 },
    classList = [],
    ...containerProps
}: FloatingContainerProps) {
    const { groupRef, handlePointerDown, handlePointerMove, handlePointerUp } = useMoveAndRotation({
        originRef,
        offset,
    });

    return (
        <Container
            ref={groupRef as any}
            classList={classList}
            onPointerDown={handlePointerDown as any}
            onPointerMove={handlePointerMove as any}
            onPointerUp={handlePointerUp as any}
            {...containerProps}
        >
            {children}
        </Container>
    );
}
