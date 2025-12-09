import NdmvrEnv from "./NdmvrEnv.tsx";
// import JsrootEnv from "./JsrootEnv.tsx";
import Switch from "../ui/desktop/Switch.tsx";
import { HierarchyPainter, setDefaultDrawOpt, draw } from "jsroot";

import { useCallback, useEffect, useRef, useState } from "react";
import { configSubjectGet, histogramSubjectGet } from "@ndmspc/ndmvr-aframe";

import defaultConfig from "../../config.json";
import { getPads } from "../../utils/helper-functions.ts";
import "./NdmspcDefaultBrowserEnv.css";
import { NdmspcConfig } from "../../interfaces/NdmspcConfig.ts";
import { NdmvrConfig } from "../../interfaces/NdmvrConfig.ts";

export interface NdmspcDefaultBrowserEnvProps {
    children?: React.ReactNode;
    config?: NdmvrConfig | null;
    onConfigChange?: ((config: NdmspcConfig) => void) | null;
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
    defaultDrawOpt = { TH1: "hist", TH2: "col" },
}: NdmspcDefaultBrowserEnvProps) {
    const [vrMode, setVRMode] = useState(vr);
    const initializedRef = useRef(false);
    const [appConfig, setAppConfig] = useState(defaultConfig);
    const painterRef = useRef(null);
    const pads = useRef([]);
    const padsCounter = useRef(0);
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
        if (!vrMode && painterRef.current) painterRef.current.checkResize();
    }, [vrMode]);

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        const painter = new HierarchyPainter("example", "myTreeDiv");

        painter.setDrawFunc((dom, obj, opt) => {
            histogramSubjectGet().next({
                id: `pad${padsCounter.current + 1}`,
                opts: { render: renderer },
                obj: obj,
            });
            if (pads.current.length > 0)
                padsCounter.current = (padsCounter.current + 1) % pads.current.length;
            return draw(dom, obj, opt);
        });

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
            const defaultPad = {
                scale: { x: 10, y: 5, z: 10 },
                padding: { x: 0, y: 0, z: 0 },
                origin: { x: -5, y: 0.5, z: 1 },
            };
            await painter.openRootFile(file).then((v) => {
                const ps = getPads(v.disp_kind);
                pads.current = ps;
                console.log("HierarchyPainter opened file, disp_kind:", v.disp_kind, ps);
                configSubjectGet().appendPads(ps, v.disp_kind, defaultPad);
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
        };
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
                    // @ts-expect-error FIXME: Config
                    currentConfig={appConfig}
                    onConfigChange={applyConfig}
                    menu={false}
                >
                    {children}
                </NdmvrEnv>
            </div>

            <Switch startState={vrMode} onToggle={(checked) => setVRMode(checked)} />
        </div>
    );
}
