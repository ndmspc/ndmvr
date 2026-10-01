export const INTERACTION_EVENTS = {
    MOBILE_MOVE: "mobile-move",
} as const;

export type MobileMoveDirection = "forward" | "back" | "left" | "right" | "up" | "down";

export interface MobileMoveDetail {
    dir: MobileMoveDirection;
    pressed: boolean;
}
