import styled from "styled-components";
// @ts-ignore
import icon from "../../../assets/icons/fullscreen.svg";
import { useEffect, useState } from "react";

const FullscreenButtonWrapper = styled.div`
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
    border-radius: 10px;
    transition: background 0.3s ease;

    &:hover {
        background: rgba(255, 0, 0, 0.5);
    }
`;

const FullscreenImage = styled.img`
    opacity: 1;
    display: block;
    height: 42px;
`;

export default function FullscreenButton() {
    const handleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        }
    };

    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
        };
    }, []);

    if (isFullscreen) {
        return null;
    }

    return (
        <FullscreenButtonWrapper onClick={handleFullscreen}>
            <FullscreenImage src={icon} alt={"Fullscreen Button"} />
        </FullscreenButtonWrapper>
    );
}
