import { create } from "zustand";
import { brokerManagerGet } from "@ndmspc/ndmvr-core";
import { ERR, STAT, ConnectionStatus, ErrorMessage } from "./constants.ts";
import { interceptWsProperty } from "./helpers.ts";

interface BrokerStore {
    wsUrl: string | null;
    connectionStatus: ConnectionStatus;
    error: ErrorMessage | null;
    isManualDisconnect: boolean;
    reconnectTimeoutId: ReturnType<typeof setTimeout> | null;

    clearError: () => void;
    connect: (url: string) => Promise<void>;
    disconnect: () => void;
}

export const useBrokerStore = create<BrokerStore>((set, get) => {
    let detachWsHandlers: (() => void) | null = null;
    return {
        wsUrl: null,
        connectionStatus: STAT.IDLE,
        error: null,
        isManualDisconnect: false,
        reconnectTimeoutId: null,

        clearError: () => {
            set({
                connectionStatus: STAT.IDLE,
                error: null,
            });
        },

        connect: async (url: string) => {
            if (get().wsUrl) get().disconnect();

            const prevId = get().reconnectTimeoutId;
            if (prevId) clearTimeout(prevId);

            const manager = brokerManagerGet();

            set({
                wsUrl: url,
                connectionStatus: STAT.CONNECTING,
                error: null,
                isManualDisconnect: false,
                reconnectTimeoutId: null,
            });

            const broker = manager.getBrokerByUrl(url, false);
            if (!broker) {
                set({ connectionStatus: STAT.ERROR, error: ERR.NOT_FOUND });
                return;
            }

            detachWsHandlers = interceptWsProperty(broker, url, set, get);

            broker.connect();
        },

        disconnect: () => {
            const { wsUrl } = get();
            if (!wsUrl) return;

            const prevId = get().reconnectTimeoutId;
            if (prevId) clearTimeout(prevId);

            const manager = brokerManagerGet();
            const broker = manager.getBrokerByUrl(wsUrl, false);

            set({ isManualDisconnect: true, connectionStatus: STAT.IDLE, error: null });
            detachWsHandlers?.();
            detachWsHandlers = null;

            if (broker?.ws) {
                broker.ws.onclose = null;
                broker.ws.onerror = null;
            }

            manager.disconnectWsByUrl(wsUrl);

            set({
                wsUrl: null,
                error: null,
                reconnectTimeoutId: null,
            });

            console.log("[Broker] Disconnected:", wsUrl);
        },
    };
});
