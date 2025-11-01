import {useRef, useState, useEffect} from "react";
import {useFrame} from "@react-three/fiber";
import {useXR} from "@react-three/xr";
import {Container, Root, Text} from "@react-three/uikit";
import {Button, Card, Defaults, Input} from "@react-three/uikit-apfel";
import {Label, RadioGroup, RadioGroupItem} from "@react-three/uikit-default";
import {histogramSubjectGet} from "@ndmspc/ndmvr-aframe";
import {parse} from "jsroot";

import TreeViewer from "./TreeViewer.jsx";
import openapiSchema from "../../../../openapi.json";
import SettingsPanel from "./SettingsPanel.jsx";
import {useBrokerStore} from "../../../stores/broker/store.js";
import {store} from "../../env/NdmvrEnv.jsx";
import InputCard from "./InputCard.jsx";
import WebsocketBanner from "./WebsocketBanner.jsx";

export default function Menu({
                               originRef,
                               offset = {x: 0, y: 1, z: -4},
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
          histogram: rootObj.arr?.[0] ?? rootObj,
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
    <group ref={groupRef}>
      <Defaults>
        <Root>
          <Container
            flexDirection="column"
            alignItems="center"
            gap={32}
            width={500}
          >
            <Card
              borderRadius={32}
              padding={16}
              flexDirection="column"
              alignItems="center"
              gap={8}
            >
              <Text fontSize={20}>Menu</Text>


              <WebsocketBanner showTransient={loadMode !== "ws"}/>

              <Container
                flexDirection="column"
                justifyContent="space-between"
                alignItems="stretch"
                gapRow={8}
              >
                <Container flexDirection="row" gap={8}>
                  <Container flexDirection="column" gap={8}>
                    <Card
                      borderRadius={16}
                      flexDirection="column"
                      gap={4}
                      padding={4}
                      paddingTop={8}
                      paddingBottom={8}
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
                    </Card>

                    <InputCard
                      type="http"
                      placeholder="http://"
                      value={inputValues.http}
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
                      value={inputValues.ws}
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

                    {loadMode === "ws" &&
                      <RadioGroup onValueChange={(v) => {
                        setInputValues((p) => ({...p, ws: v}));
                      }}>
                        <RadioGroupItem value="ws://localhost:8080/ws/root.websocket">
                          <Label>
                            <Text>Test</Text>
                          </Label>
                        </RadioGroupItem>
                        <RadioGroupItem value="ws://ndmspc.cern.ch/ws/root.websocket">
                          <Label>
                            <Text>Production</Text>
                          </Label>
                        </RadioGroupItem>
                      </RadioGroup>
                    }

                      {loadMode === "Settings" && (
                          <SettingsPanel
                              openapiSchema={openapiSchema}
                              currentConfig={currentConfig}
                              onConfigChange={onConfigChange}
                          />
                      )}
                  </Container>
                </Container>

                <Container
                  flexDirection="row"
                  justifyContent="space-evenly"
                  gap={8}
                >
                  {mode === null ? (
                    <Button
                      variant="rect"
                      size="sm"
                      platter
                      flexGrow={1}
                      onClick={() => store.enterVR()}
                    >
                      <Text>Enter VR</Text>
                    </Button>
                  ) : (
                    <Button
                      variant="rect"
                      size="sm"
                      platter
                      flexGrow={1}
                      onClick={() => session.end()}
                    >
                      <Text>Exit VR</Text>
                    </Button>
                  )}
                </Container>
              </Container>
            </Card>
          </Container>
        </Root>
      </Defaults>
    </group>
  );
}