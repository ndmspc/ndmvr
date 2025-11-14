import {Container, Text} from "@react-three/uikit";
import {Check} from "@react-three/uikit-lucide";

import {useState} from "react";

export default function Checkbox({label = "", onCheck, size = 24, checked: controlledChecked}) {
    const [internalChecked, setInternalChecked] = useState(false);

    const checked = controlledChecked !== undefined ? controlledChecked : internalChecked;

    const handleClick = (e) => {
        e.stopPropagation();
        const newValue = !checked;
        if (controlledChecked === undefined) {
            setInternalChecked(newValue);
        }
        onCheck?.(newValue);
    };

    return(
        <Container
            onClick={handleClick}
            classList={["checkboxContainer"]}
            flexDirection="row"
            alignItems="center"
            gap={8}
        >
            <Container
                width={size}
                height={size}
                classList={[
                    "checkboxBox",
                    checked ? "checkboxBoxChecked" : "foobar"
                ]}
                alignItems="center"
                justifyContent="center"
                // hover={{borderColor: '#10b981'}}
            >
                {checked && (
                    <Check
                        width={size * 0.7}
                        height={size * 0.7}
                        color={'#10b981'}
                    />
                )}
            </Container>
            {label && <Text classList={["checkboxLabel"]}>{label}</Text>}
        </Container>
    );
}