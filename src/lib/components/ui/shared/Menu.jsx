import {useRef, useState} from "react";
import {useFrame} from "@react-three/fiber";
import {useXR} from "@react-three/xr";
import {Container, Text} from "@react-three/uikit";
import {Button, Label, RadioGroup, RadioGroupItem} from "@react-three/uikit-default";
import {histogramSubjectGet} from "@ndmspc/ndmvr-aframe";
import {parse} from "jsroot";

import InputCard from "./InputCard.jsx";
import TreeViewer from "./TreeViewer.jsx";
import openapiSchema from "../../../../ndmvrConfigOpenApi.json";
import SettingsPanel from "./SettingsPanel.jsx";
import {useBrokerStore} from "../../../stores/broker/store.js";
import {store} from "../../env/NdmvrEnv.jsx";


export default function Menu({
    originRef,
    offset = {x: 0, y: 1.2, z: -4},
    onClose,
    currentConfig,
    onConfigChange,
}) {
    const [loadMode, setLoadMode] = useState(null);
    const [inputValues, setInputValues] = useState({
        http: "https://eos.ndmspc.io/eos/ndmspc/scratch/ndmspc/ndmvr-aframe/demo/test_1_2_5.json",
        ws: "ws://localhost:8080/ws/root.websocket",
    });

    const [validationStatus, setValidationStatus] = useState({
        http: null,
        ws: null,
    });


    const {connectionStatus, error, connect} =
        useBrokerStore();

    const [httpLoading, setHttpLoading] = useState(false);
    const [httpLoaded, setHttpLoaded] = useState(false);

    const groupRef = useRef();
    const mode = useXR((state) => state.mode);
    const session = useXR((state) => state.session);

    useFrame(() => {
        if (originRef?.current && groupRef.current) {
            const {x, y, z} = originRef.current.position;
            groupRef.current.position.set(x + offset.x, y + offset.y, z + offset.z);
        }
    });

    const validateUrl = (value, type) => {
        const regex = type === "http" ? /^https?:\/\// : /^wss?:\/\//;
        return regex.test(value);
    };

    const handleLoadClick = async (type) => {
        const value = inputValues[type];
        const isValid = validateUrl(value, type);

        setValidationStatus((prev) => ({
            ...prev,
            [type]: isValid ? "success" : "error",
        }));
        if (!isValid) return;

        if (type === "ws") {
            connect(value);

            const checkConnection = setInterval(() => {
                if (connectionStatus === 'connected') {
                    clearInterval(checkConnection);
                    if (onClose) onClose();
                }
            }, 100);

            setTimeout(() => clearInterval(checkConnection), 5000);

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

                histogramSubjectGet().next({
                    id: "histogram1",
                    opts: {
                        render: "ndmvr",
                        config: {
                            TH1ZScale: {
                                default: 0.8,
                                layer: [0.08, 1, 1, 1],
                                set: 0.1,
                            },
                            color: {
                                default: {
                                    min: "0x0033ff",
                                    max: "0xff3300",
                                },
                            }
                        }
                    },
                    obj: rootObj.arr?.[0] ?? rootObj,
                });
                setHttpLoaded(true);
                if (onClose) {
                    setTimeout(() => onClose(), 500);
                }
            } catch (err) {
                console.error("Failed to load:", err);
                setValidationStatus((prev) => ({...prev, [type]: "error"}));
            } finally {
                setHttpLoading(false);
            }
        }
    };

    return (

        <Container
            ref={groupRef}
            classList={["menuContainer"]}
        >
            <Text classList={["menuHeader"]}>Menu</Text>

            {/*<WebsocketBanner showTransient={loadMode !== "ws"}/>*/}


            <Container flexDirection="column" gap={8}>
                <Container
                    classList={["menuBlock"]}
                >
                    <RadioGroup onValueChange={setLoadMode}>
                        <RadioGroupItem value="http">
                            <Label>
                                <Text>Fetch via HTTP</Text>
                            </Label>
                        </RadioGroupItem>
                        <RadioGroupItem value="ws">
                            <Label>
                                <Text>Live Stream (WebSocket)</Text>
                            </Label>
                        </RadioGroupItem>
                        <RadioGroupItem value="Settings">
                            <Label>
                                <Text>Settings</Text>
                            </Label>
                        </RadioGroupItem>
                    </RadioGroup>
                </Container>

                <InputCard
                    type="http"
                    placeholder="http://"
                    firstValue={inputValues.http}
                    onChange={(v) => {
                        setInputValues((p) => ({...p, http: v}));
                        setValidationStatus((p) => ({...p, http: null}));
                    }}
                    status={validationStatus.http}
                    modeSelected={loadMode}
                    loading={httpLoading}
                    loaded={httpLoaded}
                    onSubmit={() => handleLoadClick("http")}
                />

                <InputCard
                    type="ws"
                    placeholder="ws://"
                    firstValue={inputValues.ws}
                    onChange={(v) => {
                        setInputValues((p) => ({...p, ws: v}));
                        setValidationStatus((p) => ({...p, ws: null}));
                    }}
                    status={validationStatus.ws}
                    modeSelected={loadMode}
                    connStatus={connectionStatus}
                    connError={error}
                    onSubmit={() => handleLoadClick("ws")}
                />


                {loadMode === "Settings" && (
                    <SettingsPanel
                        openapiSchema={openapiSchema}
                        currentConfig={currentConfig}
                        onConfigChange={onConfigChange}
                    />
                )}

                {mode === null ? (
                    <Button
                        classList={["VRButton"]}
                        onClick={() => store.enterVR()}
                    >
                        <Text>Enter VR</Text>
                    </Button>
                ) : (
                    <Button
                        classList={["VRButton"]}
                        onClick={() => session.end()}
                    >
                        <Text>Exit VR</Text>
                    </Button>
                )}
            </Container>


        </Container>
    );
}