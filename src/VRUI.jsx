import { Root, Text, Container } from "@react-three/uikit";
import { Defaults, Button } from "@react-three/uikit-apfel";
import { useColorStore } from "./utils/colorStore";

export default function VRUI() {

  const color = useColorStore((s) => s.color);
  const toggleColor = useColorStore((s) => s.toggleColor);

  return (
    <group position={[0, 1, 8]} rotation={[0, 0, 0]}>
      <Defaults>
        <Root>
          <Container padding={0.05} flexDirection="row" backgroundColor="white">
            <Button
              variant="rect"
              size="sm"
              platter
              flexGrow={1}
              color={color}
              onClick={() => toggleColor()}
            >
              <Text color={color}>Button</Text>
            </Button>
          </Container>
        </Root>
      </Defaults>
    </group>
  );
}
