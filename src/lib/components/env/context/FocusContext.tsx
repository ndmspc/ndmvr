import { createContext, useContext, useState } from "react";

type FocusContextType = {
    focused: boolean;
    setFocused: (focused: boolean) => void;
};

const FocusContext = createContext<FocusContextType>({
    focused: false,
    setFocused: () => {},
});

export const FocusProvider = ({ children }) => {
    const [focused, setFocused] = useState(false);
    return (
        <FocusContext.Provider value={{ focused, setFocused }}>
            {children}
        </FocusContext.Provider>
    );
};

export const useFocus = () => useContext(FocusContext);
