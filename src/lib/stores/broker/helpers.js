import { STAT, ERR, RECONNECT_TIMEOUT_MS } from "./constants.js";

export function interceptWsProperty(broker, url, set, get) {
    if (broker.__wsIntercepted) return;
    broker.__wsIntercepted = true;

    let _ws = broker.ws || null;

    Object.defineProperty(broker, "ws", {
        configurable: true,
        enumerable: true,
        get() {
            return _ws;
        },
        set(value) {
            _ws = value;
            attachWsHandlers(_ws, url, set, get);
        },
    });
}

function startReconnectTimer(set, get) {
    const { reconnectTimeoutId, isManualDisconnect, connectionStatus } = get();

    if (reconnectTimeoutId) return;
    if (isManualDisconnect || connectionStatus === STAT.ERROR) return;

    const tempReconnectTimeoutId = setTimeout(() => {
        if (
            get().connectionStatus !== STAT.CONNECTED
        ) {
            set({
                connectionStatus: STAT.ERROR,
                error: ERR.TIMEOUT,
                reconnectTimeoutId: null,
            });
        } else {
            set({ reconnectTimeoutId: null });
        }
    }, RECONNECT_TIMEOUT_MS);
    set({ reconnectTimeoutId: tempReconnectTimeoutId });
}

function attachWsHandlers(ws, url, set, get) {
    if (!ws || ws.__handlersAttached) return;
    ws.__handlersAttached = true;

    const onOpen = () => {
        const { reconnectTimeoutId } = get();
        if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
        set({
            connectionStatus: STAT.CONNECTED,
            error: null,
            isManualDisconnect: false,
            reconnectTimeoutId: null,
        });
        console.log("[Broker] connected", url);
    };

    const onError = () => {
        const { isManualDisconnect, connectionStatus } = get();
        if (!isManualDisconnect) {
            set({ connectionStatus: STAT.RECONNECTING, error: ERR.WS_ERROR });
        }
        if (connectionStatus !== STAT.ERROR) startReconnectTimer(set, get);
    };

    const onClose = () => {
        const { isManualDisconnect, connectionStatus } = get();
        if (isManualDisconnect) {
            set({ connectionStatus: STAT.IDLE });
        } else {
            set({
                connectionStatus: STAT.RECONNECTING,
                error: ERR.WS_CLOSED,
            });
            if (connectionStatus !== STAT.ERROR) startReconnectTimer(set, get);
        }
    };

    ws.addEventListener("open", onOpen);
    ws.addEventListener("error", onError);
    ws.addEventListener("close", onClose);
}
