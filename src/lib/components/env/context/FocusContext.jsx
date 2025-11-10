import { createContext, useContext, useState } from "react";

const FocusContext = createContext(false);

export const FocusProvider = ({ children }) => {
    const [focused, setFocused] = useState(false);
    return (
        <FocusContext.Provider value={{ focused, setFocused }}>
            {children}
        </FocusContext.Provider>
    );
};

export const useFocus = () => useContext(FocusContext);