import { useEffect, useRef, useState } from "react";
import { Container, Text } from "@react-three/uikit";
import { Color } from "three";
import { binInfoSubjectGet } from "@ndmspc/ndmvr-aframe";
import * as THREE from "three";

import NotoRegular from "../../../assets/fonts/NotoSans-Regular.json";
import NotoBold from "../../../assets/fonts/NotoSans-Bold.json";
import FloatingContainer from "./FloatingContainer.tsx";

export interface BinInfoProps {
    originRef: React.RefObject<THREE.Group>;
    precision?: number;
    offset?: { x: number; y: number; z: number };
}

export default function BinInfo({
    originRef,
    precision = 2,
    offset = { x: 0, y: 1, z: -4 },
}: BinInfoProps) {
    const [binInfo, setBinInfo] = useState(null);
    const prev = useRef(null);

    useEffect(() => {
        const sub = binInfoSubjectGet()
            .getObservable()
            .subscribe((next) => {
                if (!next.instanceId) return;
                if (prev.current !== next) setBinInfo(next);
                prev.current = next;
            });
        return () => sub.unsubscribe();
    }, []);

    const DotIcon = ({ color = "#fff" }) => {
        return (
            <Container
                width={12}
                height={12}
                borderRadius={9999}
                zIndex={10}
                backgroundColor={color}
                borderWidth={1}
                borderColor={"#fff"}
            />
        );
    };

    return (
        <FloatingContainer
            originRef={originRef}
            offset={offset}
            classList={["menuContainer"]}
            fontFamilies={{
                noto: {
                    medium: NotoRegular,
                    bold: NotoBold,
                },
            }}
        >
            <Text classList={["menuHeader"]}>Bin information</Text>

            <Container
                classList={["section", "sectionInner"]}
                minWidth={200}
                flexDirection="column"
                padding={10}
                borderRadius={8}
            >
                <Container flexDirection="row" alignItems="center" gap={4}>
                    <Text fontSize={12} fontWeight="bold">
                        Level:
                    </Text>
                    {/*<Text fontSize={12}>{binInfo?.level ?? 0}</Text>*/}
                    <Text fontSize={12}>{binInfo?.coords?.length ?? 0}</Text>
                </Container>

                <Container flexDirection="row" alignItems="center" gap={4}>
                    <Text fontSize={12} fontWeight="bold">
                        Content:
                    </Text>
                    <Text fontSize={12}>
                        {binInfo?.content !== undefined
                            ? `${binInfo?.content.toFixed(
                                  precision
                              )} +/- ${binInfo?.error?.toFixed(precision)}`
                            : "-"}
                    </Text>
                </Container>
            </Container>

            {binInfo?.coords?.map((coord, i) => {
                const { r, g, b } = coord.color || { r: 255, g: 255, b: 255 };
                const color = new Color(r, g, b).getStyle();

                const axes = Object.entries(coord).filter(
                    ([, v]) => v && typeof v === "object" && "min" in v && "max" in v
                );

                return (
                    <Container
                        classList={["section", "sectionInner"]}
                        minWidth={360}
                        flexDirection="column"
                        key={i}
                        padding={10}
                        borderRadius={8}
                        gap={6}
                    >
                        <Container gap={5}>
                            <DotIcon color={color} />
                            <Text fontSize={13} fontWeight="bold">
                                {coord.name ?? "Unnamed"} [bin={coord.bin}]
                            </Text>
                        </Container>

                        <Container flexDirection="column" gap={4}>
                            {axes.map(([key, axis]: [string, any]) => (
                                <Container
                                    key={key}
                                    flexDirection="row"
                                    alignItems="center"
                                    gap={8}
                                >
                                    <Container minWidth={170}>
                                        <Text fontSize={12}>
                                            {axis.title ? axis.title : key} [name={axis.name}]:
                                        </Text>
                                    </Container>

                                    {axis.label ? (
                                        <Text fontSize={12}>[{axis.label}]</Text>
                                    ) : (
                                        <Text fontSize={12}>
                                            [{axis.min.toFixed(precision)},{" "}
                                            {axis.max.toFixed(precision)}]
                                        </Text>
                                    )}
                                </Container>
                            ))}
                        </Container>
                    </Container>
                );
            })}
        </FloatingContainer>
    );
}
