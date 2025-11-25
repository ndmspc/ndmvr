import { useEffect } from "react";

import NdmspcEnv from "./lib/components/env/NdmspcEnv.jsx";
import NdmspcDefaultBrowserEnv from "./lib/components/env/NdmspcDefaultBrowserEnv.jsx";
import { brokerManagerGet, histogramSubjectGet } from "@ndmspc/ndmvr-aframe";
import { parse as jsrootParse } from "jsroot"

function App() {


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
    //     entity: "ndmvr-histogram",
    //     id: "*"
    //   }
    // });

    // REMOVE ALL FUNCTIONS ON EVENT
    // functionSubjectGet().removeFunctions({
    //   event: "mousemove",
    //   target: {
    //     entity: "ndmvr-histogram",
    //     id: "*"
    //   }
    // });

    // ADD DEFAULT FUNCTION
    // functionSubjectGet().addFunctions({
    //   event: "mousemove",
    //   target: {
    //     entity: "ndmvr-histogram",
    //     id: "*"
    //   },
    // });


    //ADD CUSTOM FUNCTION
    //     functionSubjectGet().addFunctions({
    //       event: "mouseclick",
    //       target: {
    //         entity: "ndmvr-histogram",
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
                                opts: { render: "ndmvr" },
                                obj: obj.arr[i],
                            });
                        } else {
                            var r = "jsroot";
                            r = "ndmvr";

                            histogramSubjectGet().next({
                                id: `histogram${i + 1}`,
                                opts: { render: r },
                                obj: obj.arr[i],
                            });
                        }
                    }

                } else if (obj._typename) {

                    histogramSubjectGet().next({
                        id: `histogram1`,
                        opts: { render: "ndmvr" },
                        obj: obj,
                    });
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
                }}>
                {/* <NdmspcDefaultBrowserEnv renderer="jsroot" /> */}
                <NdmspcEnv />
            </div>
        </div >
    );
}

export default App;
