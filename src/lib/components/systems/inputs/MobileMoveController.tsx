import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import styled from "styled-components";
import type { MobileMoveDirection } from "../../../interactions/events";
import arrowUp from "../../../assets/icons/arrow.svg";
import arrowBig from "../../../assets/icons/arrow_big.svg";
import gamepadIcon from "../../../assets/icons/gamepad.svg";

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
    onMoveStart: (dir: MobileMoveDirection) => void;
    onMoveEnd: (dir: MobileMoveDirection) => void;
}

interface DirectionButtonProps {
    dir: MobileMoveDirection;
    active: boolean;
    onPress: (dir: MobileMoveDirection, pointerId: number) => void;
    onRelease: (pointerId: number) => void;
    children: React.ReactNode;
}

function DirectionButton({ dir, active, onPress, onRelease, children }: DirectionButtonProps) {
    const release = (event: React.PointerEvent) => onRelease(event.pointerId);
    return (
        <MoveButton
            $active={active}
            onPointerDown={(event) => onPress(dir, event.pointerId)}
            onPointerUp={release}
            onPointerCancel={release}
            onPointerLeave={release}
            onLostPointerCapture={release}
        >
            {children}
        </MoveButton>
    );
}

export default function MobileMoveController({
    onMoveStart,
    onMoveEnd,
}: MobileMoveControllerProps) {
    const [controlsVisible, setControlsVisible] = useState(true);

    const [active, setActive] = useState<Record<MobileMoveDirection, boolean>>({
        forward: false,
        back: false,
        left: false,
        right: false,
        up: false,
        down: false,
    });

    const held = useRef(new Map<number, MobileMoveDirection>());
    const endMove = useRef(onMoveEnd);
    useLayoutEffect(() => {
        endMove.current = onMoveEnd;
    }, [onMoveEnd]);

    const release = useCallback((pointerId: number) => {
        const dir = held.current.get(pointerId);
        if (!dir) return;
        held.current.delete(pointerId);
        if (![...held.current.values()].includes(dir)) {
            setActive((previous) => ({ ...previous, [dir]: false }));
            endMove.current(dir);
        }
    }, []);

    useEffect(() => {
        const pointers = held.current;
        const end = (event: PointerEvent) => release(event.pointerId);
        const cancel = () => {
            for (const pointerId of pointers.keys()) release(pointerId);
        };
        const visibility = () => {
            if (document.hidden) cancel();
        };
        window.addEventListener("pointerup", end);
        window.addEventListener("pointercancel", end);
        window.addEventListener("blur", cancel);
        document.addEventListener("visibilitychange", visibility);
        return () => {
            window.removeEventListener("pointerup", end);
            window.removeEventListener("pointercancel", end);
            window.removeEventListener("blur", cancel);
            document.removeEventListener("visibilitychange", visibility);
            cancel();
        };
    }, [release]);

    const hideControls = () => {
        for (const pointerId of held.current.keys()) release(pointerId);
        setControlsVisible((previous) => !previous);
    };

    const press = (dir: MobileMoveDirection, pointerId: number) => {
        if (held.current.has(pointerId)) return;
        const alreadyHeld = [...held.current.values()].includes(dir);
        held.current.set(pointerId, dir);
        if (!alreadyHeld) {
            setActive((previous) => ({ ...previous, [dir]: true }));
            onMoveStart(dir);
        }
    };
    return (
        <>
            <HideButton $visible={controlsVisible} onClick={hideControls}>
                <GamepadIcon src={gamepadIcon} />
                {controlsVisible && "Hide"}
            </HideButton>

            <ControllerWrapper $visible={controlsVisible}>
                <div />
                <DirectionButton dir="forward" active={active.forward} onPress={press} onRelease={release}>
                    <ArrowIcon src={arrowUp} $rotate={0} />
                </DirectionButton>
                <div />

                <DirectionButton dir="left" active={active.left} onPress={press} onRelease={release}>
                    <ArrowIcon src={arrowUp} $rotate={-90} />
                </DirectionButton>

                <DirectionButton dir="back" active={active.back} onPress={press} onRelease={release}>
                    <ArrowIcon src={arrowUp} $rotate={180} />
                </DirectionButton>

                <DirectionButton dir="right" active={active.right} onPress={press} onRelease={release}>
                    <ArrowIcon src={arrowUp} $rotate={90} />
                </DirectionButton>

                <div />
                <div />
                <div />
            </ControllerWrapper>

            <RightControllerWrapper $visible={controlsVisible}>
                <DirectionButton dir="up" active={active.up} onPress={press} onRelease={release}>
                    <ArrowIconBig src={arrowBig} $rotate={0} />
                </DirectionButton>

                <DirectionButton dir="down" active={active.down} onPress={press} onRelease={release}>
                    <ArrowIconBig src={arrowBig} $rotate={180} />
                </DirectionButton>
            </RightControllerWrapper>
        </>
    );
}
