import { useEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { Fullscreen } from "@react-three/uikit";

import Container from "../interactions/Container";
import { useUIInteraction } from "../interactions/useUIInteraction";

const DEFAULT_LEFT = 16;
const DEFAULT_TOP = 16;
const DEFAULT_SCALE = 1;
const MIN_SCALE = 0.75;
const MAX_SCALE = 1.5;
const ESTIMATED_WIDTH = 380;
const MIN_VISIBLE_WIDTH = 96;
const MIN_VISIBLE_HEIGHT = 48;
const SCALE_SENSITIVITY = 260;
const STORAGE_KEYS = {
    left: "ndmvr.desktopMenu.left",
    top: "ndmvr.desktopMenu.top",
    scale: "ndmvr.desktopMenu.scale",
};

type OverlayState = {
    left: number;
    top: number;
    scale: number;
};

type InteractionState =
    | {
        type: "drag";
        startClientX: number;
        startClientY: number;
        startLeft: number;
        startTop: number;
    }
    | {
        type: "scale";
        startClientX: number;
        startClientY: number;
        startScale: number;
        startLeft: number;
        startTop: number;
    };

type UIKitPointerEventLike = {
    nativeEvent?: unknown;
    stopPropagation?: () => void;
    preventDefault?: () => void;
};

type DesktopMenuOverlayProps = {
    children: React.ReactNode;
};

function clampNumber(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function readStoredNumber(key: string, fallback: number) {
    try {
        if (typeof window === "undefined") return fallback;
        const stored = window.localStorage.getItem(key);
        if (stored === null) return fallback;
        const parsed = Number(stored);
        return Number.isFinite(parsed) ? parsed : fallback;
    } catch {
        return fallback;
    }
}

function writeStoredNumber(key: string, value: number) {
    try {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(key, String(value));
    } catch {
        /* localStorage can be unavailable in restricted browser contexts */
    }
}

function readStoredOverlayState(): OverlayState {
    return {
        left: readStoredNumber(STORAGE_KEYS.left, DEFAULT_LEFT),
        top: readStoredNumber(STORAGE_KEYS.top, DEFAULT_TOP),
        scale: clampNumber(
            readStoredNumber(STORAGE_KEYS.scale, DEFAULT_SCALE),
            MIN_SCALE,
            MAX_SCALE
        ),
    };
}

function persistOverlayState(state: OverlayState) {
    writeStoredNumber(STORAGE_KEYS.left, Math.round(state.left));
    writeStoredNumber(STORAGE_KEYS.top, Math.round(state.top));
    writeStoredNumber(STORAGE_KEYS.scale, Number(state.scale.toFixed(3)));
}

function getPointerEventSource(event: unknown) {
    if (typeof event === "object" && event !== null && "nativeEvent" in event) {
        const nativeEvent = (event as UIKitPointerEventLike).nativeEvent;
        if (typeof nativeEvent === "object" && nativeEvent !== null) {
            return nativeEvent as Partial<PointerEvent>;
        }
    }

    return event as Partial<PointerEvent>;
}

function getPointerClientPosition(event: unknown) {
    const pointerEvent = getPointerEventSource(event);
    return {
        x: pointerEvent?.clientX ?? 0,
        y: pointerEvent?.clientY ?? 0,
    };
}

function stopDesktopPointerEvent(event: unknown) {
    if (typeof event !== "object" || event === null) return;

    const uiEvent = event as UIKitPointerEventLike;
    uiEvent.stopPropagation?.();
    uiEvent.preventDefault?.();

    const nativeEvent = uiEvent.nativeEvent;
    if (typeof nativeEvent === "object" && nativeEvent !== null) {
        const pointerEvent = nativeEvent as UIKitPointerEventLike;
        pointerEvent.stopPropagation?.();
        pointerEvent.preventDefault?.();
    }
}

function getViewportSize(canvasSize: { width: number; height: number }) {
    const width =
        canvasSize.width ||
        (typeof window !== "undefined" ? window.innerWidth : 1024);
    const height =
        canvasSize.height ||
        (typeof window !== "undefined" ? window.innerHeight : 768);

    return { width, height };
}

function clampOverlayState(
    state: OverlayState,
    canvasSize: { width: number; height: number }
) {
    const viewport = getViewportSize(canvasSize);
    const scale = clampNumber(state.scale, MIN_SCALE, MAX_SCALE);
    const estimatedWidth = ESTIMATED_WIDTH * scale;
    const minLeft = Math.min(DEFAULT_LEFT, MIN_VISIBLE_WIDTH - estimatedWidth);
    const maxLeft = Math.max(DEFAULT_LEFT, viewport.width - MIN_VISIBLE_WIDTH);
    const maxTop = Math.max(DEFAULT_TOP, viewport.height - MIN_VISIBLE_HEIGHT);

    return {
        left: clampNumber(state.left, minLeft, maxLeft),
        top: clampNumber(state.top, 0, maxTop),
        scale,
    };
}

function areOverlayStatesEqual(a: OverlayState, b: OverlayState) {
    return a.left === b.left && a.top === b.top && a.scale === b.scale;
}

export default function DesktopMenuOverlay({ children }: DesktopMenuOverlayProps) {
    const canvasSize = useThree((state) => state.size);
    const setInteracting = useUIInteraction((state) => state.setInteracting);
    const [overlayReady, setOverlayReady] = useState(false);
    const [overlay, setOverlay] = useState<OverlayState>(() => readStoredOverlayState());
    const overlayRef = useRef(overlay);
    const interactionRef = useRef<InteractionState | null>(null);
    const cleanupInteractionRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        overlayRef.current = overlay;
    }, [overlay]);

    useEffect(() => {
        let firstFrame = 0;
        let secondFrame = 0;

        firstFrame = window.requestAnimationFrame(() => {
            secondFrame = window.requestAnimationFrame(() => {
                setOverlayReady(true);
            });
        });

        return () => {
            window.cancelAnimationFrame(firstFrame);
            window.cancelAnimationFrame(secondFrame);
        };
    }, []);

    useEffect(() => {
        setOverlay((current) => {
            const next = clampOverlayState(current, {
                width: canvasSize.width,
                height: canvasSize.height,
            });
            if (areOverlayStatesEqual(current, next)) return current;
            overlayRef.current = next;
            persistOverlayState(next);
            return next;
        });
    }, [canvasSize.width, canvasSize.height]);

    useEffect(() => {
        return () => {
            cleanupInteractionRef.current?.();
        };
    }, []);

    const beginDrag = (event: unknown) => {
        const pointerEvent = getPointerEventSource(event);
        if (pointerEvent?.button !== undefined && pointerEvent.button !== 0) return;

        stopDesktopPointerEvent(event);
        cleanupInteractionRef.current?.();

        const start = getPointerClientPosition(event);
        const current = clampOverlayState(overlayRef.current, canvasSize);

        interactionRef.current = {
            type: "drag",
            startClientX: start.x,
            startClientY: start.y,
            startLeft: current.left,
            startTop: current.top,
        };

        setInteracting(true);

        const handlePointerMove = (moveEvent: PointerEvent) => {
            moveEvent.preventDefault();

            const interaction = interactionRef.current;
            if (!interaction || interaction.type !== "drag") return;

            const next = clampOverlayState(
                {
                    left: interaction.startLeft + moveEvent.clientX - interaction.startClientX,
                    top: interaction.startTop + moveEvent.clientY - interaction.startClientY,
                    scale: overlayRef.current.scale,
                },
                canvasSize
            );

            overlayRef.current = next;
            setOverlay(next);
        };

        const endInteraction = (endEvent?: PointerEvent) => {
            endEvent?.preventDefault();
            window.removeEventListener("pointermove", handlePointerMove, true);
            window.removeEventListener("pointerup", endInteraction, true);
            window.removeEventListener("pointercancel", endInteraction, true);

            interactionRef.current = null;
            cleanupInteractionRef.current = null;
            setInteracting(false);

            const next = clampOverlayState(overlayRef.current, canvasSize);
            overlayRef.current = next;
            setOverlay(next);
            persistOverlayState(next);
        };

        cleanupInteractionRef.current = () => {
            window.removeEventListener("pointermove", handlePointerMove, true);
            window.removeEventListener("pointerup", endInteraction, true);
            window.removeEventListener("pointercancel", endInteraction, true);
            interactionRef.current = null;
            cleanupInteractionRef.current = null;
            setInteracting(false);
            persistOverlayState(overlayRef.current);
        };

        window.addEventListener("pointermove", handlePointerMove, true);
        window.addEventListener("pointerup", endInteraction, true);
        window.addEventListener("pointercancel", endInteraction, true);
    };

    const beginScale = (event: unknown) => {
        const pointerEvent = getPointerEventSource(event);
        if (pointerEvent?.button !== undefined && pointerEvent.button !== 0) return;

        stopDesktopPointerEvent(event);
        cleanupInteractionRef.current?.();

        const start = getPointerClientPosition(event);
        const current = clampOverlayState(overlayRef.current, canvasSize);

        interactionRef.current = {
            type: "scale",
            startClientX: start.x,
            startClientY: start.y,
            startScale: current.scale,
            startLeft: current.left,
            startTop: current.top,
        };

        setInteracting(true);

        const handlePointerMove = (moveEvent: PointerEvent) => {
            moveEvent.preventDefault();

            const interaction = interactionRef.current;
            if (!interaction || interaction.type !== "scale") return;

            const scaleDelta =
                (moveEvent.clientX - interaction.startClientX +
                    moveEvent.clientY - interaction.startClientY) /
                SCALE_SENSITIVITY;

            const next = clampOverlayState(
                {
                    left: interaction.startLeft,
                    top: interaction.startTop,
                    scale: interaction.startScale + scaleDelta,
                },
                canvasSize
            );

            overlayRef.current = next;
            setOverlay(next);
        };

        const endInteraction = (endEvent?: PointerEvent) => {
            endEvent?.preventDefault();
            window.removeEventListener("pointermove", handlePointerMove, true);
            window.removeEventListener("pointerup", endInteraction, true);
            window.removeEventListener("pointercancel", endInteraction, true);

            interactionRef.current = null;
            cleanupInteractionRef.current = null;
            setInteracting(false);

            const next = clampOverlayState(overlayRef.current, canvasSize);
            overlayRef.current = next;
            setOverlay(next);
            persistOverlayState(next);
        };

        cleanupInteractionRef.current = () => {
            window.removeEventListener("pointermove", handlePointerMove, true);
            window.removeEventListener("pointerup", endInteraction, true);
            window.removeEventListener("pointercancel", endInteraction, true);
            interactionRef.current = null;
            cleanupInteractionRef.current = null;
            setInteracting(false);
            persistOverlayState(overlayRef.current);
        };

        window.addEventListener("pointermove", handlePointerMove, true);
        window.addEventListener("pointerup", endInteraction, true);
        window.addEventListener("pointercancel", endInteraction, true);
    };

    if (!overlayReady) return null;

    return (
        <Fullscreen>
            <Container
                positionType="absolute"
                positionTop={overlay.top}
                positionLeft={overlay.left}
                maxWidth="95vw"
                maxHeight="95vh"
                flexDirection="column"
                pointerEvents="auto"
                renderOrder={5000}
                depthTest={false}
                depthWrite={false}
                transformOriginX="left"
                transformOriginY="top"
                transformScaleX={overlay.scale}
                transformScaleY={overlay.scale}
                transformScaleZ={overlay.scale}
            >
                <Container
                    height={22}
                    minWidth={300}
                    width="100%"
                    marginBottom={6}
                    borderRadius={10}
                    backgroundColor="#0f172a"
                    borderWidth={1}
                    borderColor="#334155"
                    alignItems="center"
                    justifyContent="center"
                    cursor="grab"
                    onPointerDown={beginDrag}
                >
                    <Container
                        width={42}
                        height={4}
                        borderRadius={2}
                        backgroundColor="#64748b"
                    />
                </Container>

                {children}

                <Container
                    positionType="absolute"
                    positionRight={-8}
                    positionBottom={-8}
                    width={24}
                    height={24}
                    borderRadius={6}
                    backgroundColor="#0f172a"
                    borderWidth={1}
                    borderColor="#64748b"
                    cursor="nwse-resize"
                    pointerEvents="auto"
                    alignItems="center"
                    justifyContent="center"
                    renderOrder={5010}
                    depthTest={false}
                    depthWrite={false}
                    onPointerDown={beginScale}
                >
                    <Container
                        width={10}
                        height={10}
                        borderRightWidth={2}
                        borderBottomWidth={2}
                        borderColor="#94a3b8"
                    />
                </Container>
            </Container>
        </Fullscreen>
    );
}
