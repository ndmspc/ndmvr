import { useEffect, useState } from "react";
import Checkbox from "./Checkbox.tsx";
import Dropdown, { DropdownProvider } from "./Dropdown.tsx";
import { histogramSubjectGet, stateSubjectGet } from "@ndmspc/ndmvr-core";
import { Text } from "@react-three/uikit";
import { Container } from "../interactions/Container";
import h3scat from "../../../data/h3scat.json";
import histo125 from "../../../data/nested/test_125.json";
import histo12_5 from "../../../data/nested/test_12_5.json";
import histo1_25 from "../../../data/nested/test_1_25.json";
import histo1_2_5 from "../../../data/nested/test_1_2_5.json";
import histo5_2_1 from "../../../data/nested/test_5_2_1.json";
import cernstaff_145_369 from "../../../data/nested/cernstaff_145_369.json";
import * as THREE from "three";

import { Label, RadioGroup, RadioGroupItem } from "@react-three/uikit-default";
import FloatingContainer from "./FloatingContainer.tsx";
import WebsocketBanner from "./WebsocketBanner.tsx";

interface DemoProps {
    originRef: React.RefObject<THREE.Group>;
    offset?: { x: number; y: number; z: number };
}

export default function Demo({ originRef, offset = { x: 0, y: 1.2, z: -4 } }: DemoProps) {
    const [selectedHistogram, setSelectedHistogram] = useState(null);

    const [availableArrays, setAvailableArrays] = useState([]);
    const [selectedArray, setSelectedArray] = useState("content");

    const [availableSets, setAvailableSets] = useState(["content"]);
    const [selectedSets, setSelectedSets] = useState([]);

    const [selectedRenderer, setSelectedRenderer] = useState("ndmvr");

    const idHistogram = "pad1";
    const histogramOptions = [
        "h3scat",
        "cernstaff_145_369",
        "histo125",
        "histo12_5",
        "histo1_25",
        "histo1_2_5",
        "histo5_2_1",
    ];

    useEffect(() => {
        const stateSubject = stateSubjectGet(idHistogram)
            .getObservable()
            .subscribe((e) => {
                if (e.sets) setAvailableSets(e.sets);
                if (e.selectedSet) setSelectedSets(e.selectedSet);
                if (e.arrays) setAvailableArrays(e.arrays);
                if (e.selectedArray) setSelectedArray(e.selectedArray);
            });

        setAvailableSets([]);
        setSelectedSets([]);
        setAvailableArrays(["content"]);
        setSelectedArray("content");

        return () => {
            stateSubject.unsubscribe();
        };
    }, []);

    const updateStateSubject = (updates) => {
        const currentVal = stateSubjectGet(idHistogram).getValue();
        stateSubjectGet(idHistogram).next({ ...currentVal, ...updates });
    };

    const handleHistogramSelect = (value) => {
        let histogram;
        switch (value) {
            case "h3scat":
                histogram = h3scat;
                break;
            case "cernstaff_145_369":
                histogram = cernstaff_145_369;
                break;
            case "histo125":
                histogram = histo125;
                break;
            case "histo12_5":
                histogram = histo12_5;
                break;
            case "histo1_25":
                histogram = histo1_25;
                break;
            case "histo1_2_5":
                histogram = histo1_2_5;
                break;
            case "histo5_2_1":
                histogram = histo5_2_1;
                break;
        }

        setSelectedHistogram(histogram);

        histogramSubjectGet().next({
            id: idHistogram,
            opts: { render: selectedRenderer },
            obj: histogram,
        });
    };

    const handleArraySelect = (value) => {
        setSelectedArray(value);

        if (selectedHistogram) {
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

        if (selectedHistogram) {
            updateStateSubject({
                selectedSet: newSelectedSets,
                selectedArray: selectedArray,
            });
        }
    };

    const handleRendererSelect = (value) => {
        setSelectedRenderer(value);

        if (selectedHistogram) {
            histogramSubjectGet().next({
                id: idHistogram,
                opts: { render: value },
                obj: selectedHistogram,
            });
        }
    };

    return (
        <FloatingContainer originRef={originRef} offset={offset} classList={["menuContainer"]}>
            <Text classList={["menuHeader"]}>Demo</Text>
            <WebsocketBanner />
            <DropdownProvider>
                <Container classList={["section", "sectionInner"]} flexDirection="column" gap={12}>
                    <Dropdown
                        placeholder={"Select histogram"}
                        options={histogramOptions}
                        onSelect={(value) => {
                            handleHistogramSelect(value);
                        }}
                        maxVisibleItems={5}
                        width={300}
                    />

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
