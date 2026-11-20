import { Container, Text } from "@react-three/uikit";
import { memo } from "react";
import type { ComponentProps } from "react";
import ChatAvatar from "./ChatAvatar.tsx";

export type ChatMessageData = {
  id: number;
  text: string;
  isOwn: boolean;
};

export type ChatMessageProps = {
  text: string;
  isOwn: boolean;
};

const BUBBLE_PADDING_X = 12;

const ROW_GAP = 8;

const BUBBLE_BASE_STYLE: ComponentProps<typeof Container> = {
  maxWidth: "75%",
  flexShrink: 0,
  flexDirection: "row",
  alignItems: "flex-start",
  paddingX: BUBBLE_PADDING_X,
  paddingY: 8,
  borderRadius: 8,
};

const ROW_BASE_STYLE: ComponentProps<typeof Container> = {
  width: "100%",
  flexShrink: 0,
  flexDirection: "row",
  alignItems: "flex-start",
  gap: ROW_GAP,
};

const OWN_ROW_STYLE: ComponentProps<typeof Container> = {
  justifyContent: "flex-end",
};

const PEER_ROW_STYLE: ComponentProps<typeof Container> = {
  justifyContent: "flex-start",
};

const OWN_BUBBLE_STYLE: ComponentProps<typeof Container> = {
  backgroundColor: "#064e3b",
};

const PEER_BUBBLE_STYLE: ComponentProps<typeof Container> = {
  backgroundColor: "#1e3a5f",
};

const TEXT_STYLE: ComponentProps<typeof Text> = {
  whiteSpace: "pre-line",
  wordBreak: "break-word",
};

function ChatMessageComponent({ text, isOwn }: ChatMessageProps) {
  const bubbleStyle = isOwn ? OWN_BUBBLE_STYLE : PEER_BUBBLE_STYLE;

  return (
    <Container {...ROW_BASE_STYLE} {...(isOwn ? OWN_ROW_STYLE : PEER_ROW_STYLE)}>
      {isOwn ? (
        <>
          <Container {...BUBBLE_BASE_STYLE} {...bubbleStyle}>
            <Text {...TEXT_STYLE}>{text}</Text>
          </Container>
          <ChatAvatar isOwn />
        </>
      ) : (
        <>
          <ChatAvatar isOwn={false} />
          <Container {...BUBBLE_BASE_STYLE} {...bubbleStyle}>
            <Text {...TEXT_STYLE}>{text}</Text>
          </Container>
        </>
      )}
    </Container>
  );
}

const ChatMessage = memo(ChatMessageComponent);

export default ChatMessage;
