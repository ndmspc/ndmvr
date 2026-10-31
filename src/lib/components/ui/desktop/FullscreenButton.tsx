import styled from "styled-components";
import icon from "../../../assets/icons/fullscreen.svg";
import { useEffect, useState, type RefObject } from "react";

interface SafariDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}

interface SafariHTMLElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

const FullscreenButtonWrapper = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 10;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.5);
  padding: 2px;
  border: none;
  border-radius: 10px;
  transition: background 0.3s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;

  &:hover {
    background: rgba(255, 0, 0, 0.5);
  }
`;

const FullscreenImage = styled.img`
  opacity: 1;
  display: block;
  height: 42px;
  pointer-events: none;
`;

export default function FullscreenButton({
  containerRef,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const getFullscreenElement = () => {
    const safariDocument = document as SafariDocument;

    return document.fullscreenElement ?? safariDocument.webkitFullscreenElement ?? null;
  };

  const handleFullscreen = async () => {
    const safariDocument = document as SafariDocument;
    const rootElement = containerRef.current as SafariHTMLElement | null;
    if (!rootElement) return;

    try {
      if (getFullscreenElement() === rootElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          return;
        }

        if (safariDocument.webkitExitFullscreen) {
          await safariDocument.webkitExitFullscreen();
          return;
        }

        console.warn("Exiting fullscreen is not supported.");
        return;
      }

      if (rootElement.requestFullscreen) {
        await rootElement.requestFullscreen();
        return;
      }

      if (rootElement.webkitRequestFullscreen) {
        await rootElement.webkitRequestFullscreen();
        return;
      }

      console.warn("Fullscreen API is not supported by this browser.");
    } catch (err) {
      console.error("Fullscreen API error:", err);
    }
  };

  useEffect(() => {
    const update = () => setFullscreen(getFullscreenElement() === containerRef.current);
    const handleFullscreenError = (event: Event) => {
      console.error("Fullscreen event error:", event);
    };

    document.addEventListener("fullscreenerror", handleFullscreenError);
    document.addEventListener("webkitfullscreenerror", handleFullscreenError);
    document.addEventListener("fullscreenchange", update);
    document.addEventListener("webkitfullscreenchange", update);
    update();

    return () => {
      document.removeEventListener("fullscreenerror", handleFullscreenError);
      document.removeEventListener("webkitfullscreenerror", handleFullscreenError);
      document.removeEventListener("fullscreenchange", update);
      document.removeEventListener("webkitfullscreenchange", update);
    };
  }, [containerRef]);

  return (
    <FullscreenButtonWrapper
      type="button"
      aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      aria-pressed={fullscreen}
      onClick={handleFullscreen}
    >
      <FullscreenImage src={icon} alt={"Fullscreen Button"} />
    </FullscreenButtonWrapper>
  );
}
