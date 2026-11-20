import { useEffect, useState, useRef, Children, isValidElement } from "react";
import { Container, Text } from "@react-three/uikit";
import { Label, RadioGroup, RadioGroupItem } from "@react-three/uikit-default";
import { useXR } from "@react-three/xr";
import { useInputBinding } from "../../../../interactions/input/useInputBinding";
import { useMenuStore } from "../../../../stores/menu/store";
import { FeatureKey, useFeatureFlagStore } from "../../../../stores/feature/store";
import DesktopMenuOverlay from "./DesktopMenuOverlay";
import FloatingContainer from "../common/FloatingContainer";
import { DropdownProvider } from "../common/Dropdown";
import WebsocketBanner from "../connections/WebsocketBanner";
import Frame from "./Frame";

const DEFAULT_OFFSET = { x: 0, y: 1.2, z: -4 };

export interface MenuProps {
  children?: React.ReactNode;
  defaultOpen?: boolean;
  offset?: { x: number; y: number; z: number };
  scale?: number;
}

export default function Menu({ defaultOpen = false, ...props }: MenuProps) {
  const { showMenu, setShowMenu, setMenuExists, toggleMenu } = useMenuStore();
  const initialOpen = useRef(defaultOpen);

  useEffect(() => {
    setMenuExists(true);
    setShowMenu(initialOpen.current);
    return () => setMenuExists(false);
  }, [setMenuExists, setShowMenu]);

  useInputBinding({
    keyboard: { code: "KeyM", ctrl: false },
    vr: { hand: "right", button: "b-button", grip: false },
    onPress: toggleMenu,
  });

  // The binding stays mounted while hidden; tab selection resets when content unmounts.
  return showMenu ? <MenuContent {...props} /> : null;
}

function MenuContent({ children, offset = DEFAULT_OFFSET, scale = 1 }: MenuProps) {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const session = useXR((state) => state.session);
  const isXR = session !== null && session !== undefined;
  const { isFeatureEnabled } = useFeatureFlagStore();
  const enabled = isFeatureEnabled(FeatureKey.DuplicateWindow, isXR);

  const [windows, setWindows] = useState<Array<{ id: string; menuName?: string }>>(() => [
    { id: crypto.randomUUID() },
  ]);

  const handleSpawn = (menuName: string) => {
    setWindows((prev) => [...prev, { id: crypto.randomUUID(), menuName }]);
  };

  const handleClose = (id: string) => {
    setWindows((prev) => prev.filter((win) => win.id !== id));
  };

  const items = Children.toArray(children)
    .filter(isValidElement)
    .map((child) => {
      const component = child.type as {
        menuName?: string;
        menuLabel?: string;
        getMenuMetadata?: (props: unknown) => {
          menuName: string;
          menuLabel: string;
        } | null;
      };
      const metadata = component.getMenuMetadata
        ? component.getMenuMetadata(child.props)
        : component;
      return { child, menuName: metadata?.menuName, menuLabel: metadata?.menuLabel };
    })
    .filter((item) => item.menuName);

  // old menu content
  const content =
    activeTab === null ? (
      <Container classList={["menuContainer"]}>
        <Text classList={["menuHeader"]}>Menu</Text>
        <Container flexDirection="column" gap={8}>
          <WebsocketBanner showTransient={true} />
          <Container classList={["menuBlock"]}>
            <RadioGroup onValueChange={setActiveTab}>
              {items.map(({ menuName, menuLabel }) => (
                <RadioGroupItem key={menuName} value={menuName}>
                  <Label>
                    <Text>{menuLabel ?? menuName}</Text>
                  </Label>
                </RadioGroupItem>
              ))}
            </RadioGroup>
          </Container>
        </Container>
      </Container>
    ) : (
      items
        .filter((item) => item.menuName === activeTab)
        .map((item) => (
          <Container key={item.menuName} classList={["menuContainer"]}>
            <Text classList={["menuHeader"]}>{item.menuLabel ?? item.menuName}</Text>
            <DropdownProvider>
              <Container classList={["section", "sectionInner"]}>{item.child}</Container>
            </DropdownProvider>
          </Container>
        ))
    );

  const panels = enabled
    ? windows.map((win) => ({
        id: win.id,
        content: (
          <Frame
            parentMenuName={win.menuName}
            onSpawn={handleSpawn}
            onClose={windows.length > 1 ? () => handleClose(win.id) : undefined}
          >
            {children}
          </Frame>
        ),
      }))
    : [{ id: "menu", content: content }];

  return (
    <>
      {panels.map((panel, index) =>
        session ? (
          <FloatingContainer
            key={panel.id}
            renderOrder={5000 + index}
            offset={enabled ? undefined : offset}
            transformScaleX={scale}
            transformScaleY={scale}
            transformScaleZ={scale}
            depthTest={false}
            depthWrite={false}
          >
            {panel.content}
          </FloatingContainer>
        ) : (
          <DesktopMenuOverlay key={panel.id}>{panel.content}</DesktopMenuOverlay>
        ),
      )}
    </>
  );
}
