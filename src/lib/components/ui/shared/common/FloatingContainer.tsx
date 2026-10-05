import InteractionContainer from "./InteractionContainer";
import { useMoveAndRotation } from "../../../../interactions/spatial/useMoveAndRotation";
import type { ComponentProps } from "react";

type ContainerProps = ComponentProps<typeof InteractionContainer>;

type FloatingContainerProps = ContainerProps & {
    offset?: { x: number; y: number; z: number };
    faceUser?: boolean;
    storageKey?: string;
};

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
            ref={groupRef as unknown as ContainerProps["ref"]}
            classList={classList}
            onPointerDown={handlePointerDown as ContainerProps["onPointerDown"]}
            onPointerMove={handlePointerMove as ContainerProps["onPointerMove"]}
            onPointerUp={handlePointerUp as ContainerProps["onPointerUp"]}
            onPointerCancel={handlePointerUp as ContainerProps["onPointerCancel"]}
            {...containerProps}
        >
            {children}
        </InteractionContainer>
    );
}
