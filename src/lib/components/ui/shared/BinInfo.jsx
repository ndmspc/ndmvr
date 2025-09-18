import { useEffect, useRef, useState, useMemo  } from "react";
import { Container, Root, Text, FontFamilyProvider, Icon } from "@react-three/uikit";
import { Card, Defaults } from "@react-three/uikit-apfel";
import { useFrame } from "@react-three/fiber";
import { binInfoSubjectGet } from "@ndmspc/ndmvr-aframe";
import { Color } from "three";
import LatexFormulaImage from "./LatexFormulaImage.jsx";

export default function BinInfo({
    originRef,
    precision = 2,
    offset = { x: 1.3, y: 1, z: -4 },
}) {
    const [binInfo, setBinInfo] = useState(null);
    const groupRef = useRef(null);
    const prev = useRef(null);
    const BASE = import.meta.env.BASE_URL;

    useEffect(() => {
        const sub = binInfoSubjectGet()
            .getObservable()
            .subscribe((next) => {
                if (prev.current !== next) setBinInfo(next);
                prev.current = next;
            });
        return () => sub.unsubscribe();
    }, []);

    useFrame(() => {
        if (originRef?.current && groupRef.current) {
            const { x, y, z } = originRef.current.position;
            groupRef.current.position.set(x + offset.x, y + offset.y, z + offset.z);
        }
    });


    const DotIcon = ({ size = 8, color = '#fff', delay = true }) => {
        const [ready, setReady] = useState(!delay);

        useEffect(() => {
            if (!delay) return;
            setReady(true);            // після першого paint
        }, [delay]);

        const svg = useMemo(() => (
            `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" />
    </svg>`
        ), [size]);

        if (!ready) return null;
        return <Icon svgWidth={size} svgHeight={size} color={color} text={svg} />;
    };

    const Row = ({ label, value, color = "white", coords = false, formula }) =>
        coords ?

            (
                <Container
                    flexDirection="row"
                    justifyContent="space-between"
                    alignItems="center"
                    gap={8}
                    paddingX={8}
                >
                    <Container gap={3}>

                        <DotIcon size={8} color={color}/>
                        <Text fontSize={12} fontWeight="medium">
                            {formula ? label + "," : label}
                        </Text>
                        {formula && <LatexFormulaImage color="#FFFFFF" text={formula} height={12} scale={3}/>}
                    </Container>
                    <Text fontSize={12} fontWeight="bold">
                        {value}
                    </Text>


                </Container>
            )
            :
            (
                <Container
                    flexDirection="row"
                    justifyContent="space-between"
                    alignItems="center"
                    gap={8}
                    paddingX={8}
                >
                    <Text fontSize={12} color={color} fontWeight="medium">
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
        <group ref={groupRef}>
            <Defaults>
                <Root>
                    {/* <FontFamilyProvider
                        noto={{
                            medium: `${BASE}fonts/NotoSans-json/NotoSans-Regular.json`,
                            bold: `${BASE}fonts/NotoSans-json/NotoSans-Bold.json`,
                        }}
                    > */}
                        <Container minWidth={420} gap={12}>
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
                                <Section title="Coords">
                                    {(() => {
                                        const coords = binInfo?.coords ?? [];
                                        return coords.length ? (
                                            coords.map((coord, i) => {
                                                try {
                                                    const { r, g, b } = coord[1].color;
                                                    const colorHex = `#${new Color(r, g, b).getHexString()}`;
                                                    let { name, title, bin, min, max } = coord[0];

                                                    min = min.toFixed(precision);
                                                    max = max.toFixed(precision);

                                                    return (
                                                        <Row
                                                            key={`${name}-${i}`}
                                                            coords={true}
                                                            color={colorHex}
                                                            formula={title}
                                                            label={name}
                                                            value={`bin=${bin}, range=[${min}, ${max}]`}
                                                        />
                                                    );
                                                }
                                                catch(e){console.log(e)}
                                            })
                                        ) : (
                                            <Row label="-" value="-"/>
                                        );
                                    })()}
                                </Section>

                                <Section title="Content">
                                    <Row label="Level:" value={binInfo?.coords?.length || "-"}/>
                                    <Row
                                        label="Value:"
                                        value={
                                            binInfo?.content || binInfo?.error
                                                // ? `${binInfo?.content} ± ${binInfo?.error.toFixed(precision)}`
                                                ? `${binInfo?.content} +- ${binInfo?.error.toFixed(precision)}`
                                                : "-"
                                        }
                                    />
                                </Section>
                            </Card>
                        </Container>
                    {/* </FontFamilyProvider> */}
                </Root>
            </Defaults>
        </group>
    );
}
