import { useState, Children, isValidElement } from "react";
import { Container } from "@react-three/uikit";
import { CopyPlus, X } from "@react-three/uikit-lucide";
import Dropdown, { DropdownProvider } from "../common/Dropdown";

export interface FrameProps {
  children?: React.ReactNode;
  parentMenuName?: string;
  onSpawn?: (menuName: string) => void;
  onClose?: () => void;
}

export default function Frame({ children, parentMenuName, onSpawn, onClose }: FrameProps) {
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

  const parentIdx = parentMenuName
    ? Math.max(
        0,
        items.findIndex((i) => i.menuName === parentMenuName),
      )
    : 0;

  const [activeIndex, setActiveIndex] = useState(parentIdx);

  if (items.length === 0) return null;

  const currentItem = items[activeIndex] ?? items[0];

  return (
    <DropdownProvider>
      <Container classList={["menuContainer"]} gap={12}>
        <Container
          width="100%"
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          gap={12}
          zIndexOffset={100}
        >
          <Dropdown
            key={currentItem.menuName}
            placeholder="Select panel"
            options={items.map((item) => item.menuLabel)}
            defaultValue={currentItem.menuLabel}
            onSelect={(label) => setActiveIndex(items.findIndex((i) => i.menuLabel === label))}
            width={200}
          />

          <Container flexDirection="row" gap={8}>
            {onSpawn && (
              <Container
                classList={["input", "ToolButton"]}
                onClick={() => onSpawn(currentItem.menuName!)}
              >
                <CopyPlus classList={["ToolButtonIcon"]} width={14} height={14} />
              </Container>
            )}

            {onClose && (
              <Container classList={["input", "ToolButton"]} onClick={onClose}>
                <X classList={["ToolButtonIcon"]} width={14} height={14} />
              </Container>
            )}
          </Container>
        </Container>

        <Container classList={["section", "sectionInner"]} width="100%" zIndexOffset={1}>
          {currentItem.child}
        </Container>
      </Container>
    </DropdownProvider>
  );
}
