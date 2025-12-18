import { useEffect, useState } from "react";
import Checkbox from "./Checkbox.tsx";
import Dropdown, { DropdownProvider } from "./Dropdown.tsx";
import { histogramSubjectGet, stateSubjectGet } from "@ndmspc/ndmvr-core";
import { Text } from "@react-three/uikit";
import { Container } from "../interactions/Container";
import * as THREE from "three";

import { Label, RadioGroup, RadioGroupItem } from "@react-three/uikit-default";
import FloatingContainer from "./FloatingContainer.tsx";
import { Divider } from "@react-three/uikit-horizon";
import { useBrokerStore } from "../../../stores/broker/store.ts";
import { parse } from "jsroot";
import InputCard from "./InputCard.tsx";
import WebsocketBanner from "./WebsocketBanner.tsx";

interface ConnectionMenuProps {
    originRef?: React.RefObject<THREE.Group> | null;
    offset?: { x: number; y: number; z: number };
    type?: "http" | "ws" | null;
    onClose?: (() => void) | null;
}

export default function ConnectionMenu({
    originRef = null,
    offset = { x: 0, y: 1.2, z: -4 },
    type = null,
    onClose = null,
}: ConnectionMenuProps) {
    const [selectedHistogram, setSelectedHistogram] = useState(null);

    const [availableArrays, setAvailableArrays] = useState([]);
    const [selectedArray, setSelectedArray] = useState("content");

    const [availableSets, setAvailableSets] = useState(["content"]);
    const [selectedSets, setSelectedSets] = useState([]);

    const [selectedRenderer, setSelectedRenderer] = useState("ndmvr");

    const idHistogram = "histogram1";

    useEffect(() => {
        const stateSubject = stateSubjectGet()
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
        const currentVal = stateSubjectGet().getValue();
        stateSubjectGet().next({ ...currentVal, ...updates });
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

    const [inputValues, setInputValues] = useState({
        http: "https://eos.ndmspc.io/eos/ndmspc/scratch/ndmspc/ndmvr-core/demo/test_125.json",
        ws: "ws://localhost:8080/ws/root.websocket",
    });

    const [validationStatus, setValidationStatus] = useState({
        http: null,
        ws: null,
    });

    const { connectionStatus, error, connect } = useBrokerStore();

    const [httpLoading, setHttpLoading] = useState(false);
    const [httpLoaded, setHttpLoaded] = useState(false);
    const [clicked, setClicked] = useState(false);

    const validateUrl = (value, type) => {
        const regex = type === "http" ? /^https?:\/\// : /^wss?:\/\//;
        return regex.test(value);
    };

    const handleLoadClick = async (type) => {
        setClicked(true);
        const value = inputValues[type];
        const isValid = validateUrl(value, type);

        setValidationStatus((prev) => ({
            ...prev,
            [type]: isValid ? "success" : "error",
        }));
        if (!isValid) return;

        if (type === "ws") {
            connect(value);

            // const checkConnection = setInterval(() => {
            //     if (connectionStatus === 'connected') {
            //         clearInterval(checkConnection);
            //         if (onClose) onClose();
            //     }
            // }, 100);
            //
            // setTimeout(() => clearInterval(checkConnection), 5000);
        }

        if (type === "http") {
            if (httpLoading) return;

            setHttpLoading(true);
            setHttpLoaded(false);

            try {
                const res = await fetch(value);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const obj = await res.json();
                const rootObj = parse(obj);

                // histogramSubjectGet().next({
                //     id: "histogram1",
                //     opts: {
                //         render: "ndmvr",
                //         config: {
                //             TH1ZScale: {
                //                 default: 0.8,
                //                 layer: [0.08, 1, 1, 1],
                //                 set: 0.1,
                //             },
                //             color: {
                //                 default: {
                //                     min: "0x0033ff",
                //                     max: "0xff3300",
                //                 },
                //             }
                //         }
                //     },
                //     obj: rootObj.arr?.[0] ?? rootObj,
                // });

                setSelectedHistogram(rootObj.arr?.[0] ?? rootObj);

                histogramSubjectGet().next({
                    id: idHistogram,
                    opts: { render: selectedRenderer },
                    obj: rootObj.arr?.[0] ?? rootObj,
                });

                setHttpLoaded(true);
                // if (onClose) {
                //     setTimeout(() => onClose(), 500);
                // }
            } catch (err) {
                console.error("Failed to load:", err);
                setValidationStatus((prev) => ({ ...prev, [type]: "error" }));
            } finally {
                setHttpLoading(false);
            }
        }
    };

    return (
        <FloatingContainer originRef={originRef} offset={offset} classList={["menuContainer"]}>
            <Text classList={["menuHeader"]}>
                {type === "http" ? "Fetch via HTTP" : "Live Stream (WebSocket)"}
            </Text>
            <DropdownProvider>
                <Container classList={["section", "sectionInner"]} flexDirection="column" gap={12}>
                    {type === "http" && <WebsocketBanner />}

                    <InputCard
                        type="http"
                        placeholder="http://"
                        firstValue={inputValues.http}
                        onChange={(v) => {
                            setInputValues((p) => ({ ...p, http: v }));
                            setValidationStatus((p) => ({ ...p, http: null }));
                        }}
                        status={validationStatus.http}
                        modeSelected={type}
                        loading={httpLoading}
                        loaded={httpLoaded}
                        onSubmit={() => handleLoadClick("http")}
                    />

                    <InputCard
                        type="ws"
                        placeholder="ws://"
                        firstValue={inputValues.ws}
                        onChange={(v) => {
                            setInputValues((p) => ({ ...p, ws: v }));
                            setValidationStatus((p) => ({ ...p, ws: null }));
                        }}
                        status={validationStatus.ws}
                        modeSelected={type}
                        connStatus={connectionStatus}
                        connError={error}
                        onSubmit={() => handleLoadClick("ws")}
                    />

                    {clicked === true && (
                        <>
                            <Divider />
                            <Container gap={12} alignItems="center" flexDirection={"column"}>
                                {/*<Container gap={12} flexDirection="column">*/}
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
                                    {type === "http" && (
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
                                    )}
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
                        </>
                    )}
                </Container>
                {/*</Container>*/}
            </DropdownProvider>
        </FloatingContainer>
    );
}
