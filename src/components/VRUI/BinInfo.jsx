import { Container, Root, Text } from "@react-three/uikit";
import { Card, Defaults } from "@react-three/uikit-apfel";

export default function BinInfo() {
  const Row = ({ label, value }) => (
    <Container
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      gap={8}
      paddingX={8} 
    >
      <Text fontSize={12} color="gray">
        {label}
      </Text>
      <Text fontSize={12} fontWeight="bold">
        {value}
      </Text>
    </Container>
  );

  const Section = ({ title, children }) => (
    <Card
      borderRadius={16}
      padding={12}
      flexDirection="column"
      alignItems="stretch"
      gap={8}
      variant="soft"
      tone="neutral"
      style={{ backdropFilter: "blur(3px)" }}
    >
      <Text fontSize={13} fontWeight="bold" textAlign="center">
        {title}
      </Text>
      <Container flexDirection="column" gap={4}>
        {children}
      </Container>
    </Card>
  );

  return (
    <Defaults>
      <Root>
        <Container width={420} gap={12}>
          <Card
            flexDirection="column"
            alignItems="center"
            borderRadius={24}
            padding={16}
            gap={12}
          >
            <Text fontSize={16} fontWeight="bold" textAlign="center">
              Bin information
            </Text>

            <Section title="Position">
              <Row label="X:" value="-" />
              <Row label="Y:" value="-" />
              <Row label="Z:" value="-" />
            </Section>

            <Section title="Value">
              <Row label="Value:" value={"-"} />
            </Section>
          </Card>
        </Container>
      </Root>
    </Defaults>
  );
}
