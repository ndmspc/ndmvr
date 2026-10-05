import { Button, Label, RadioGroup, RadioGroupItem } from "@react-three/uikit-default";
import { Text, Input } from "@react-three/uikit";
import { Container } from "@react-three/uikit";
import { STAT, ConnectionStatus } from "../../../../stores/broker/constants.ts";
import { useState } from "react";

interface InputCardProps {
    type: "http" | "ws";
    placeholder: string;
    firstValue?: string;
    onChange: (value: string) => void;
    status: "success" | "error" | null;
    modeSelected: "http" | "ws" | null;
    loading?: boolean;
    loaded?: boolean;
    connStatus?: ConnectionStatus;
    connError?: string | null;
    onSubmit: () => void;
}

export default function InputCard({
    type,
    placeholder,
    firstValue = "",
    onChange,
    status,
    modeSelected,
    loading = false,
    loaded = false,
    connStatus,
    connError,
    onSubmit,
}: InputCardProps) {
    const isVisible = modeSelected === type;
    const [value, setValue] = useState(firstValue);

    const predefined = [
        "ws://localhost:8080/ws/root.websocket",
        "ws://ndmspc.cern.ch/ws/root.websocket",
    ];

    const radioGroupValue = predefined.includes(value) ? value : "";

    const handleChangeForWs = (v) => {
        setValue(v);
        onChange(v);
    };

    return (
        <Container display={isVisible ? "flex" : "none"} flexDirection="column" gap={12}>
            {type === "ws" && (
                <>
                    <Input
                        classList={["input"]}
                        minWidth={350}
                        value={value}
                        onValueChange={handleChangeForWs}
                        wordBreak="keep-all"
                        placeholder={placeholder}
                    />

                    <RadioGroup
                        value={radioGroupValue}
                        defaultValue={firstValue}
                        onValueChange={handleChangeForWs}
                    >
                        <RadioGroupItem value={predefined[0]}>
                            <Label>
                                <Text>Local Address</Text>
                            </Label>
                        </RadioGroupItem>
                        <RadioGroupItem value={predefined[1]}>
                            <Label>
                                <Text>Production Address</Text>
                            </Label>
                        </RadioGroupItem>
                    </RadioGroup>

                    {connStatus === STAT.CONNECTING && (
                        <Text paddingLeft={10} fontSize={12}>
                            Loading ...
                        </Text>
                    )}
                    {connStatus === STAT.RECONNECTING && (
                        <Container flexDirection="column">
                            <Text paddingLeft={10} fontSize={12} color="orange">
                                Reconnecting ...
                            </Text>
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

            {type === "http" && (
                <>
                    <Input
                        classList={["input"]}
                        minWidth={350}
                        value={value}
                        onValueChange={(v) => {
                            setValue(v);
                            onChange(v);
                        }}
                        wordBreak="keep-all"
                        placeholder={placeholder}
                    />

                    {status === "success" && loading && (
                        <Text paddingLeft={10} fontSize={12}>
                            Loading ...
                        </Text>
                    )}
                    {status === "success" && !loading && loaded && (
                        <Text paddingLeft={10} fontSize={12} color="lightgreen">
                            Loaded
                        </Text>
                    )}
                </>
            )}

            {status === "error" && (
                <Text paddingLeft={10} fontSize={12} color="red">
                    Invalid Address
                </Text>
            )}

            <Button
                classList={["buttonPrimary"]}
                hover={{ backgroundColor: "#059669" }}
                onClick={onSubmit}
            >
                <Text>{type === "http" ? "Load Data" : "Connect"}</Text>
            </Button>
        </Container>
    );
}
