import { create } from "zustand";
import { brokerManagerGet, histogramSubjectGet } from "@ndmspc/ndmvr-aframe";
import { parse as jsrootParse } from "jsroot";
import { STAT, ERR, HISTOGRAM_ID } from "./constants.js";
import { interceptWsProperty } from "./helpers.js";

export const useBrokerStore = create((set, get) => ({
    wsUrl: null,
    connectionStatus: STAT.IDLE,
    error: null,
    isManualDisconnect: false,
    sub: null,
    reconnectTimeoutId: null,

    connect: async (url) => {
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
