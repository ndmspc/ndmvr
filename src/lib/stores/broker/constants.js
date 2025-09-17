export const STAT = Object.freeze({
    IDLE: "idle",
    CONNECTING: "connecting",
    CONNECTED: "connected",
    RECONNECTING: "reconnecting",
    ERROR: "error",
});

export const ERR = Object.freeze({
    NOT_FOUND: "Broker not found",
    WS_ERROR: "WebSocket error",
    WS_CLOSED: "Unexpected WebSocket disconnect",
    TIMEOUT: "Unable to connect within 60 seconds. Please try again",
});

export const RECONNECT_TIMEOUT_MS = 60000;

export const HISTOGRAM_ID = "histogram1";