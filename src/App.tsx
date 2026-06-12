import { useEffect, useState } from "react";

// import NdmspcEnv from "./lib/components/env/NdmspcEnv.tsx";
// import NdmspcDefaultBrowserEnv from "./lib/components/env/NdmspcDefaultBrowserEnv.tsx";
import { brokerManagerGet, histogramSubjectGet, configSubjectGet, stateSubjectGet } from "@ndmspc/ndmvr-core";
import { parse as jsrootParse } from "jsroot";
import { NdmspcConfig, IframeCernboxService, NdmspcNavigator, useSceneModeStore, defaultSceneModesConfig } from "./lib/index.tsx";
import FileBrowser from "./lib/components/ui/shared/FileBrowser.tsx";
import type { SceneModesConfig } from "./lib/index.tsx";

// Defaults in defaultSceneModesConfig (user can override them by passing custom config by using setModesConfig from useSceneModeStore)
// const modesConfig: SceneModesConfig = {
//     default: {
//         title: "Default mode",
//         ariaLabel: "Enable default mode",
//         icon: "",
//         histogramEvents: {
//             mouseclick: "default",
//             mousedbclick: "default",
//             shiftmouseclick: "default",
//             shiftmousedbclick: "default",
//             mousemove: "default",
//         },
//         baseEvents: {
//             onClick: "default",
//             onEnter: null,
//             onExit: null,
//         }
//     },

//     modify: {
//         title: "Modify mode",
//         ariaLabel: "Enable modify mode",
//         icon: "Hammer",
//         histogramEvents: {
//             mouseclick: null,
//             mousedbclick: null,
//             shiftmouseclick: null,
//             shiftmousedbclick: null,
//             mousemove: null,
//         },
//         baseEvents: {
//             onEnter: () => console.log("Entered modify mode"),
//             onClick: () => console.log("Clicked in modify mode"),
//             onHover: () => console.log("Hovered over modify mode"),
//             onExit: "default",
//         }
//     },

//     scaleBy: {
//         title: "Scale By mode",
//         ariaLabel: "Enable scale by mode",
//         icon: "Scale3D",
//         histogramEvents: {
//             mouseclick: null,
//             mousedbclick: null,
//             shiftmouseclick: null,
//             shiftmousedbclick: null,
//             mousemove: null,
//         },
//         baseEvents: {
//             onEnter: null,
//             onClick: () => {
//                 // console.log("Clicked in outline mode");
//                 const cfg = configSubjectGet().getValue();
//                 // console.log("Current state: ", cfg);
//                 if (!cfg?.config?.histogram?.scale?.scaleBy) return;
//                 if (cfg.config.histogram.scale.scaleBy === "value") {
//                     cfg.config.histogram.scale.scaleBy = "error";
//                 } else {
//                     cfg.config.histogram.scale.scaleBy = "value";
//                 }
//                 console.log("Updated config: cfg=", cfg);
//                 configSubjectGet().next(cfg);
//             },
//             onHover: null,
//             onExit: null,
//         }
//     },

//     colorBy: {
//         title: "Color By mode",
//         ariaLabel: "Enable color by mode",
//         icon: "Palette",
//         histogramEvents: {
//             mouseclick: null,
//             mousedbclick: null,
//             shiftmouseclick: null,
//             shiftmousedbclick: null,
//             mousemove: null,
//         },

//         baseEvents: {
//             onEnter: null,
//             onClick: () => {
//                 // console.log("Clicked in outline mode");
//                 const cfg = configSubjectGet().getValue();
//                 // console.log("Current state: ", cfg);
//                 if (!cfg?.config?.histogram?.color?.colorBy) return;
//                 if (cfg.config.histogram.color.colorBy === "error") {
//                     cfg.config.histogram.color.colorBy = "value";
//                 } else {
//                     cfg.config.histogram.color.colorBy = "error";
//                 }
//                 console.log("Updated config: cfg=", cfg);
//                 configSubjectGet().next(cfg);
//             },
//             onHover: null,
//             onExit: null,
//         }
//     },

//     layers: {
//         title: "Layers mode",
//         ariaLabel: "Enable layers mode",
//         icon: "Layers",
//         histogramEvents: {
//             mouseclick: null,
//             mousedbclick: null,
//             shiftmouseclick: null,
//             shiftmousedbclick: null,
//             mousemove: null,
//         },
//         baseEvents: {
//             onEnter: null,
//             onClick: () => {
//                 console.log("Clicked in layers mode");
//                 const state = stateSubjectGet("pad1").getValue();
//                 console.log("Current state: ", state);

//                 if (state?.currentLayer) {
//                     state.currentLayer = state.currentLayer + 1;
//                     if (state.currentLayer > state.availableAxes.length - state.sets.length) {
//                         state.currentLayer = 1;
//                     }
//                 } else {
//                     state.currentLayer = 2;
//                 }
//                 window.dispatchEvent(
//                     new KeyboardEvent("keydown", {
//                         key: state.currentLayer.toString(),
//                         code: "Numpad" + state.currentLayer.toString(),
//                         bubbles: true,
//                         cancelable: true
//                     }));

//                 stateSubjectGet("pad1").next(state);
//             },
//             onHover: null,
//             onExit: null,
//         }
//     },

//     outline: {
//         title: "Outline mode",
//         ariaLabel: "Enable outline mode",
//         icon: "SquareDashed",
//         histogramEvents: {
//             mouseclick: null,
//             mousedbclick: null,
//             shiftmouseclick: null,
//             shiftmousedbclick: null,
//             mousemove: null,
//         },
//         baseEvents: {
//             onEnter: null,
//             onClick: () => {
//                 // console.log("Clicked in outline mode");
//                 const cfg = configSubjectGet().getValue();
//                 const state = stateSubjectGet("pad1").getValue();
//                 console.log("Current config: ", cfg);
//                 if (!cfg?.config?.histogram?.wireframe) return;
//                 cfg.config.histogram.wireframe.display.start = cfg.config.histogram.wireframe.display.start + 1;
//                 if (cfg.config.histogram.wireframe.display.start >= cfg.config.histogram.wireframe.display.end ||
//                     cfg.config.histogram.wireframe.display.start >= state.availableAxes.length + 1) {
//                     cfg.config.histogram.wireframe.display.start = 0;
//                 }
//                 console.log("Updated config: start=", cfg.config.histogram.wireframe.display.start, "end=", cfg.config.histogram.wireframe.display.end);
//                 configSubjectGet().next(cfg);
//             },
//             onHover: null,
//             onExit: null,
//         }
//     },



//     // inspect: {
//     //     title: "Inspect mode",
//     //     ariaLabel: "Enable inspect mode",
//     //     icon: "Eye",
//     //     histogramEvents: {
//     //         mouseclick: (d) => console.log("Inspect mode: mouseclick : ", d),
//     //         mousemove: "default",
//     //     },
//     // },
// };

function App() {
    const [configState, setConfigState] = useState<NdmspcConfig>({ type: "" });

    const setModesConfig = useSceneModeStore((state) => state.setModesConfig);

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
        defaultSceneModesConfig && setModesConfig(defaultSceneModesConfig);
    }, [defaultSceneModesConfig]);

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
