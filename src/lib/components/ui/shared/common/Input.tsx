import { useSceneInteractive } from "../../../../interactions/input/useSceneInteractive";
import { Input as UIKitInput } from "@react-three/uikit";
import type { ComponentProps } from "react";

/** UIKit's hidden DOM inputs live outside the Canvas container, so inert cannot disable them. */
export default function Input(props: ComponentProps<typeof UIKitInput>) {
  const enabled = useSceneInteractive();
  return <UIKitInput {...props} disabled={!enabled || props.disabled} />;
}
