import { Container, Text } from "@react-three/uikit";
import { Button } from "@react-three/uikit-default";
import type { Container as VanillaContainer } from "@pmndrs/uikit";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { useFrame } from "@react-three/fiber";
import { Textarea } from "../../common/Input.tsx";
import { SendHorizontal } from "@react-three/uikit-lucide";
import ChatMessage from "./ChatMessage.tsx";

const PANEL_SIZE = { width: 600, height: 400 };

const STICK_THRESHOLD = 24;

const MESSAGES_STYLE: ComponentProps<typeof Container> = {
  width: "100%",
  flexGrow: 1,
  flexBasis: 0,
  minHeight: 0,
  flexDirection: "column",
  padding: 12,
  backgroundColor: "#0f172a",
  borderWidth: 1,
  borderColor: "#334155",
  borderRadius: 16,
  overflow: "scroll",
  scrollbarColor: "#475569",
};

const MESSAGES_CONTENT_STYLE: ComponentProps<typeof Container> = {
  width: "100%",
  flexDirection: "column",
  gap: 8,
  flexShrink: 0,
};

const EMPTY_STYLE: ComponentProps<typeof Text> = {
  color: "#94a3b8",
};

const COMPOSER_STYLE: ComponentProps<typeof Container> = {
  width: "100%",
  flexDirection: "row",
  alignItems: "flex-end",
  gap: 8,
  marginTop: 12,
  flexShrink: 0,
};

const INPUT_BOX_STYLE: ComponentProps<typeof Container> = {
  flexGrow: 1,
  flexBasis: 0,
  minWidth: 0,
  minHeight: 48,
  maxHeight: 120,
  flexDirection: "column",
  alignItems: "flex-start",
  justifyContent: "flex-start",
  paddingX: 12,
  paddingY: 12,
  backgroundColor: "#020617",
  borderWidth: 1,
  borderColor: "#475569",
  borderRadius: 8,
  overflow: "scroll",
  scrollbarColor: "#475569",
};

const INPUT_TEXT_STYLE: ComponentProps<typeof Textarea> = {
  width: "100%",
  flexShrink: 0,
  color: "#f1f5f9",
  whiteSpace: "pre-line",
  wordBreak: "break-word",
};

const SEND_BUTTON_STYLE: ComponentProps<typeof Button> = {
  width: 48,
  height: 48,
  flexGrow: 0,
  flexShrink: 0,
  padding: 0,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#10b981",
  color: "#ffffff",
  borderWidth: 0,
  borderRadius: 8,
};

const SEND_BUTTON_HOVER: ComponentProps<typeof Button>["hover"] = {
  backgroundColor: "#059669",
};

type ChatMessageEntry = {
  id: number;
  text: string;
  isOwn: boolean;
};

const MOCK_RESPONSES = [
  "Mock response.",
  "Mock response.",
  "Mock response.",
  "Mock response.",
  "Mock response.",
  "Mock response.",
  "Mock response.",
  "Mock response.",
];

const MOCK_REPLY_DELAY_MS = 700;

export default function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessageEntry[]>([]);
  const nextMessageId = useRef(0);
  const replyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (replyTimeout.current !== null) {
        clearTimeout(replyTimeout.current);
      }
    };
  }, []);

  const sendMessage = useCallback(() => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return;
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      { id: nextMessageId.current++, text: trimmedMessage, isOwn: true },
    ]);
    setMessage("");

    if (replyTimeout.current !== null) {
      clearTimeout(replyTimeout.current);
    }
    replyTimeout.current = setTimeout(() => {
      const reply = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
      setMessages((currentMessages) => [
        ...currentMessages,
        { id: nextMessageId.current++, text: reply, isOwn: false },
      ]);
      replyTimeout.current = null;
    }, MOCK_REPLY_DELAY_MS);
  }, [message]);

  return (
    <Container classList={["menuContainer"]} width={PANEL_SIZE.width} height={PANEL_SIZE.height}>
      <Text classList={["menuHeader"]}>Chat</Text>
      <ChatMessageList messages={messages} />
      <ChatComposer value={message} onValueChange={setMessage} onSend={sendMessage} />
    </Container>
  );
}

type ChatMessageListProps = {
  messages: ChatMessageEntry[];
};

const ChatMessageList = memo(function ChatMessageList({ messages }: ChatMessageListProps) {
  const containerRef = useRef<VanillaContainer>(null);
  const stickToBottom = useRef(true);

  const handleScroll = useCallback((_x: number, y: number) => {
    const container = containerRef.current;
    const maxScrollTop = container?.maxScrollPosition.value[1] ?? 0;
    stickToBottom.current = maxScrollTop - y <= STICK_THRESHOLD;
  }, []);

  useFrame(() => {
    const container = containerRef.current;
    if (!container) return;

    const [scrollLeft, scrollTop] = container.scrollPosition.value;
    const maxScrollTop = stickToBottom.current
      ? (container.maxScrollPosition.value[1] ?? 0)
      : scrollTop;
    if (scrollLeft === 0 && scrollTop === maxScrollTop) return;

    container.scrollPosition.value = [0, maxScrollTop];
  });

  return (
    <Container {...MESSAGES_STYLE} ref={containerRef} onScroll={handleScroll}>
      <Container {...MESSAGES_CONTENT_STYLE}>
        {messages.length === 0 ? (
          <Text {...EMPTY_STYLE}>No messages yet.</Text>
        ) : (
          messages.map(({ id, text, isOwn }) => <ChatMessage key={id} text={text} isOwn={isOwn} />)
        )}
      </Container>
    </Container>
  );
});

type ChatComposerProps = {
  value: string;
  onValueChange: (value: string) => void;
  onSend: () => void;
};

const ChatComposer = memo(function ChatComposer({
  value,
  onValueChange,
  onSend,
}: ChatComposerProps) {
  const canSend = value.trim().length > 0;

  return (
    <Container {...COMPOSER_STYLE}>
      <Container {...INPUT_BOX_STYLE}>
        <Textarea
          {...INPUT_TEXT_STYLE}
          value={value}
          placeholder="Write a message..."
          onValueChange={onValueChange}
        />
      </Container>

      <Button {...SEND_BUTTON_STYLE} hover={SEND_BUTTON_HOVER} disabled={!canSend} onClick={onSend}>
        <SendHorizontal />
      </Button>
    </Container>
  );
});

Chat.menuName = "chat";
Chat.menuLabel = "Chat";
