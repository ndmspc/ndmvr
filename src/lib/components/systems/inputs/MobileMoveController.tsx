import { useState } from "react";
import styled from "styled-components";
import arrowUp from "../../../assets/icons/arrow.svg";
import arrowBig from "../../../assets/icons/arrow_big.svg";
import gamepadIcon from "../../../assets/icons/gamepad.svg";

type Dir = "forward" | "back" | "left" | "right" | "up" | "down";

interface ButtonProps {
    $active?: boolean;
}

interface ControllerProps {
    $visible: boolean;
}

const ControllerWrapper = styled.div<ControllerProps>`
    position: absolute;
    left: 20px;
    bottom: 20px;

    display: grid;
    grid-template-columns: 64px 64px 64px;
    grid-template-rows: 64px 64px 64px;
    gap: 8px;


    z-index: 100;
    user-select: none;
    touch-action: none;
    pointer-events: none;

    transform: translateX(${(p) => (p.$visible ? "0" : "-120%")});
    opacity: ${(p) => (p.$visible ? "1" : "0")};

    transition:
        transform 0.3s ease,
        opacity 0.2s ease;
`;

const RightControllerWrapper = styled.div<ControllerProps>`
    position: absolute;
    right: 20px;
    bottom: 140px;

    display: flex;
    flex-direction: column;
    gap: 12px;

    z-index: 100;
    user-select: none;
    touch-action: none;
    pointer-events: none;

    transform: translateX(${(p) => (p.$visible ? "0" : "-120vw")});
    opacity: ${(p) => (p.$visible ? "1" : "0")};

    transition:
        transform 0.3s ease,
        opacity 0.2s ease;
`;

const HideButton = styled.button<ControllerProps>`
    position: absolute;
    left: ${(p) => (p.$visible ? "20px" : "0")};
    bottom: 244px;

    width: ${(p) => (p.$visible ? "105px" : "48px")};
    height: 44px;
    padding: ${(p) => (p.$visible ? "0 12px" : "0")};

    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;

    z-index: 101;
    pointer-events: auto;

    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: ${(p) => (p.$visible ? "12px" : "0 12px 12px 0")};

    color: white;
    background: rgba(0, 0, 0, 0.45);

    font-size: ${(p) => (p.$visible ? "15px" : "20px")};

    cursor: pointer;
    user-select: none;
    touch-action: none;
    -webkit-tap-highlight-color: transparent;

    transition:
        left 0.3s ease,
        width 0.3s ease,
        padding 0.3s ease,
        border-radius 0.3s ease;
`;

const MoveButton = styled.button<ButtonProps>`
    display: flex;
    align-items: center;
    justify-content: center;

    width: 64px;
    height: 64px;

    pointer-events: auto;

    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 12px;

    background: ${(p) => (p.$active ? "rgba(0,150,255,0.75)" : "rgba(0,0,0,0.45)")};

    -webkit-tap-highlight-color: transparent;
    user-select: none;
    touch-action: none;

    transform: ${(p) => (p.$active ? "scale(0.96)" : "scale(1)")};
    transition:
        transform 0.05s linear,
        background 0.08s linear;

    cursor: pointer;
`;

const ArrowIcon = styled.img<{ $rotate?: number }>`
    width: 28px;
    height: 28px;
    pointer-events: none;
    transform: rotate(${(p) => p.$rotate ?? 0}deg);
    filter: brightness(0) invert(1);
`;

const ArrowIconBig = styled.img<{ $rotate?: number }>`
    width: 35px;
    height: 35px;
    pointer-events: none;
    transform: rotate(${(p) => p.$rotate ?? 0}deg);
    filter: brightness(0) invert(1);
`;

const GamepadIcon = styled.img`
    width: 24px;
    height: 24px;
    pointer-events: none;
    filter: brightness(0) invert(1);
`;

interface MobileMoveControllerProps {
    onMoveStart: (dir: Dir) => void;
    onMoveEnd: (dir: Dir) => void;
}

export default function MobileMoveController({
                                                 onMoveStart,
                                                 onMoveEnd,
                                             }: MobileMoveControllerProps) {
    const [controlsVisible, setControlsVisible] = useState(true);

    const [active, setActive] = useState<Record<Dir, boolean>>({
        forward: false,
        back: false,
        left: false,
        right: false,
        up: false,
        down: false,
    });

    const press = (dir: Dir) => {
        setActive((p) => ({ ...p, [dir]: true }));
        onMoveStart(dir);
    };

    const release = (dir: Dir) => {
        setActive((p) => ({ ...p, [dir]: false }));
        onMoveEnd(dir);
    };

    const hideControls = () => {
        if (controlsVisible) {
            Object.entries(active).forEach(([dir, isActive]) => {
                if (isActive) {
                    onMoveEnd(dir as Dir);
                }
            });

            setActive({
                forward: false,
                back: false,
                left: false,
                right: false,
                up: false,
                down: false,
            });
        }

        setControlsVisible((p) => !p);
    };

    const holdHandlers = (dir: Dir) => ({
        onPointerDown: () => press(dir),
        onPointerUp: () => release(dir),
        onPointerCancel: () => release(dir),
        onPointerLeave: () => release(dir),
    });

    return (
        <>
            <HideButton
                $visible={controlsVisible}
                onClick={hideControls}
            >
                <GamepadIcon src={gamepadIcon} />
                {controlsVisible && "Hide"}
            </HideButton>

            <ControllerWrapper $visible={controlsVisible}>
                <div />
                <MoveButton $active={active.forward} {...holdHandlers("forward")}>
                    <ArrowIcon src={arrowUp} $rotate={0} />
                </MoveButton>
                <div />

                <MoveButton $active={active.left} {...holdHandlers("left")}>
                    <ArrowIcon src={arrowUp} $rotate={-90} />
                </MoveButton>

                <MoveButton $active={active.back} {...holdHandlers("back")}>
                    <ArrowIcon src={arrowUp} $rotate={180} />
                </MoveButton>

                <MoveButton $active={active.right} {...holdHandlers("right")}>
                    <ArrowIcon src={arrowUp} $rotate={90} />
                </MoveButton>

                <div />
                <div />
                <div />
            </ControllerWrapper>

            <RightControllerWrapper $visible={controlsVisible}>
                <MoveButton $active={active.up} {...holdHandlers("up")}>
                    <ArrowIconBig src={arrowBig} $rotate={0} />
                </MoveButton>

                <MoveButton $active={active.down} {...holdHandlers("down")}>
                    <ArrowIconBig src={arrowBig} $rotate={180} />
                </MoveButton>
            </RightControllerWrapper>
        </>
    );
}
