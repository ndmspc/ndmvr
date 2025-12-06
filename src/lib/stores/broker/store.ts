import { create } from "zustand";
import { brokerManagerGet } from "@ndmspc/ndmvr-aframe";
import { ERR, STAT, ConnectionStatus, ErrorMessage } from "./constants.ts";
import { interceptWsProperty } from "./helpers.ts";
import { Subscription } from "rxjs";

interface BrokerStore {
    wsUrl: string | null;
    connectionStatus: ConnectionStatus;
    error: ErrorMessage | null;
    isManualDisconnect: boolean;
    sub: Subscription | null;
    reconnectTimeoutId: ReturnType<typeof setTimeout> | null;

    clearError: () => void;
    connect: (url: string) => Promise<void>;
    disconnect: () => void;
}

export const useBrokerStore = create<BrokerStore>((set, get) => ({
    wsUrl: null,
    connectionStatus: STAT.IDLE,
    error: null,
    isManualDisconnect: false,
    sub: null,
    reconnectTimeoutId: null,

    clearError: () => {
        set({
            connectionStatus: STAT.IDLE,
            error: null,
        });
    },

    connect: async (url: string) => {
        if (get().connectionStatus !== STAT.IDLE) get().disconnect();

        const prevId = get().reconnectTimeoutId;
        if (prevId) clearTimeout(prevId);

        const manager = brokerManagerGet();

        const prevSub = get().sub;
        if (prevSub) prevSub.unsubscribe();

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

        // const sub = manager.getSubject().subscribe((msg) => {
        //     const obj = jsrootParse(msg);
        //
        //     histogramSubjectGet().next({ id: gi, histogram: obj.arr?.[1] || obj });
        // });
        // set({ sub });

        interceptWsProperty(broker, url, set, get);

        broker.connect();
    },

    disconnect: () => {
        const { wsUrl, sub } = get();
        if (!wsUrl) return;

        const prevId = get().reconnectTimeoutId;
        if (prevId) clearTimeout(prevId);

        const manager = brokerManagerGet();
        const broker = manager.getBrokerByUrl(wsUrl, false);

        set({ isManualDisconnect: true, connectionStatus: STAT.IDLE, error: null });

        if (sub) sub.unsubscribe();

        if (broker?.ws) {
            broker.ws.onclose = null;
            broker.ws.onerror = null;
        }

        manager.disconnectWsByUrl(wsUrl);

        set({
            wsUrl: null,
            error: null,
            sub: null,
            reconnectTimeoutId: null,
        });

        console.log("[Broker] Disconnected:", wsUrl);
    },
}));
