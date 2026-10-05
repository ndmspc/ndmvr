import { useEffect, useState } from "react";

import { brokerManagerGet, histogramSubjectGet } from "@ndmspc/ndmvr-core";
import { parse as jsrootParse } from "jsroot";
import {
    type NdmspcConfig,
    IframeCernboxService,
    NdmspcNavigator,
    useSceneModeStore,
    defaultSceneModesConfig,
} from "./lib/index.ts";

function App() {
    const [configState, setConfigState] = useState<NdmspcConfig>({ type: "" });

    const setModesConfig = useSceneModeStore((state) => state.setModesConfig);

    function onConfigLoad(config: NdmspcConfig) {
        if (configState.type === "") {
            setConfigState(config);
        } else {
            // check if config is different from current configState
            // TODO: improve deep comparison
            if (JSON.stringify(config) === JSON.stringify(configState)) {
                setConfigState(config);
            }
        }
    }

    useEffect(() => {
        if (defaultSceneModesConfig) setModesConfig(defaultSceneModesConfig);
    }, [defaultSceneModesConfig]);

    useEffect(() => {
        brokerManagerGet().createWs("ws://localhost:8080/ws/root.websocket", false, 60);
        const sub = brokerManagerGet()
            .getSubject()
            .subscribe((v) => {
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
                                opts: { render: "ndmvr" },
                                obj: obj.arr[i],
                            });
                        } else {
                            histogramSubjectGet().next({
                                id: `pad${i + 1}`,
                                opts: { render: "ndmvr" },
                                obj: obj.arr[i],
                            });
                        }
                    }
                } else if (obj._typename) {
                    histogramSubjectGet().next({
                        id: `pad1`,
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
                <NdmspcNavigator>
                    <IframeCernboxService onConfigLoad={onConfigLoad} />
                </NdmspcNavigator>
            </div>
        </div>
    );
}

export default App;
