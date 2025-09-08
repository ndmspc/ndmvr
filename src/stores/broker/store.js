import { create } from "zustand";
import { brokerManagerGet, histogramSubjectGet } from "@ndmspc/ndmvr-aframe";
// import { brokerManagerGet, histogramSubjectGet } from "../../../../ndmvr-aframe/index.js";
import { jsrootRedraw } from "../../utils/helpers";
import { parse as jsrootParse } from "jsroot";
import { STAT, ERR, HISTOGRAM_ID } from "./constants";
import { interceptWsProperty } from "./helpers";

export const useBrokerStore = create((set, get) => ({
  wsUrl: null,
  connectionStatus: STAT.IDLE,
  error: null,
  isManualDisconnect: false,
  sub: null,
  reconnectTimeoutId: null,

  connect: async (url) => {
    if(get().connectionStatus !== STAT.IDLE) get().disconnect();
    
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

    const sub = manager.getSubject().subscribe((msg) => {
      const obj = jsrootParse(msg);
      jsrootRedraw(obj.arr?.[0]);
      histogramSubjectGet().next({ id: HISTOGRAM_ID, histogram: obj.arr?.[0] });
    });
    set({ sub });

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
