import {Container} from "@react-three/uikit";
import {useMoveAndRotation} from "../../systems/inputs/MoveAndRotation.jsx";

export default function FloatingContainer({
                                              children,
                                              originRef,
                                              offset = {x: 0, y: 1.2, z: -4},
                                              smoothFollow = true,
                                              lerpFactor = 0.25,
                                              classList = [],
                                              ...containerProps
                                          }) {
    const {
        groupRef,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
    } = useMoveAndRotation({ originRef, offset, smoothFollow, lerpFactor });

    return (
        <Container
            ref={groupRef}
            classList={classList}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            {...containerProps}
        >
            {children}
        </Container>
    );
}
