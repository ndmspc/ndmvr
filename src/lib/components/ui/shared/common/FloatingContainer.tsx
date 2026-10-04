import InteractionContainer from "./InteractionContainer";
import { useMoveAndRotation } from "../../../../interactions/spatial/useMoveAndRotation";

interface FloatingContainerProps {
    children?: React.ReactNode;
    offset?: { x: number; y: number; z: number };
    classList?: string[];
    smoothFollow?: boolean;
    lerpFactor?: number;
    faceUser?: boolean;
    storageKey?: string;
    [key: string]: unknown;
}

export default function FloatingContainer({
    children,
    offset = { x: 0, y: 1.2, z: -4 },
    classList = [],
    faceUser = true,
    storageKey,
    ...containerProps
}: FloatingContainerProps) {
    const { groupRef, handlePointerDown, handlePointerMove, handlePointerUp } = useMoveAndRotation({
        offset,
        faceUser,
        storageKey,
    });

    return (
        <InteractionContainer
            ref={groupRef as any}
            classList={classList}
            onPointerDown={handlePointerDown as any}
            onPointerMove={handlePointerMove as any}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            {...containerProps}
        >
            {children}
        </InteractionContainer>
    );
}
