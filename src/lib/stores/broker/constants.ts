export const STAT = {
    IDLE: "idle",
    CONNECTING: "connecting",
    CONNECTED: "connected",
    RECONNECTING: "reconnecting",
    ERROR: "error",
} as const;

export type ConnectionStatus = (typeof STAT)[keyof typeof STAT];

export const ERR = {
    NOT_FOUND: "Broker not found",
    WS_ERROR: "WebSocket error",
    WS_CLOSED: "Unexpected WebSocket disconnect",
    TIMEOUT: "Unable to connect within 60 seconds. Please try again",
} as const;

export type ErrorMessage = (typeof ERR)[keyof typeof ERR];

export const RECONNECT_TIMEOUT_MS = 60000;

export const HISTOGRAM_ID = "pad1";
