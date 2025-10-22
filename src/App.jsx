import {useEffect, useState} from "react";

import NdmspcEnv from "./lib/components/env/NdmspcEnv.jsx";
import { histogramSubjectGet, brokerManagerGet } from "@ndmspc/ndmvr-aframe";
// import h3scat from "./data/h3scat.json";
import config from "./config.json";
import { parse as jsrootParse } from "jsroot"

import { injectGlobalCss } from "./lib/injectGlobalCss.js";

function App() {
    injectGlobalCss();
    const [appConfig, setAppConfig] = useState(config);

    const handleConfigChange = (newConfig) => {
        console.log("App received new config:", newConfig);
        setAppConfig(newConfig);
    };

    // const effectRan = useRef(false);
    //
    // useEffect(() => {
    //     if (effectRan.current) return;
    //     effectRan.current = true;
    //     // console.log("SENDING");
    //     // // histogramSubjectGet().next({id: 'histogram1', opts: {render: "jsroot"}, histogram: h3scat});
    //     // histogramSubjectGet().next({id: 'histogram2', opts: {render: "nested"}, histogram: h3scat});
    //     // // histogramSubjectGet().next({id: 'histogram3', opts: {render: "jsroot"}, histogram: h3scat});
    //     // histogramSubjectGet().next({id: 'histogram4', opts: {render: "nested"}, histogram: h3scat});
    //     // setTimeout(() => {
    //     //     histogramSubjectGet().next({id: 'histogram1', opts: {render: "jsroot"}, histogram: h3scat});
    //     // }, 4000)
    //
    // }, []);

    useEffect(() => {

        brokerManagerGet().createWs(
            "ws://localhost:8080/ws/root.websocket",
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
                <NdmspcEnv config={appConfig} onConfigChange={handleConfigChange}/>
            </div>
        </div>
    );
}

export default App;
