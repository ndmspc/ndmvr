import { useEffect, useMemo, Children, isValidElement, cloneElement, use } from "react";
import { Text } from "@react-three/uikit";
import Container from "../interactions/Container";
import { Label, RadioGroup, RadioGroupItem } from "@react-three/uikit-default";
import * as THREE from "three";

import FloatingContainer from "./FloatingContainer.tsx";
import WebsocketBanner from "./WebsocketBanner.tsx";
import { useMenuStore } from "../../../stores/menu/store.ts";
import { useSceneModeStore } from "../../../stores/sceneMode/store.ts";
import { useInputFocus } from "../focus/useInputFocus.ts";
import { useKeyboardStore } from "../../../stores/keyboard/store";

const DEFAULT_OFFSET = { x: 0, y: 1.2, z: -4 };

export interface MenuProps {
    children?: React.ReactNode;
    defaultOpen?: boolean;
    initialTabHelp?: boolean;
    originRef?: React.RefObject<THREE.Group> | null;
    offset?: { x: number; y: number; z: number };
    scale?: number;
}

export default function Menu({
    children,
    defaultOpen = false,
    initialTabHelp = false,
    originRef = null,
    offset = DEFAULT_OFFSET,
    scale = 1,
}: MenuProps) {
    const { showMenu, activeTab, setShowMenu, setActiveTab, setMenuExists, toggleTab } =
        useMenuStore();
    const modifyModeEnabled = useSceneModeStore((s) => s.modifyModeEnabled);
    const setModifyModeEnabled = useSceneModeStore((s) => s.setModifyModeEnabled);
    const keys = useKeyboardStore((s) => s.keys);
    const isFocused = useInputFocus((state) => state.isFocused);

    const menuItems = useMemo(() => {
        const items: { name: string; label: string }[] = [];
        Children.forEach(children, (child) => {
            if (!isValidElement(child)) return;
            const type = child.type as any;
            if (type?.menuName) {
                items.push({ name: type.menuName, label: type.menuLabel });
            }
        });
        return items;
    }, [children]);

    useEffect(() => {
        setMenuExists(true);
        setShowMenu(defaultOpen);
        setActiveTab(initialTabHelp ? "help" : null);
    }, []);

    useEffect(() => {
        if (isFocused) return;

        if (keys["KeyM"] && !keys["ControlLeft"] && !keys["ControlRight"]) {
            toggleTab?.(null);
        }

        if (keys["KeyH"] && menuItems.some((item) => item.name === "help")) {
            toggleTab?.("help");
        }

        if (keys["KeyR"]) {
            window.dispatchEvent(new CustomEvent("ndmvr-menu-reset"));
        }

        if (keys["KeyM"] && (keys["ControlLeft"] || keys["ControlRight"])) {
            setModifyModeEnabled(!modifyModeEnabled);
            window.dispatchEvent(
                new CustomEvent("ndmvr-modify-mode-toggle", { detail: { enabled: !modifyModeEnabled } })
            );
        }

        if (useSceneModeStore.getState().modifyModeEnabled && (keys["ShiftLeft"] || keys["ShiftRight"])) {
            window.dispatchEvent(
                new CustomEvent("ndmvr-shiftstep-scale", {
                    detail: { pressed: true },
                })
            );
        } else {
            window.dispatchEvent(
                new CustomEvent("ndmvr-shiftstep-scale", {
                    detail: { pressed: false },
                })
            );
        }


        if (keys["ShiftLeft"] || keys["ShiftRight"]) {
            window.dispatchEvent(
                new CustomEvent("ndmvr-menu-shift", {
                    detail: { pressed: true },
                })
            );
        } else {
            window.dispatchEvent(
                new CustomEvent("ndmvr-menu-shift", {
                    detail: { pressed: false },
                })
            );
        }
    }, [keys, isFocused]);

    if (!showMenu) return null;
    return (
        <>
            {activeTab !== "help" && (
                <FloatingContainer
                    originRef={originRef}
                    offset={offset}
                    transformScaleX={scale}
                    transformScaleY={scale}
                    transformScaleZ={scale}
                >
                    {activeTab === null && (
                        <Container classList={["menuContainer"]}>
                            <Text classList={["menuHeader"]}>Menu</Text>

                            <Container flexDirection="column" gap={8}>
                                <WebsocketBanner showTransient={true} />
                                <Container classList={["menuBlock"]}>
                                    <RadioGroup onValueChange={setActiveTab}>
                                        {menuItems.map((item) => (
                                            <RadioGroupItem key={item.name} value={item.name}>
                                                <Label>
                                                    <Text>{item.label}</Text>
                                                </Label>
                                            </RadioGroupItem>
                                        ))}
                                    </RadioGroup>
                                </Container>
                            </Container>
                        </Container>
                    )}
                    {activeTab !== null &&
                        Children.map(children, (child) => {
                            if (!isValidElement(child)) return null;
                            const type = child.type as any;
                            if (type?.menuName === activeTab) return child;
                            return null;
                        })}
                </FloatingContainer>
            )}

            {activeTab === "help" &&
                Children.map(children, (child) => {
                    if (!isValidElement(child)) return null;
                    const type = child.type as any;
                    if (type?.menuName === "help")
                        return cloneElement(
                            child as React.ReactElement<{
                                originRef: React.RefObject<THREE.Group>;
                            }>,
                            { originRef }
                        );
                    return null;
                })}
        </>
    );
}
