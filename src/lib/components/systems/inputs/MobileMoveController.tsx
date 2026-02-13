import { useState } from "react";
import styled from "styled-components";
// @ts-expect-error
import arrowUp from "../../../assets/icons/arrow.svg";
// @ts-expect-error
import arrowBig from "../../../assets/icons/arrow_big.svg";

type Dir = "forward" | "back" | "left" | "right" | "up" | "down";

interface ButtonProps {
    $active?: boolean;
}

const ControllerWrapper = styled.div`
    position: absolute;
    left: 20px;
    bottom: 20px;

    display: grid;
    grid-template-columns: 64px 64px 64px;
    grid-template-rows: 64px 64px 64px;
    gap: 8px;

    z-index: 0;
    user-select: none;
    touch-action: none;
`;

const RightControllerWrapper = styled.div`
    position: absolute;
    right: 20px;
    bottom: 140px;

    display: flex;
    flex-direction: column;
    gap: 12px;

    z-index: 20;
    user-select: none;
    touch-action: none;
`;

const MoveButton = styled.button<ButtonProps>`
    display: flex;
    align-items: center;
    justify-content: center;

    width: 64px;
    height: 64px;

    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 12px;

    background: ${(p) =>
        p.$active ? "rgba(0,150,255,0.75)" : "rgba(0,0,0,0.45)"};

    -webkit-tap-highlight-color: transparent;
    user-select: none;
    touch-action: none;

    transform: ${(p) => (p.$active ? "scale(0.96)" : "scale(1)")};
    transition: transform 0.05s linear, background 0.08s linear;

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

interface MobileMoveControllerProps {
    onMoveStart: (dir: Dir) => void;
    onMoveEnd: (dir: Dir) => void;
}

export default function MobileMoveController({
                                                 onMoveStart,
                                                 onMoveEnd,
                                             }: MobileMoveControllerProps) {
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

    const holdHandlers = (dir: Dir) => ({
        onPointerDown: () => press(dir),
        onPointerUp: () => release(dir),
        onPointerCancel: () => release(dir),
        onPointerLeave: () => release(dir),
    });

    return (
        <>
            <ControllerWrapper>
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

            <RightControllerWrapper>
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
