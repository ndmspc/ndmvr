import { Container, Root, Text } from "@react-three/uikit";
import { Card, Defaults } from "@react-three/uikit-apfel";

export default function ControlsHelp() {
    const Cell = ({ children, weight = "normal" }) => (
        <Text fontSize={12} fontWeight={weight} paddingX={8} paddingY={4}>
            {children}
        </Text>
    );

    const Row = ({ a, d, v }) => (
        <Container
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            gap={8}
            paddingX={4}
        >
            <Cell>{a}</Cell>
            <Cell>{d}</Cell>
            <Cell>{v}</Cell>
        </Container>
    );

    return (
        <group>
            <Defaults>
                <Root>
                    <Container minWidth={420}>
                        <Card
                            flexDirection="column"
                            alignItems="stretch"
                            borderRadius={24}
                            padding={16}
                            gap={12}
                            variant="soft"
                            tone="neutral"
                            style={{ backdropFilter: "blur(3px)" }}
                        >
                            <Text fontSize={16} fontWeight="bold" textAlign="center">
                                Controls
                            </Text>

                            <Container
                                flexDirection="row"
                                justifyContent="space-between"
                                alignItems="center"
                                gap={8}
                                paddingX={4}
                            >
                                <Cell weight="bold">Action</Cell>
                                <Cell weight="bold">Desktop</Cell>
                                <Cell weight="bold">VR</Cell>
                            </Container>f

                            {/* Rows */}
                            <Row a="Toggle Menu" d="F" v="B"/>
                            <Row a="Toggle Bin Info" d="B" v="A"/>

                            <Text fontSize={11} color="gray" textAlign="center">
                                Tip: In VR, "B" refers to the B button on the right controller.
                            </Text>
                        </Card>
                    </Container>
                </Root>
            </Defaults>
        </group>
    );
}
