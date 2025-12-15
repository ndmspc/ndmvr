import { Container as UIKitContainer } from "@react-three/uikit";
import { useUIInteraction } from "./useUIInteraction";

const mergeHandlers = (original, added) => (e) => {
    added?.(e);
    original?.(e);
};

export const Container = (props) => {
    const setInteracting = useUIInteraction.getState().setInteracting;

    return (
        <UIKitContainer
            {...props}
            // onPointerOver={mergeHandlers(props.onPointerOver, () => setInteracting(true))}
            // onPointerOut={mergeHandlers(props.onPointerOut, () => setInteracting(false))}
            onPointerDown={mergeHandlers(props.onPointerDown, () => setInteracting(true))}
            onPointerUp={mergeHandlers(props.onPointerUp, () => setInteracting(false))}
        />
    );
};

export default Container;
