import { Container } from "@react-three/uikit";
import * as Icons from "@react-three/uikit-lucide";
import { Fullscreen, Text } from "@react-three/uikit";
import { useSceneModeStore } from "../../../stores/sceneMode/store.ts";
import { useThree } from "@react-three/fiber";

export default function ModeToolsPanel() {

    const camera = useThree((s) => s.camera);
    const activeMode = useSceneModeStore((s) => s.activeMode);
    const setActiveMode = useSceneModeStore((s) => s.setActiveMode);
    const modesConfig = useSceneModeStore((s) => s.modesConfig);
    const getOnClickEvent = useSceneModeStore((s) => s.getOnClickEvent);
    const getOnHoverEvent = useSceneModeStore((s) => s.getOnHoverEvent);
    const modeToolsNotification = useSceneModeStore(
        (s) => s.modeToolsNotification
    );

    const setMode = (mode: string) => {
        setActiveMode(mode);

        window.dispatchEvent(
            new CustomEvent("ndmvr-mode-toggle", {
                detail: { enabled: mode },
            })
        );
    };

    const resolveIcon = (mode: string) => {
        let iconName = modesConfig[mode]?.icon;

        if (typeof iconName !== "string" || iconName.length === 0) {
            return Icons.MousePointer2;
        }

        iconName = iconName[0].toUpperCase() + iconName.slice(1);

        return Icons[iconName as keyof typeof Icons] ?? Icons.MousePointer2;
    };

    const renderNotificationContent = () => {
        const content = modeToolsNotification?.content;

        if (typeof content === "string" || typeof content === "number") {
            return (
                <Text
                    color="rgba(255, 255, 255, 0.95)"
                    fontSize={13}
                    lineHeight={1.35}
                    textAlign="center"
                    whiteSpace="pre-line"
                    wordBreak="break-word"
                >
                    {content}
                </Text>
            );
        }

        return content;
    };

    return (
        <Fullscreen
            key={camera.uuid} // reload when camera changes to rebind events
            pointerEvents="listener"
        >
            <Container
                classList={["ModeToolsPanelWrapper"]}
                pointerEvents="listener"
                pointerEventsType="all"
                renderOrder={10000}
                depthTest={false}
                depthWrite={false}
            >
                {modeToolsNotification && (
                    <Container
                        classList={["NotificationBubble"]}
                        pointerEvents="none"
                        depthTest={false}
                        depthWrite={false}
                    >
                        {renderNotificationContent()}
                    </Container>
                )}
                <Container
                    classList={["ModeToolsPanel"]}
                    pointerEvents="listener"
                    pointerEventsType="all"
                    renderOrder={10001}
                    depthTest={false}
                    depthWrite={false}
                >
                    {Object.keys(modesConfig).map((mode) => (
                        <Container classList={["ToolButton"]}
                            key={mode}
                            alignItems="center"
                            justifyContent="center"
                            pointerEvents="listener"
                            backgroundColor={
                                (activeMode === mode)
                                    ? "rgba(255,255,255,0.18)"
                                    : "rgba(255,255,255,0.08)"
                            }
                            borderColor={
                                (activeMode === mode)
                                    ? "rgba(255,255,255,0.78)"
                                    : "rgba(255,255,255,0.28)"
                            }
                            onClick={() => {
                                setMode(mode);
                                getOnClickEvent(mode, modesConfig).forEach((h) => h());
                            }}
                            onPointerOver={() => {
                                getOnHoverEvent(mode, modesConfig).forEach((h) => h());
                            }}
                        >
                            <Container
                                classList={["ToolButtonIcon"]}
                            >
                                {(() => {
                                    const Icon = resolveIcon(mode);
                                    return <Icon classList={["ToolButtonIcon"]} />;
                                })()}
                            </Container>
                        </Container>
                    ))}
                </Container>
            </Container>
        </Fullscreen>
    );
}

