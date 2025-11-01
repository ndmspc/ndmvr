import {useEffect, useState} from "react";

import NdmspcEnv from "./lib/components/env/NdmspcEnv.jsx";
import {histogramSubjectGet, brokerManagerGet} from "@ndmspc/ndmvr-aframe";
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
    // const effectRan = useRef(false);
    //
    // useEffect(() => {
    //     if (effectRan.current === true) return;
    //     effectRan.current = true;
    //
    //   setTimeout(() => {
        //REMOVE ALL FUNCTIONS
        // functionSubjectGet().removeFunctions({
        //   target: {
        //     entity: "nested-histogram",
        //     id: "*"
        //   }
        // });

        // REMOVE ALL FUNCTIONS ON EVENT
        // functionSubjectGet().removeFunctions({
        //   event: "mousemove",
        //   target: {
        //     entity: "nested-histogram",
        //     id: "*"
        //   }
        // });

        // ADD DEFAULT FUNCTION
        // functionSubjectGet().addFunctions({
        //   event: "mousemove",
        //   target: {
        //     entity: "nested-histogram",
        //     id: "*"
        //   },
        // });


        //ADD CUSTOM FUNCTION
    //     functionSubjectGet().addFunctions({
    //       event: "mouseclick",
    //       target: {
    //         entity: "nested-histogram",
    //         id: "*"
    //       },
    //       function: function (event, context) {
    //         console.log("my-custom-function: ", event);
    //       }
    //     });
    //   }, 5000);
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
