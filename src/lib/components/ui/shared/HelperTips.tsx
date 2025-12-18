import React, { useMemo, useRef } from "react";
import { useXR } from "@react-three/xr";
import { Text } from "@react-three/uikit";
import { Container } from "../interactions/Container";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface PositionAndRotation {
    position: [x: number, y: number, z: number];
    rotation: THREE.Euler;
}

export interface HelperTipsProps {
    originRef: React.RefObject<THREE.Group> | null;
}

export default function HelperTips({ originRef }: HelperTipsProps) {
    const xr = useXR();
    const isPresenting = !!xr.session;
    const groupRef = useRef(null);

    const desktopTips = useMemo(
        () => [
            {
                title: "Movement and Rotation",
                items: [
                    { command: "W/S/A/D", detail: "move forward/back/left/right" },
                    { command: "E", detail: "move up" },
                    { command: "Q", detail: "move down" },
                    { command: "Hold Left Click", detail: "drag mouse to rotate the camera" },
                ],
            },
            {
                title: "Menu Movement",
                items: [
                    { command: "H", detail: "toggle helper tips" },
                    { command: "M", detail: "toggle main menu" },
                    { command: "Drag", detail: "move the menu with the mouse" },
                    // { command: "Shift + Left Click", detail: "rotate the menu" },
                    { command: "R", detail: "reset the menu position" },
                ],
            },
            {
                title: "Histogram Controls",
                items: [
                    { command: "1-9", detail: "jump to histogram level" },
                    { command: "Click / Double-Click", detail: "view item / go deeper" },
                    { command: "Shift + Left Click", detail: "hide item" },
                    { command: "Shift + Left Double-Click", detail: "hide item" },
                    { command: "Z", detail: "go back one level" },
                    { command: "O", detail: "toggle histogram wireframe" },
                ],
            },
        ],
        []
    );

    const vrTips = useMemo(
        () => [
            {
                title: "Movement",
                items: [
                    { command: "Left joystick (L)", detail: "move" },
                    { command: "Left trigger", detail: "move up" },
                    { command: "Left grip", detail: "move down" },
                ],
            },
            {
                title: "Camera Rotation",
                items: [{ command: "Right joystick", detail: "rotate left/right" }],
            },
            {
                title: "Menu Controls",
                items: [
                    { command: "B (right)", detail: "toggle the menu" },
                    { command: "Hold Click", detail: "move the menu" },
                    { command: "X (left)", detail: "reset menu position" },
                    { command: "Hold A + Click", detail: "rotate the menu" },
                    { command: "Y (left)", detail: "toggle helper tips" },
                ],
            },
        ],
        []
    );

    useFrame(() => {
        if (!originRef?.current || !groupRef.current) return;

        const o = originRef.current.position;
        const target = new THREE.Vector3(o.x, o.y, o.z);

        groupRef.current.position.copy(target);
    });

    const tips = isPresenting ? vrTips : desktopTips;

    if (tips.length === 0) {
        return null;
    }

    const staticPositionsAndRotations: PositionAndRotation[] = [
        { position: [0, 0.5, -3], rotation: new THREE.Euler(0, 0, 0) },
        { position: [3, 0.5, 0], rotation: new THREE.Euler(0, -Math.PI / 2, 0) },
        { position: [-3, 0.5, 0], rotation: new THREE.Euler(0, Math.PI / 2, 0) },
        { position: [0, 0.5, 3], rotation: new THREE.Euler(0, 0, 0) },
    ];

    return (
        <group ref={groupRef}>
            {tips.map((tip, index) => {
                const { position, rotation } = staticPositionsAndRotations[index];
                return (
                    <group position={position} rotation={rotation} key={`${tip.title}-${index}`}>
                        <Container classList={["menuContainer"]}>
                            <Container
                                flexDirection="column"
                                gap={10}
                                padding={12}
                                minWidth={260}
                                maxWidth={420}
                            >
                                <Text fontSize={14} fontWeight="bold" marginBottom={2}>
                                    {tip.title}
                                </Text>
                                <Container flexDirection="column" gap={6}>
                                    {tip.items.map((item, itemIndex) => (
                                        <Container key={itemIndex} gap={10}>
                                            <Text fontSize={12} fontWeight="bold">
                                                - {item.command}
                                            </Text>
                                            <Text width={200} fontSize={12}>
                                                {item.detail}
                                            </Text>
                                        </Container>
                                    ))}
                                </Container>
                            </Container>
                            <Text width={200} fontSize={12} color={"#aaaaaa"}>
                                Try to rotate to see more help
                            </Text>
                        </Container>
                    </group>
                );
            })}
        </group>
    );
}
