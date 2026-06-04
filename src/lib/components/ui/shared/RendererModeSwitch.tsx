import { Text } from "@react-three/uikit";
import { Container } from "../interactions/Container.tsx";

interface RendererModeSwitchProps {
    rendererMode: "jsroot" | "ndmvr";
    setRendererMode?: React.Dispatch<React.SetStateAction<"jsroot" | "ndmvr">>;
}

export default function RendererModeSwitch({
                                               rendererMode,
                                               setRendererMode,
                                           }: RendererModeSwitchProps) {
    return (
        <Container
            width="100%"
            height={50}
            display="flex"
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            gap={12}
            marginBottom={8}
            paddingX={12}
            paddingY={10}
            borderRadius={10}
            backgroundColor="#22364c"
        >
            <Text fontSize={16} color="#ffffff">
                Renderer:
            </Text>

            <Container
                display="flex"
                flexDirection="row"
                alignItems="center"
                gap={8}
            >
                <Container
                    paddingX={10}
                    paddingY={6}
                    borderRadius={8}
                    borderWidth={2}
                    borderColor="#000"
                    backgroundColor={rendererMode === "jsroot" ? "#00bfd3" : "#d3d3d3"}
                    onClick={() => setRendererMode?.("jsroot")}
                >
                    <Text color="#000">JSRoot</Text>
                </Container>

                <Container
                    paddingX={10}
                    paddingY={6}
                    borderRadius={8}
                    borderWidth={2}
                    borderColor="#000"
                    backgroundColor={rendererMode === "ndmvr" ? "#00bfd3" : "#d3d3d3"}
                    onClick={() => setRendererMode?.("ndmvr")}
                >
                    <Text color="#000">NDMVR</Text>
                </Container>
            </Container>
        </Container>
    );
}
