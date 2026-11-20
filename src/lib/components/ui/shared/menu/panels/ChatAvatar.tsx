import { Container } from "@react-three/uikit";
import { Bot, User } from "@react-three/uikit-lucide";
import { memo } from "react";
import type { ComponentProps } from "react";

export type ChatAvatarProps = {
  isOwn: boolean;
};

const AVATAR_SIZE = 32;
const AVATAR_ICON_SIZE = 20;

const AVATAR_BASE_STYLE: ComponentProps<typeof Container> = {
  width: AVATAR_SIZE,
  height: AVATAR_SIZE,
  borderRadius: 9999,
  flexShrink: 0,
  alignItems: "center",
  justifyContent: "center",
};

const OWN_AVATAR_STYLE: ComponentProps<typeof Container> = {
  backgroundColor: "#064e3b",
  color: "#a7f3d0",
};

const PEER_AVATAR_STYLE: ComponentProps<typeof Container> = {
  backgroundColor: "#1e3a5f",
  color: "#bfdbfe",
};

function ChatAvatarComponent({ isOwn }: ChatAvatarProps) {
  return (
    <Container {...AVATAR_BASE_STYLE} {...(isOwn ? OWN_AVATAR_STYLE : PEER_AVATAR_STYLE)}>
      {isOwn ? (
        <User width={AVATAR_ICON_SIZE} height={AVATAR_ICON_SIZE} />
      ) : (
        <Bot width={AVATAR_ICON_SIZE} height={AVATAR_ICON_SIZE} />
      )}
    </Container>
  );
}

const ChatAvatar = memo(ChatAvatarComponent);

export default ChatAvatar;
