import NdmvrEnv from "./NdmvrEnv.tsx";
// import JsrootEnv from "./JsrootEnv.tsx";
import Switch from "../ui/desktop/Switch.tsx";
import { HierarchyPainter, setDefaultDrawOpt } from "jsroot";

import { useCallback, useEffect, useRef, useState } from "react";
import { configSubjectGet, histogramSubjectGet } from "@ndmspc/ndmvr-aframe";

import defaultConfig from "../../config.json";
import { getPads } from "../../utils/helper-functions.ts";
import "./NdmspcDefaultBrowserEnv.css";

interface NdmspcDefaultBrowserEnvProps {
    children?: React.ReactNode;
    config?: Record<string, unknown> | null;
    onConfigChange?: ((config: Record<string, unknown>) => void) | null;
    controlsHelp?: boolean;
    renderer?: "jsroot" | "ndmvr";
    vr?: boolean;
    file?: string | null;
    item?: string | null;
    opt?: string | null;
    title?: string | null;
    layout?: string | null;
    defaultDrawOpt?: Record<string, string> | null;
}


export default function NdmspcDefaultBrowserEnv({
    children = null,
    config = null,
    onConfigChange = null,
    controlsHelp = false,
    renderer = "jsroot",
    vr = false,
    file = "https://root.cern.ch/js/files/hsimple.root",
    item = null,
    opt = null,
    title = "Ndmspc Default Browser Environment",
    layout = "simple",
    defaultDrawOpt = { "TH1": "hist", "TH2": "col" },

}: NdmspcDefaultBrowserEnvProps) {
    const [vrMode, setVRMode] = useState(vr);
    const initializedRef = useRef(false);
    const [appConfig, setAppConfig] = useState(defaultConfig);
    const painterRef = useRef(null);
    const [pads, setPads] = useState([]);
    const padsCounter = useRef(1);
    const [itemState, setItemState] = useState(item);
    const [optState, setOptState] = useState(opt);

    console.log(
        "NdmspcDefaultBrowserEnv render, config:",
        appConfig,
        "onConfigChange:",
        typeof onConfigChange
    );

    const applyConfig = useCallback(
        (newConfig) => {
            console.log("Config changed from SettingsPanel:", newConfig);
            setAppConfig(newConfig);
            configSubjectGet().next(newConfig);
            onConfigChange?.(newConfig);
        },
        [onConfigChange]
    );

    useEffect(() => {
        configSubjectGet().next(defaultConfig);
        if (config) {
            configSubjectGet().next(config);
        }
        setAppConfig(configSubjectGet().getValue());
    }, [config]);

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        const originalDisplay = HierarchyPainter.prototype.display;
        HierarchyPainter.prototype.display = function (dom, obj, opts) {
            this.getObject(dom).then((ret) => {
                console.log(pads);
                console.log("sending at pad: ", `pad${padsCounter.current}`);
                histogramSubjectGet().next({
                    id: `pad${padsCounter.current}`,
                    opts: { render: renderer },
                    obj: ret.obj,
                });
                if (pads.length > 0)
                    padsCounter.current = (padsCounter.current + 1) % pads.length;
            });
            return originalDisplay.apply(this, [dom, obj, opts]);
        };

        const painter = new HierarchyPainter("example", "myTreeDiv");
        painterRef.current = painter;
        const initPainter = async () => {
            for (const key in defaultDrawOpt) {
                setDefaultDrawOpt(key, defaultDrawOpt[key]);
            }
            painter.setDisplay(layout, "myMainDiv");

            painter.no_select = true;
            // let enable scrollbars for hierarchy content, otherwise only HTML resize can be use to see elements
            painter.show_overflow = true;
            // configure 'simple' layout for drawings     _____DONE______
            // one also can specify "grid2x2" or "flex"   _____FIX COUNTER FOR GRID, FLEX WILL NEED TO BE DYNAMIC?_____
            // h.prepareGuiDiv('simpleGUI', 'flex');
            // open file and display element
            // await h.createBrowser('fix');
            const defaultPad =
            {
                scale: { x: 10, y: 5, z: 10 },
                padding: { x: 0, y: 0, z: 0 },
                origin: { x: -5, y: 0.5, z: 1 },
            };
            await painter
                .openRootFile(file)
                .then((v) => {
                    const ps = getPads(v.disp_kind);
                    // const childs = v.h._childs.map(child => child._name)
                    console.log("HierarchyPainter opened file, disp_kind:", v.disp_kind, ps);
                    if (ps) {
                        configSubjectGet().appendPads(ps, v.disp_kind, defaultPad
                        );
                        setPads(ps);
                    }
                });
            // if (item) {
            await painter.display(item, opt);
            setItemState(item);
            setOptState(opt);
            // }
            // await h.expandItem('E;1//Event/Gen/Header');
            console.log("HierarchyPainter h:", painter);
        };
        initPainter();
        console.log(title);
    }, []);

    useEffect(() => {
        if (!initializedRef.current) return;
        if (itemState === null) return;

        const painter = painterRef.current;
        const painterDisplay = async () => {
            await painter.display(itemState, optState);
        }
        painterDisplay();
    }, [itemState, optState]);
    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
            }}
        >
            <div
                id="myTreeDiv"
                style={{
                    width: "250px",
                    height: "100%",
                    float: "left",
                }}
            ></div>

            <div
                id="myMainDiv"
                className="main-div"
                style={{
                    display: !vrMode ? "flex" : "none",
                }}
            ></div>

            <div
                className="main-div"
                style={{
                    display: vrMode ? "flex" : "none",
                }}
            >
                <NdmvrEnv
                    controlsHelp={controlsHelp}
                    currentConfig={appConfig}
                    onConfigChange={applyConfig}
                    menu={false}
                >
                    {children}
                </NdmvrEnv>
            </div>

            <Switch
                startState={vrMode}
                onToggle={(checked) => setVRMode(checked)}
            />
        </div>
    );
}
