import {useState} from "react";
import {useXR} from "@react-three/xr";
import {Container, Text,} from "@react-three/uikit";
import {Button, Label, RadioGroup, RadioGroupItem} from "@react-three/uikit-default";

import FloatingContainer from "./FloatingContainer.jsx";
import SettingsPanel from "./SettingsPanel.jsx";
import {store} from "../../env/NdmvrEnv.jsx";
import Demo from "./Demo.jsx";
import ConnectionMenu from "./ConnectionMenu.jsx";
import BinInfo from "./BinInfo.jsx";
import WebsocketBanner from "./WebsocketBanner.jsx";
import DrawOptions from "./DrawOptions.jsx";

export default function Menu({
    originRef,
    offset = {x: 0, y: 1.2, z: -4},
    onClose,
    currentConfig,
    onConfigChange,
}) {

    const [loadMode, setLoadMode] = useState(null);
    const mode = useXR((state) => state.mode);
    const session = useXR((state) => state.session);

    return (
        <>
            {loadMode === 'demo' && <Demo originRef={originRef}/>}
            {loadMode === 'http' && <ConnectionMenu type="http" originRef={originRef} onClose={onClose}/>}
            {loadMode === 'ws' && <ConnectionMenu type="ws" originRef={originRef} onClose={onClose}/>}
            {loadMode === 'bin' && <BinInfo originRef={originRef}/>}
            {loadMode === 'opt' && <DrawOptions originRef={originRef}/>}
            {loadMode === 'settings' &&
                <SettingsPanel originRef={originRef} currentConfig={currentConfig} onConfigChange={onConfigChange}/>}

            {loadMode === null && (

                <FloatingContainer
                    originRef={originRef}
                    offset={offset}
                    classList={["menuContainer"]}
                >
                    <Text classList={["menuHeader"]}>Menu</Text>

                    <Container flexDirection="column" gap={8}>

                        <WebsocketBanner showTransient={loadMode !== "ws"}/>
                        <Container
                            classList={["menuBlock"]}
                        >
                            <RadioGroup onValueChange={setLoadMode}>
                                <RadioGroupItem value="demo">
                                    <Label>
                                        <Text>Demo</Text>
                                    </Label>
                                </RadioGroupItem>
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
                                <RadioGroupItem value="bin">
                                    <Label>
                                        <Text>Bin Information</Text>
                                    </Label>
                                </RadioGroupItem>
                                <RadioGroupItem value="opt">
                                    <Label>
                                        <Text>Histogram Draw Options</Text>
                                    </Label>
                                </RadioGroupItem>
                                <RadioGroupItem value="settings">
                                    <Label>
                                        <Text>Settings</Text>
                                    </Label>
                                </RadioGroupItem>
                            </RadioGroup>
                        </Container>

                        {mode === null ? (
                            <Button
                                classList={["VRButton"]}
                                onClick={() => store.enterVR()}
                                hover={{
                                    backgroundColor: '#475569',
                                }}
                            >
                                <Text>Enter VR</Text>
                            </Button>
                        ) : (
                            <Button
                                classList={["VRButton"]}
                                onClick={() => session.end()}
                                hover={{
                                    backgroundColor: '#475569',
                                }}
                            >
                                <Text>Exit VR</Text>
                            </Button>
                        )}
                    </Container>
                </FloatingContainer>
            )}

        </>
    );
}