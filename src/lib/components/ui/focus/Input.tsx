import { Input as UIKitInput } from "@react-three/uikit";
import { useInputFocus } from "./useInputFocus";

const mergeHandlers = (original, added) => (e) => {
    added?.(e);
    original?.(e);
};

export const Input = (props) => {
    const setFocused = useInputFocus((state) => state.setFocused);

    return (
        <UIKitInput
            {...props}
            onFocusChange={mergeHandlers(props.onFocusChange, (c) => {
                setFocused(c);
                console.log("Input focus changed:", c);
            })}
        />
    );
};

export default Input;
