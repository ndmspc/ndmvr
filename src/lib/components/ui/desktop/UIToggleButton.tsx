import styled from "styled-components";

interface ToggleButtonWrapperProps {
    $isActive: boolean;
}

const ToggleButtonWrapper = styled.div<ToggleButtonWrapperProps>`
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 10;
    cursor: pointer;
    background: ${(props) => (props.$isActive ? "rgba(0, 150, 255, 0.5)" : "rgba(0, 0, 0, 0.5)")};
    padding: 10px 15px;
    border-radius: 4px;
    transition: background 0.3s ease;

    &:hover {
        background: ${(props) =>
            props.$isActive ? "rgba(0, 150, 255, 0.7)" : "rgba(255, 0, 0, 0.5)"};
    }
`;

const ToggleText = styled.span`
    font-family: Arial, sans-serif;
    color: white;
    font-size: 14px;
    font-weight: 500;
    opacity: 1;
    user-select: none;
`;

interface UIToggleButtonProps {
    isActive: boolean;
    onToggle: () => void;
}

export default function UIToggleButton({ isActive, onToggle }: UIToggleButtonProps) {
    return (
        <ToggleButtonWrapper $isActive={isActive} onClick={onToggle}>
            <ToggleText>{isActive ? "Close menu" : "Show menu"}</ToggleText>
        </ToggleButtonWrapper>
    );
}
