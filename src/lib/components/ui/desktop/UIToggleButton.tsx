import styled from "styled-components";
import showMenuIcon from "../../../assets/icons/show_menu.svg";
import closeMenuIcon from "../../../assets/icons/close_menu.svg";
import { useMenuStore } from "../../../stores/menu/store";

interface ToggleButtonWrapperProps {
    $isActive: boolean;
}

const ToggleButtonWrapper = styled.div<ToggleButtonWrapperProps>`
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 10;
    cursor: pointer;
    padding: 5px 5px;
    border-radius: 4px;
    transition: background 0.3s ease;
    &:hover {
        background: ${(props) =>
            props.$isActive ? "rgba(0, 150, 255, 0.7)" : "rgba(0, 150, 255, 0.7)"};
    }
`;

const ShowMenuImage = styled.img`
    display: block;
    height: 30px;
    opacity: 1;
    user-select: none;
`;

const CloseMenuImage = styled.img`
    display: block;
    height: 30px;
    opacity: 1;
    user-select: none;
`;

export default function UIToggleButton() {
    const { showMenu, toggleTab, menuExists } = useMenuStore();

    if (!menuExists) return null;
    return (
        <ToggleButtonWrapper
            $isActive={showMenu}
            onClick={() => {
                toggleTab(null);
            }}
        >
            {showMenu ? (
                <CloseMenuImage src={closeMenuIcon} alt={"Close menu"} />
            ) : (
                <ShowMenuImage src={showMenuIcon} alt={"Show menu"} />
            )}
        </ToggleButtonWrapper>
    );
}
