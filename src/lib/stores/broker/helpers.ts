import { STAT, ERR, RECONNECT_TIMEOUT_MS, ConnectionStatus, ErrorMessage } from "./constants.ts";

interface BrokerStoreState {
    connectionStatus: ConnectionStatus;
    error: ErrorMessage | null;
    reconnectTimeoutId: ReturnType<typeof setTimeout> | null;
    isManualDisconnect: boolean;
}

type SetState = (partial: Partial<BrokerStoreState>) => void;
type GetState = () => BrokerStoreState;

interface BrokerWithWs {
    ws?: WebSocket | null;
}

const wsInterceptors = new WeakMap<BrokerWithWs, () => void>();

export function interceptWsProperty(
    broker: BrokerWithWs,
    url: string,
    set: SetState,
    get: GetState
): () => void {
    wsInterceptors.get(broker)?.();

    let _ws = broker.ws ?? null;
    let active = true;
    let detachHandlers: (() => void) | undefined;
    const attach = () => {
        const ws = _ws;
        detachHandlers = attachWsHandlers(
            ws,
            url,
            set,
            get,
            () => active,
            () => broker.ws === ws
        );
    };

    Object.defineProperty(broker, "ws", {
        configurable: true,
        enumerable: true,
        get() {
            return _ws;
        },
        set(value) {
            if (_ws === value) return;
            detachHandlers?.();
            _ws = value;
            attach();
        },
    });
    const dispose = () => {
        if (!active) return;
        active = false;
        detachHandlers?.();
        Object.defineProperty(broker, "ws", {
            configurable: true,
            enumerable: true,
            writable: true,
            value: _ws,
        });
        wsInterceptors.delete(broker);
    };
    wsInterceptors.set(broker, dispose);
    attach();
    return dispose;
}

function startReconnectTimer(set: SetState, get: GetState, isActive: () => boolean): void {
    if (!isActive()) return;
    const { reconnectTimeoutId, isManualDisconnect, connectionStatus } = get();

    if (reconnectTimeoutId) return;
    if (isManualDisconnect || connectionStatus === STAT.ERROR) return;

    const tempReconnectTimeoutId = setTimeout(() => {
        if (!isActive() || get().reconnectTimeoutId !== tempReconnectTimeoutId) return;
        if (get().connectionStatus !== STAT.CONNECTED) {
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

function attachWsHandlers(
    ws: WebSocket | null | undefined,
    url: string,
    set: SetState,
    get: GetState,
    isActive: () => boolean,
    isCurrentSocket: () => boolean
): (() => void) | undefined {
    if (!ws) return;
    const isCurrent = () => isActive() && isCurrentSocket();

    const onOpen = () => {
        if (!isCurrent()) return;
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
        if (!isCurrent()) return;
        const { isManualDisconnect, connectionStatus } = get();
        if (!isManualDisconnect) {
            set({ connectionStatus: STAT.RECONNECTING, error: ERR.WS_ERROR });
        }
        if (connectionStatus !== STAT.ERROR) startReconnectTimer(set, get, isActive);
    };

    const onClose = () => {
        if (!isCurrent()) return;
        const { isManualDisconnect, connectionStatus } = get();
        if (isManualDisconnect) {
            set({ connectionStatus: STAT.IDLE });
        } else {
            set({
                connectionStatus: STAT.RECONNECTING,
                error: ERR.WS_CLOSED,
            });
            if (connectionStatus !== STAT.ERROR) startReconnectTimer(set, get, isActive);
        }
    };

    // Observe close before Core's property handler clears broker.ws, including
    // sockets that were already connected when the store took ownership.
    ws.addEventListener("open", onOpen, true);
    ws.addEventListener("error", onError, true);
    ws.addEventListener("close", onClose, true);
    if (ws.readyState === WebSocket.OPEN) onOpen();

    return () => {
        ws.removeEventListener("open", onOpen, true);
        ws.removeEventListener("error", onError, true);
        ws.removeEventListener("close", onClose, true);
    };
}
