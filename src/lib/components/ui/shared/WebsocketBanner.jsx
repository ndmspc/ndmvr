import {Container, Text} from "@react-three/uikit";
import {Button} from "@react-three/uikit-default";
import {Cross} from "@react-three/uikit-lucide"

import {useBrokerStore} from "../../../stores/broker/store.js";
import {STAT} from "../../../stores/broker/constants.js";

const trimUrl = (s, head = 40, tail = 40) => {
    if (!s) return "";
    return s.length <= head + tail ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;
};

export default function WebsocketBanner({showTransient = true}) {
    const wsUrl = useBrokerStore((s) => s.wsUrl);
    const status = useBrokerStore((s) => s.connectionStatus);
    const error = useBrokerStore((s) => s.error);
    const disconnect = useBrokerStore((s) => s.disconnect);
    const clearError = useBrokerStore((s) => s.clearError);

    const Banner = ({color = "gray", children}) => (
        <Container
            flexDirection="row"
            justifyContent="space-evenly"
            gap={8}
            borderWidth={2}
            borderColor={color}
            borderStyle="solid"
            borderRadius={16}
            padding={8}
            marginBottom={12}
        >
            {children}
        </Container>
    );

    if (status === STAT.CONNECTED) {
        return (
            <Banner color="lightgreen">
                <Container flexDirection="row" gap={4} alignItems="center">
                    <Text paddingLeft={10} fontSize={12} color="lightgreen">
                        Connected to:
                    </Text>
                    <Text fontSize={12} color="lightgreen" fontWeight="bold">
                        {trimUrl(wsUrl)}
                    </Text>
                </Container>
                <Button
                    classList={["webSocketButton"]}
                    hover={{backgroundColor: "#059669"}}
                    onClick={disconnect}
                >
                    <Text>Disconnect</Text>
                </Button>
            </Banner>
        );
    }

    if (!showTransient) return null;

    if (status === STAT.CONNECTING) {
        return (
            <Banner color="lightgreen">
                <Container flexDirection="column">
                    <Text paddingLeft={10} fontSize={12}>
                        Connecting to {trimUrl(wsUrl)} ...
                    </Text>
                    {/*<Loading alignSelf="center" size="lg"/>*/}
                    <Button
                        classList={["webSocketButton"]}
                        hover={{backgroundColor: "#059669"}}
                        onClick={disconnect}
                    >
                        <Text>Disconnect</Text>
                    </Button>
                </Container>
            </Banner>
        );
    }
    if (status === STAT.RECONNECTING) {
        return (
            <Banner color="orange">
                <Container flexDirection="column">
                    <Text paddingLeft={10} fontSize={12} color="orange">
                        Reconnecting to {trimUrl(wsUrl)} ...
                    </Text>
                    {/*<Loading alignSelf="center" size="lg"/>*/}
                    <Button
                        classList={["webSocketButton"]}
                        hover={{backgroundColor: "#059669"}}
                        onClick={disconnect}
                    >
                        <Text>Disconnect</Text>
                    </Button>
                </Container>
            </Banner>
        );
    }
    if (status === STAT.ERROR) {
        return (
            <Banner color="red" justifyContent="space-between">
                <Text paddingLeft={10} fontSize={12} color="red">
                    {error ?? "Connection failed"}
                </Text>
                <Container><Cross hover={{cursor:"pointer"}} onClick={()=> {clearError();}} color="red" transformRotateZ={45}/></Container>
            </Banner>
        );
    }
    return null;
}
