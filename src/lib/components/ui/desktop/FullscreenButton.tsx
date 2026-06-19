import styled from "styled-components";
import icon from "../../../assets/icons/fullscreen.svg";
import { useEffect, useState } from "react";

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

export default function FullscreenButton() {
    const [isFullscreen, setIsFullscreen] = useState(false);

    const getFullscreenElement = () => {
        const safariDocument = document as SafariDocument;

        return document.fullscreenElement ?? safariDocument.webkitFullscreenElement ?? null;
    };

    const handleFullscreen = async () => {
        const safariDocument = document as SafariDocument;
        const rootElement = document.documentElement as SafariHTMLElement;

        try {
            if (getFullscreenElement()) {
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
        const handleFullscreenChange = () => {
            setIsFullscreen(Boolean(getFullscreenElement()));
        };

        const handleFullscreenError = (event: Event) => {
            console.error("Fullscreen event error:", event);
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("fullscreenerror", handleFullscreenError);
        document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
        document.addEventListener("webkitfullscreenerror", handleFullscreenError);

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener("fullscreenerror", handleFullscreenError);
            document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
            document.removeEventListener("webkitfullscreenerror", handleFullscreenError);
        };
    }, []);

    return (
        <FullscreenButtonWrapper onClick={handleFullscreen}>
            <FullscreenImage src={icon} alt={"Fullscreen Button"} />
        </FullscreenButtonWrapper>
    );
}
