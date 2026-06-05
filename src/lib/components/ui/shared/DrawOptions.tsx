import { useContext, useEffect, useState } from "react";
import Checkbox from "./Checkbox.tsx";
import Dropdown, { DropdownProvider } from "./Dropdown.tsx";
import { histogramSubjectGet, stateSubjectGet } from "@ndmspc/ndmvr-core";
import { Text } from "@react-three/uikit";
import { Container } from "../interactions/Container";
import { Button, Label, RadioGroup, RadioGroupItem } from "@react-three/uikit-default";
import WebsocketBanner from "./WebsocketBanner.tsx";
import { HistogramContext } from "../../scene/NdmvrContent.tsx";
import { Input } from "../focus/Input.tsx";

type MinMaxFieldValues = {
    valueMin: string;
    valueMax: string;
    errorMin: string;
    errorMax: string;
};

const EMPTY_MIN_MAX_FORM: MinMaxFieldValues = {
    valueMin: "",
    valueMax: "",
    errorMin: "",
    errorMax: "",
};

const toInputString = (value) => {
    if (value === null || value === undefined) return "";
    const parsed = Number(value);
    return Number.isNaN(parsed) ? "" : String(value);
};

const readMinMaxPair = (source) => {
    if (!source) return ["", ""];

    if (Array.isArray(source)) {
        return [toInputString(source[0]), toInputString(source[1])];
    }

    if (typeof source === "object") {
        const minValue = source.min ?? source.minimum ?? source[0];
        const maxValue = source.max ?? source.maximum ?? source[1];
        return [toInputString(minValue), toInputString(maxValue)];
    }

    return ["", ""];
};

const extractMinMaxForm = (selectedArrayMinMax): MinMaxFieldValues => {
    if (!selectedArrayMinMax || typeof selectedArrayMinMax !== "object") {
        return EMPTY_MIN_MAX_FORM;
    }

    const valueSource =
        selectedArrayMinMax.value ??
        selectedArrayMinMax.values ??
        selectedArrayMinMax.val ??
        selectedArrayMinMax;
    const errorSource =
        selectedArrayMinMax.error ??
        selectedArrayMinMax.errors ??
        selectedArrayMinMax.err ??
        null;

    const [valueMin, valueMax] = readMinMaxPair(valueSource);
    const [errorMin, errorMax] = readMinMaxPair(errorSource);

    return {
        valueMin,
        valueMax,
        errorMin,
        errorMax,
    };
};

const toNumberOrNull = (value: string) => {
    if (value === "") return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
};

export default function DrawOptions() {
    const [availableArrays, setAvailableArrays] = useState([]);
    const [selectedArray, setSelectedArray] = useState("content");

    const [availableSets, setAvailableSets] = useState(["content"]);
    const [selectedSets, setSelectedSets] = useState([]);

    const [selectedRenderer, setSelectedRenderer] = useState("ndmvr");

    const [minMaxValue, setMinMaxValue] = useState(null);
    const [minMaxForm, setMinMaxForm] = useState<MinMaxFieldValues>(EMPTY_MIN_MAX_FORM);

    const histogram = useContext(HistogramContext);

    useEffect(() => {
        if (!histogram) return;
        const stateSubject = stateSubjectGet(histogram.id)
            .getObservable()
            .subscribe((e) => {
                if (e.sets) setAvailableSets(e.sets);
                if (e.selectedSet) setSelectedSets(e.selectedSet);
                if (e.arrays) setAvailableArrays(e.arrays);
                if (e.selectedArray) setSelectedArray(e.selectedArray);
                if (e.minMaxValue) setMinMaxValue(e.minMaxValue);


            });

        return () => {
            stateSubject.unsubscribe();
        };
    }, [histogram]);

    useEffect(() => {
        if (!minMaxValue?.length) {
            setMinMaxForm(EMPTY_MIN_MAX_FORM);
            return;
        }

        const latestMinMax = minMaxValue[minMaxValue.length - 1]?.[selectedArray];
        console.log("MinMaxValue updated:", latestMinMax);
        setMinMaxForm(extractMinMaxForm(latestMinMax));
    }, [minMaxValue, selectedArray]);



    const updateStateSubject = (updates) => {
        const currentVal = stateSubjectGet(histogram.id).getValue();
        stateSubjectGet(histogram.id).next({ ...currentVal, ...updates });
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

    const handleMinMaxChange = (field: keyof MinMaxFieldValues, value: string) => {
        setMinMaxForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmitMinMax = () => {
        if (!histogram) return;

        const payload = {
            value: {
                min: toNumberOrNull(minMaxForm.valueMin),
                max: toNumberOrNull(minMaxForm.valueMax),
            },
            error: {
                min: toNumberOrNull(minMaxForm.errorMin),
                max: toNumberOrNull(minMaxForm.errorMax),
            }
        };

        const previousMinMaxValue = Array.isArray(minMaxValue) ? minMaxValue : [];

        if (previousMinMaxValue.length === 0) {
            const initializedMinMaxValue = [{ [selectedArray]: payload }];
            setMinMaxValue(initializedMinMaxValue);
            updateStateSubject({ minMaxValue: initializedMinMaxValue });
            console.log("Submitted min/max payload:", payload);
            return;
        }

        const updatedMinMaxValue = [...previousMinMaxValue];
        const lastIndex = updatedMinMaxValue.length - 1;
        const lastEntry = updatedMinMaxValue[lastIndex] ?? {};

        updatedMinMaxValue[lastIndex] = {
            ...lastEntry,
            [selectedArray]: payload,
        };

        setMinMaxValue(updatedMinMaxValue);
        updateStateSubject({ minMaxValue: updatedMinMaxValue });
        console.log("Submitted min/max payload:", payload);
    };

    return (
        <Container classList={["menuContainer"]}>
            <Text classList={["menuHeader"]}>Histogram Draw Option</Text>
            <WebsocketBanner />
            <DropdownProvider>
                <Container classList={["section", "sectionInner"]} flexDirection="column" gap={12}>
                    <Dropdown
                        placeholder={"Select array"}
                        options={availableArrays}
                        defaultValue={selectedArray || (availableArrays.length > 0 ? availableArrays[0] : "")}
                        onSelect={(value) => {
                            handleArraySelect(value);
                        }}
                        width={300}
                    />
                    <Container flexDirection="column" gap={8}>
                        <Text>Value:</Text>
                        <Container gap={8}>
                            <Input
                                classList={["input"]}
                                minWidth={140}
                                value={minMaxForm.valueMin}
                                onValueChange={(value) => handleMinMaxChange("valueMin", value)}
                                // @ts-ignore - multiline prop exists at runtime but is missing from @react-three/uikit types
                                multiline={false}
                                placeholder="min"
                            />
                            <Input
                                classList={["input"]}
                                minWidth={140}
                                value={minMaxForm.valueMax}
                                onValueChange={(value) => handleMinMaxChange("valueMax", value)}
                                // @ts-ignore - multiline prop exists at runtime but is missing from @react-three/uikit types
                                multiline={false}
                                placeholder="max"
                            />
                        </Container>

                        <Text>Error:</Text>
                        <Container gap={8}>
                            <Input
                                classList={["input"]}
                                minWidth={140}
                                value={minMaxForm.errorMin}
                                onValueChange={(value) => handleMinMaxChange("errorMin", value)}
                                // @ts-ignore - multiline prop exists at runtime but is missing from @react-three/uikit types
                                multiline={false}
                                placeholder="min"
                            />
                            <Input
                                classList={["input"]}
                                minWidth={140}
                                value={minMaxForm.errorMax}
                                onValueChange={(value) => handleMinMaxChange("errorMax", value)}
                                // @ts-ignore - multiline prop exists at runtime but is missing from @react-three/uikit types
                                multiline={false}
                                placeholder="max"
                            />
                        </Container>

                        <Button
                            // @ts-ignore - classList prop exists at runtime but is missing from @react-three/uikit-default types
                            classList={["buttonPrimary"]}
                            hover={{ backgroundColor: "#059669" }}
                            onClick={handleSubmitMinMax}
                        >
                            <Text>Apply min/max</Text>
                        </Button>
                    </Container>

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
        </Container>
    );
}

DrawOptions.menuName = "opt";
DrawOptions.menuLabel = "Histogram Draw Options";
