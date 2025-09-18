import { useEffect, useRef } from "react";

import NdmspcEnv from "./lib/components/env/NdmspcEnv.jsx";
import { histogramSubjectGet, configSubjectGet, brokerManagerGet } from "@ndmspc/ndmvr-aframe";
// import h3scat from "./data/h3scat.json";
import config from "./lib/config.json";
import { parse as jsrootParse } from "jsroot"

import { injectGlobalCss } from "./lib/injectGlobalCss.js";

function App() {
    injectGlobalCss();
    const effectRan = useRef(false);

    useEffect(() => {
        if (effectRan.current) return;
        effectRan.current = true;
        // console.log("SENDING");
        // // histogramSubjectGet().next({id: 'histogram1', opts: {render: "jsroot"}, histogram: h3scat});
        // histogramSubjectGet().next({id: 'histogram2', opts: {render: "nested"}, histogram: h3scat});
        // // histogramSubjectGet().next({id: 'histogram3', opts: {render: "jsroot"}, histogram: h3scat});
        // histogramSubjectGet().next({id: 'histogram4', opts: {render: "nested"}, histogram: h3scat});
        // setTimeout(() => {
        //     histogramSubjectGet().next({id: 'histogram1', opts: {render: "jsroot"}, histogram: h3scat});
        // }, 4000)

    }, []);

    useEffect(() => {
        if (effectRan.current) return;
        effectRan.current = true;

        if (config) configSubjectGet().next(config);

        brokerManagerGet().createWs(
            "ws://ndmspc.cern.ch/ws/root.websocket",
            false,
            60,
        );
        const sub = brokerManagerGet()
            .getSubject()
            .subscribe((v) => {
                if (typeof v !== "string" || !v.startsWith("{")) return;
                const obj = jsrootParse(v);
                console.log("Received object:", obj);
                if (obj.arr && obj.arr.length > 0) {
                    // setHistos(obj.arr);
                    for (let i = 0; i < obj.arr.length; i++) {
                        if (
                            obj.arr[i]._typename.startsWith("TH1") ||
                            obj.arr[i]._typename.startsWith("TH2")
                        ) {
                            histogramSubjectGet().next({
                                id: `histogram${i + 1}`,
                                opts: { render: "nested" },
                                histogram: obj.arr[i],
                            });
                        } else {
                            var r = "jsroot";
                            r = "nested";

                            histogramSubjectGet().next({
                                id: `histogram${i + 1}`,
                                opts: { render: r },
                                histogram: obj.arr[i],
                            });
                        }
                    }
                }
            });
        return () => {
            sub.unsubscribe();
        };
    }, []);


    return (
        <div
            style={{
                height: "100vh",
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <div
                style={{
                    height: "100%",
                    width: "100%",
                }}
            >
                <NdmspcEnv config={config}/>
            </div>
        </div>
    );
}

export default App;
