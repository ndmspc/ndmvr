import { Text } from "@react-three/uikit";

import { Container } from "../interactions/Container";
import InputCard from "./InputCard.tsx";

export interface BrowserRootFileMenuProps {
    value: string;
    placeholder?: string;
    status?: "idle" | "loading" | "success" | "error";
    // error?: string | null;
    onChange: (value: string) => void;
    onSubmit: () => void;
}

export default function BrowserRootFileMenu({
                                                value,
                                                placeholder = "idle",
                                                status = "idle",
                                                onChange,
                                                onSubmit,
                                            }: BrowserRootFileMenuProps) {
    return (
        <>
            <Text classList={["menuHeader"]}>Open ROOT file</Text>

            <Container classList={["section", "sectionInner"]} flexDirection="column" gap={12}>
                <Text fontSize={16}>
                    Enter ROOT file URL or path.
                </Text>

                <InputCard
                    type="http"
                    placeholder={placeholder}
                    firstValue={value}
                    onChange={onChange}
                    status={
                        status === "error"
                            ? "error"
                            : status === "success"
                                ? "success"
                                : null
                    }
                    modeSelected="http"
                    loading={status === "loading"}
                    loaded={status === "success"}
                    onSubmit={onSubmit}
                />

            </Container>
        </>
    );
}
