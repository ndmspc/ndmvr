import { Card, Button, Input, Loading } from "@react-three/uikit-apfel";
import { Container, Text } from "@react-three/uikit";
import { STAT } from "../../../stores/broker/constants.js";
// import { trimUrl } from "../../../utils/helpers.js";

export default function InputCard({
    type, // "http" | "ws"
    placeholder,
    value,
    onChange, // (next: string) => void
    status, // "error" | "success" | null
    modeSelected, // current selected mode value
    // HTTP-only
    loading = false,
    loaded = false,
    // WS-only
    connStatus,
    connError,
    onSubmit, // () => void
}) {
    const isVisible = modeSelected === type;

    return (
        <Card
            flexDirection="column"
            borderRadius={16}
            padding={16}
            gap={16}
            display={isVisible ? "flex" : "none"}
        >
            <Input
                value={value}
                onValueChange={(v) => onChange(v)}
                variant="rect"
                multiline={false}
                wordBreak="keep-all"
                placeholder={placeholder}
            />

            {status === "error" && (
                <Text paddingLeft={10} fontSize={12} color="red">
                    Invalid Address
                </Text>
            )}

            {type === "ws" && (
                <>
                    {connStatus === STAT.CONNECTING && (
                        <Loading alignSelf="center" size="lg"/>
                    )}
                    {connStatus === STAT.RECONNECTING && (
                        <Container flexDirection="column">
                            <Text paddingLeft={10} fontSize={12} color="orange">
                                Reconnecting ...
                            </Text>
                            <Loading alignSelf="center" size="lg"/>
                        </Container>
                    )}
                    {connStatus === STAT.CONNECTED && (
                        <Text paddingLeft={10} fontSize={12} color="lightgreen">
                            Connected
                        </Text>
                    )}
                    {connStatus === STAT.ERROR && (
                        <Text paddingLeft={10} fontSize={12} color="red">
                            {connError ?? "Connection failed"}
                        </Text>
                    )}
                </>
            )}

            {type === "http" && status === "success" && loading && (
                <Loading alignSelf="center" size="lg"/>
            )}
            {type === "http" && status === "success" && !loading && loaded && (
                <Text paddingLeft={10} fontSize={12} color="lightgreen">
                    Loaded
                </Text>
            )}

            <Button variant="rect" size="sm" platter flexGrow={1} onClick={onSubmit}>
                <Text>{type === "http" ? "Load Data" : "Connect"}</Text>
            </Button>
        </Card>
    );
}
