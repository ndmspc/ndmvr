import styled from "styled-components";
import { Hammer, MousePointer2 } from "lucide-react";
import * as LucideIcons from "lucide-react";
import {
    type ModeToolIcon,
    type ModeToolIconProps,
    useSceneModeStore,
} from "../../../stores/sceneMode/store";
import { useEffect } from "react";

const Panel = styled.div`
    position: absolute;
    left: 50%;
    bottom: 24px;
    transform: translateX(-50%);
    z-index: 12;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px;
    border: 1px solid rgba(255, 255, 255, 0.22);
    border-radius: 18px;
    background: rgba(20, 24, 31, 0.32);
    box-shadow: 0 12px 38px rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(14px);
`;

const ToolButton = styled.button<{ $active: boolean }>`
    width: 44px;
    height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 1px solid ${(props) => (props.$active ? "rgba(255, 255, 255, 0.78)" : "rgba(255, 255, 255, 0.28)")};
    border-radius: 14px;
    color: ${(props) => (props.$active ? "#ffffff" : "rgba(255, 255, 255, 0.74)")};
    background: ${(props) => (props.$active ? "rgba(255, 255, 255, 0.18)" : "rgba(255, 255, 255, 0.08)")};
    cursor: pointer;
    outline: none;
    transition:
        background 140ms ease,
        border-color 140ms ease,
        color 140ms ease,
        transform 140ms ease;

    &:hover {
        transform: translateY(-1px);
        border-color: rgba(255, 255, 255, 0.72);
        background: rgba(255, 255, 255, 0.16);
        color: #ffffff;
    }

    &:focus-visible {
        border-color: rgba(255, 255, 255, 0.9);
        box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.18);
    }
`;

const Icon = styled.div`
    width: 23px;
    height: 23px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
`;

function renderIcon(icon: ModeToolIcon | undefined, fallback: React.ComponentType<ModeToolIconProps>) {
    const lucideIcon =
        typeof icon === "string"
            ? (LucideIcons[icon as keyof typeof LucideIcons] as
                  | React.ComponentType<ModeToolIconProps>
                  | undefined)
            : undefined;
    const IconComponent = typeof icon === "function" ? icon : lucideIcon ?? fallback;

    return <IconComponent size={23} strokeWidth={1.8} />;
}

export default function ModeToolsPanel() {
    const activeMode = useSceneModeStore((state) => state.activeMode);
    const setActiveMode = useSceneModeStore((state) => state.setActiveMode);
    const modesConfig = useSceneModeStore((state) => state.modesConfig);
    const setUIHover = useSceneModeStore((state) => state.setUIHover);

    const setMode = (mode: string) => {
        setActiveMode(mode);
        window.dispatchEvent(
            new CustomEvent("ndmvr-mode-toggle", { detail: { enabled: mode } })
        );
    };

    return (
        <Panel onMouseEnter={() => setUIHover(true)} onMouseLeave={() => setUIHover(false)}>
            {Object.keys(modesConfig).map((mode) => (
                <ToolButton
                    type="button"
                    title={modesConfig[mode]?.title ?? `${mode} mode`}
                    aria-label={modesConfig[mode]?.ariaLabel ?? `${mode} mode`}
                    aria-pressed={activeMode === mode}
                    $active={activeMode === mode}
                    onClick={() => setMode(mode)}
                >
                    <Icon aria-hidden="true">
                        {renderIcon(modesConfig[mode]?.icon, MousePointer2)}
                    </Icon>
                </ToolButton>
            ))}
        </Panel>
    );
}
