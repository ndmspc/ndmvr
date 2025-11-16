import {Container, Text} from "@react-three/uikit";
import {ChevronDown, ChevronUp} from "@react-three/uikit-lucide";
import {createContext, useContext, useId, useState} from "react";

const DropdownContext = createContext({
    openDropdownId: null,
    setOpenDropdownId: () => {
    }
});

export function DropdownProvider({children}) {
    const [openDropdownId, setOpenDropdownId] = useState(null);

    return (
        <DropdownContext.Provider value={{openDropdownId, setOpenDropdownId}}>
            {children}
        </DropdownContext.Provider>
    );
}

export default function Dropdown({
    options = [],
    onSelect,
    width = 350,
    placeholder = "Select option",
    defaultValue = null,
    maxVisibleItems = 3
}) {
    const id = useId();
    const context = useContext(DropdownContext);
    if (!context) {
        throw new Error('Dropdown must be used within DropdownProvider');
    }
    const {openDropdownId, setOpenDropdownId} = context;
    const [selected, setSelected] = useState(defaultValue);

    const isOpen = openDropdownId === id;

    const itemHeight = 45;
    const maxHeight = itemHeight * maxVisibleItems + 1;

    const handleToggle = () => {
        if (isOpen) {
            setOpenDropdownId(null);
        } else {
            setOpenDropdownId(id);
        }
    };

    return (
        <Container
            minWidth={width} flexDirection="column"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onPointerEnter={(e) => e.stopPropagation()}
            onPointerLeave={(e) => e.stopPropagation()}
            onPointerOver={(e) => e.stopPropagation()}
            onPointerOut={(e) => e.stopPropagation()}
            width={width}
        >
            <Container
                onClick={handleToggle}
                classList={["dropdown"]}
            >
                <Container classList={["dropdownText"]}>
                    <Text>{selected || placeholder}</Text>
                </Container>
                {!isOpen && (<ChevronDown color={'#475569'}/>)}
                {isOpen && (<ChevronUp color={'#475569'}/>)}
            </Container>

            {isOpen && (
                <Container
                    classList={["dropdownListWrapper"]}
                    positionType="absolute"
                    positionTop={54}
                    positionLeft={0}
                    maxHeight={maxHeight}
                >
                    <Container
                        classList={["dropdownList"]}
                        flexDirection="column"
                        overflowY="scroll"
                        overflowX="scroll"
                        height="100%"
                    >
                        {options.map((opt, index) => (
                            <Container
                                key={opt}
                                classList={[
                                    "dropdownItem",
                                    selected === opt ? "dropdownItemSelected" : "foobar"
                                ]}
                                hover={{backgroundColor: "#059669"}}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    console.log("Clicked:", opt);
                                    setSelected(opt);
                                    setOpenDropdownId(null);
                                    onSelect?.(opt);
                                }}
                            >
                                <Text>{opt}</Text>
                            </Container>
                        ))}
                    </Container>
                </Container>
            )}
        </Container>
    );
}