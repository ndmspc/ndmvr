import { useContext, useEffect, useState } from "react";
import Checkbox from "./Checkbox.tsx";
import Dropdown, { DropdownProvider } from "./Dropdown.tsx";
import { histogramSubjectGet, stateSubjectGet } from "@ndmspc/ndmvr-aframe";
import { Text } from "@react-three/uikit";
import { Container } from "../interactions/Container";
import { Label, RadioGroup, RadioGroupItem } from "@react-three/uikit-default";
import FloatingContainer from "./FloatingContainer.tsx";
import WebsocketBanner from "./WebsocketBanner.tsx";
import { HistogramContext } from "../../env/NdmvrEnv.tsx";
import * as THREE from "three";

interface DrawOptionsProps {
    originRef: React.RefObject<THREE.Group>;
    offset?: { x: number; y: number; z: number };
}

export default function DrawOptions({
    originRef,
    offset = { x: 0, y: 1.2, z: -4 },
}: DrawOptionsProps) {
    const [availableArrays, setAvailableArrays] = useState([]);
    const [selectedArray, setSelectedArray] = useState("content");

    const [availableSets, setAvailableSets] = useState(["content"]);
    const [selectedSets, setSelectedSets] = useState([]);

    const [selectedRenderer, setSelectedRenderer] = useState("ndmvr");

    const histogram = useContext(HistogramContext);

    useEffect(() => {
        const stateSubject = stateSubjectGet()
            .getObservable()
            .subscribe((e) => {
                if (e.sets) setAvailableSets(e.sets);
                if (e.selectedSet) setSelectedSets(e.selectedSet);
                if (e.arrays) setAvailableArrays(e.arrays);
                if (e.selectedArray) setSelectedArray(e.selectedArray);
            });

        return () => {
            stateSubject.unsubscribe();
        };
    }, []);

    const updateStateSubject = (updates) => {
        const currentVal = stateSubjectGet().getValue();
        stateSubjectGet().next({ ...currentVal, ...updates });
    };

    const handleArraySelect = (value) => {
        setSelectedArray(value);

        if (histogram) {
            updateStateSubject({
                selectedSet: selectedSets,
                selectedArray: value,
            });
        }
    };

    const handleSetsSelect = (setValue, isChecked) => {
        const newSelectedSets = isChecked
            ? [...selectedSets, setValue]
            : selectedSets.filter((v) => v !== setValue);

        setSelectedSets(newSelectedSets);

        if (histogram) {
            updateStateSubject({
                selectedSet: newSelectedSets,
                selectedArray: selectedArray,
            });
        }
    };

    const handleRendererSelect = (value) => {
        setSelectedRenderer(value);

        console.log({
            id: histogram.id,
            opts: { render: value },
            obj: histogram.obj,
        });

        if (histogram) {
            histogramSubjectGet().next({
                id: histogram.id,
                opts: { render: value },
                obj: histogram.obj,
            });
        }
    };

    return (
        <FloatingContainer originRef={originRef} offset={offset} classList={["menuContainer"]}>
            <Text classList={["menuHeader"]}>Histogram Draw Option</Text>
            <WebsocketBanner />
            <DropdownProvider>
                <Container classList={["section", "sectionInner"]} flexDirection="column" gap={12}>
                    <Dropdown
                        placeholder={"Select array"}
                        options={availableArrays}
                        defaultValue={"content"}
                        onSelect={(value) => {
                            handleArraySelect(value);
                        }}
                        width={300}
                    />

                    <Container gap={50}>
                        <Container flexDirection="column" gap={8}>
                            <Text>Select Renderer:</Text>
                            <RadioGroup
                                defaultValue="ndmvr"
                                onValueChange={(value) => {
                                    handleRendererSelect(value);
                                }}
                            >
                                <RadioGroupItem value="ndmvr">
                                    <Label>
                                        <Text fontSize={16} fontWeight={"normal"}>
                                            ndmvr
                                        </Text>
                                    </Label>
                                </RadioGroupItem>
                                <RadioGroupItem value="jsroot">
                                    <Label>
                                        <Text fontSize={16} fontWeight={"normal"}>
                                            jsroot
                                        </Text>
                                    </Label>
                                </RadioGroupItem>
                            </RadioGroup>
                        </Container>

                        {selectedRenderer === "ndmvr" && (
                            <Container flexDirection="column" gap={8}>
                                {availableSets.length > 0 && <Text>Select Sets:</Text>}
                                {availableSets.map((setValue) => (
                                    <Checkbox
                                        key={setValue}
                                        label={setValue}
                                        checked={selectedSets.includes(setValue)}
                                        onCheck={(isChecked) =>
                                            handleSetsSelect(setValue, isChecked)
                                        }
                                        size={24}
                                    />
                                ))}
                            </Container>
                        )}
                    </Container>
                </Container>
            </DropdownProvider>
        </FloatingContainer>
    );
}
