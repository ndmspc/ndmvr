export const INTERACTION_EVENTS = {
    MOBILE_MOVE: "mobile-move",
    MENU_RESET: "ndmvr-menu-reset",
    MENU_SHIFT: "ndmvr-menu-shift",
    MENU_FOLLOW_TOGGLE: "ndmvr-menu-follow-toggle",
    MENU_ORBIT: "ndmvr-menu-orbit",
    MENU_ORBIT_END: "ndmvr-menu-orbit-end",
    SHIFT_STEP_SCALE: "ndmvr-shiftstep-scale",
} as const;

export type MobileMoveDirection = "forward" | "back" | "left" | "right" | "up" | "down";

export interface MobileMoveDetail {
    dir: MobileMoveDirection;
    pressed: boolean;
}

export interface PressedInteractionDetail {
    pressed: boolean;
}

export interface MenuOrbitDetail {
    axisX: number;
    axisY: number;
    delta: number;
}
