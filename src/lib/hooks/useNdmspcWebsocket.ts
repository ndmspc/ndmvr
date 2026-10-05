import { useLayoutEffect } from "react";
import { parse as jsrootParse } from "jsroot";
import { brokerManagerGet, histogramSubjectGet } from "@ndmspc/ndmvr-core";

const useNdmspcWebsocket = (url = "ws://localhost:8080/ws/root.websocket", timeout = 60): null => {
    useLayoutEffect(() => {
        brokerManagerGet().createWs(url, false, timeout);
        const sub = brokerManagerGet()
            .getSubject()
            .subscribe((v: unknown) => {
                // skip it string does not contain a valid JSROOT object
                if (typeof v !== "string" || !v.startsWith("{")) return;
                const obj = jsrootParse(v);
                if (obj.arr && obj.arr.length > 0) {
                    for (let i = 0; i < obj.arr.length; i++) {
                        if (
                            obj.arr[i]._typename.startsWith("TH1") ||
                            obj.arr[i]._typename.startsWith("TH2")
                        ) {
                            histogramSubjectGet().next({
                                id: `pad${i + 1}`,
                                opts: { render: "nested" },
                                obj: obj.arr[i],
                            });
                        } else {
                            histogramSubjectGet().next({
                                id: `pad${i + 1}`,
                                opts: { render: "nested" },
                                obj: obj.arr[i],
                            });
                        }
                    }
                } else if (obj._typename) {
                    histogramSubjectGet().next({
                        id: `pad1`,
                        opts: { render: "" },
                        obj: obj,
                    });
                }
            });
        return () => {
            sub.unsubscribe();
        };
    }, [url, timeout]);

    return null;
};
export default useNdmspcWebsocket;
