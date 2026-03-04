import { useEffect, useState } from "react";

// import NdmspcEnv from "./lib/components/env/NdmspcEnv.tsx";
// import NdmspcDefaultBrowserEnv from "./lib/components/env/NdmspcDefaultBrowserEnv.tsx";
import { brokerManagerGet, histogramSubjectGet } from "@ndmspc/ndmvr-core";
import { parse as jsrootParse } from "jsroot";
import { NdmspcConfig, IframeCernboxService, NdmspcNavigator } from "./lib/index.tsx";
import FileBrowser from "./lib/components/ui/shared/FileBrowser.tsx";
function App() {
    const [configState, setConfigState] = useState<NdmspcConfig>({ type: "" });
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
    function onConfigLoad(config: NdmspcConfig) {
        console.log("Config loaded:", config);

        if (configState.type === "") {
            setConfigState(config as NdmspcConfig);
        } else {
            // check if config is different from current configState
            // TODO: improve deep comparison
            if (JSON.stringify(config) === JSON.stringify(configState)) {
                setConfigState(config as NdmspcConfig);
            }
        }
    }

    useEffect(() => {
        brokerManagerGet().createWs("ws://localhost:8080/ws/root.websocket", false, 60);
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
                            histogramSubjectGet().next({
                                id: `histogram${i + 1}`,
                                opts: { render: "ndmvr" },
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
                }}
            >
                <NdmspcNavigator
                    menu={true}
                    help={false}
                    // ndmspcConfig={{type:"browser"}}
                >
                    <IframeCernboxService onConfigLoad={onConfigLoad} />
                </NdmspcNavigator>
                {/* <NdmspcDefaultBrowserEnv renderer="jsroot" layout="grid2x2" /> */}
                {/* <NdmspcEnv /> */}
            </div>
        </div>
    );
}

export default App;
