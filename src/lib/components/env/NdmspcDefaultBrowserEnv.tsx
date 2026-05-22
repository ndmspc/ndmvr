import NdmvrEnv from "./NdmvrEnv.tsx";
// import JsrootEnv from "./JsrootEnv.tsx";
import Switch from "../ui/desktop/Switch.tsx";
import ModeToolsPanel from "../ui/desktop/ModeToolsPanel.tsx";
import { HierarchyPainter, setDefaultDrawOpt } from "jsroot";

import { useCallback, useEffect, useRef, useState } from "react";
import { configSubjectGet, histogramSubjectGet } from "@ndmspc/ndmvr-core";

import { getPads } from "../../utils/helper-functions.ts";
import "./NdmspcDefaultBrowserEnv.css";
import { NdmspcConfig } from "../../interfaces/NdmspcConfig.ts";
import { NdmvrConfig } from "../../interfaces/NdmvrConfig.ts";
import UIToggleButton from "../ui/desktop/UIToggleButton.tsx";
import FullscreenButton from "../ui/desktop/FullscreenButton.tsx";

export interface NdmspcDefaultBrowserEnvProps {
    children?: React.ReactNode;
    config?: NdmvrConfig | null;
    onConfigChange?: ((config: NdmspcConfig) => void) | null;
    controlsHelp?: boolean;
    renderer?: "jsroot" | "ndmvr";
    vr?: boolean;
    menu?: boolean;
    help?: boolean;
    file?: string | null;
    item?: string | null;
    opt?: string | null;
    title?: string | null;
    layout?: string | null;
    defaultDrawOpt?: Record<string, string> | null;
    setBrowser?: React.Dispatch<React.SetStateAction<NdmspcConfig | null>>;
}

export default function NdmspcDefaultBrowserEnv({
    children = null,
    config = null,
    onConfigChange = null,
    menu = false,
    help = false,
    renderer = "jsroot",
    vr = true,
    file = "https://root.cern/js/files/hsimple.root",
    item = null,
    opt = null,
    title = "Ndmspc Default Browser Environment",
    layout = "simple",
    defaultDrawOpt = { TH1: "hist", TH2: "col" },
    setBrowser
}: NdmspcDefaultBrowserEnvProps) {
    const [vrMode, setVRMode] = useState(vr);
    const initializedRef = useRef(false);
    const [appConfig, setAppConfig] = useState(null);
    const painterRef = useRef(null);
    const pads = useRef([]);
    const padsCounter = useRef(0);
    const [itemState, setItemState] = useState(item);
    const [optState, setOptState] = useState(opt);
    const hiddenTreeDivRef = useRef<HTMLDivElement>(document.createElement("div"));

    const [hierarchy, setHierarchy] = useState<any>(null);
    const [rootNode, setRootNode] = useState<any>(null);

    const [rendererMode, setRendererMode] = useState<"jsroot" | "ndmvr">(renderer);
    const rendererModeRef = useRef<"jsroot" | "ndmvr">(renderer);
    const drawnObjectsRef = useRef<Record<string, { obj: any; opt?: any }>>({});



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
        if (!initializedRef.current) return;

        rendererModeRef.current = rendererMode;


        const entries = Object.entries(drawnObjectsRef.current);
        console.log("effect: " + rendererMode);
        for (const [padId, data] of entries) {
            histogramSubjectGet().next({
                id: padId,
                // opts: { render: "jsroot" },
                opts: { render: rendererMode },
                obj: data.obj,
            });
        }

    }, [rendererMode]);

    useEffect(() => {
        if (config) {
            configSubjectGet().next(config);
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAppConfig(configSubjectGet().getValue());
    }, [config]);

    useEffect(() => {
        if (!vrMode && painterRef.current) painterRef.current.checkResize();
    }, [vrMode]);

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;
        let disposed = false;

        console.log("Read file: ", file);
        const painter = new HierarchyPainter("example", hiddenTreeDivRef.current);
        // const painter = new HierarchyPainter("example", "myTreeDiv");

        const origDisplay = painter.display.bind(painter);

        (painter as any).display = function (obj: any, opt?: any, dom?: any) {
            const padId = `pad${padsCounter.current + 1}`;

            this.getObject(obj).then((retValue: any) => {
                if (disposed) return;
                if (!retValue?.obj) return;

                drawnObjectsRef.current[padId] = {
                    obj: retValue.obj,
                    opt,
                };

                histogramSubjectGet().next({
                    id: padId,
                    // opts: { render: "jsroot" },
                    opts: { render: rendererModeRef.current },
                    obj: retValue.obj,
                });
            });

            if (pads.current.length > 0) {
                padsCounter.current = (padsCounter.current + 1) % pads.current.length;
            }

            return origDisplay(obj, opt, dom);
        };

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
            // console.log("Try to open");

            drawnObjectsRef.current = {};
            padsCounter.current = 0;

            await painter.openRootFile(file).then((v) => {
                if (disposed) return;
                const ps = getPads(v.disp_kind);
                pads.current = ps;
                // console.log("File h: ", painter.h );
                console.log("HierarchyPainter opened file, disp_kind:", v.disp_kind, ps);
                configSubjectGet().appendPads(ps, v.disp_kind, defaultPad);
                setHierarchy(painter);
                setRootNode((painter as any).h);
            });

            if (disposed) return;



            // if (item) {
            await painter.display(item, opt);
            if (disposed) return;
            setItemState(item);
            setOptState(opt);
            // }
            // await h.expandItem('E;1//Event/Gen/Header');
            // console.log("HierarchyPainter h:", painter);
        };
        initPainter();
        console.log(title);

        return () => {
            disposed = true;
            initializedRef.current = false;
            drawnObjectsRef.current = {};
            painterRef.current = null;
        };
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

    const handleSelect = async (path: string) => {
        // console.log("call handelerSelect");
        // console.log("handlerSelect path: ", path);
        if (!painterRef.current) return;
        await painterRef.current.display(path, optState ?? "");
        setItemState(path);
    };


    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
            }}
        >


            <div
                style={{
                    display: !vrMode ? "flex" : "none",
                    width: "100%",
                    height: "100%",
                }}
            >
                <div
                    id="myTreeDiv"
                    ref={hiddenTreeDivRef}
                    style={{
                        width: "250px",
                        height: "100%",
                        float: "left",
                        // display: "flex",
                        // display: !vrMode ? "flex" : "none",
                    }}
                ></div>

                <div
                    id="myMainDiv"
                    className="main-div"
                    // style={{}}
                ></div>
            </div>

            {/*<div*/}
            {/*    style={{*/}
            {/*        display: vrMode ? "flex" : "none",*/}
            {/*    }}*/}
            {/*>*/}

            <div
                className="main-div"
                // style={{
                //     // display: vrMode ? "flex" : "none",
                //     width: 100%
                // }}
                style={{ width: "100%", height: "100%" }}
            >
                <NdmvrEnv
                    currentConfig={appConfig}
                    onConfigChange={applyConfig}
                    hierarchy={hierarchy}
                    rootNode={rootNode}
                    hierarchyDocRef={hiddenTreeDivRef}
                    onSelectItem={handleSelect}
                    browser={true}
                >
                    {children}
                </NdmvrEnv>
            </div>

            <Switch startState={vrMode} onToggle={(checked) => setVRMode(checked)} />
            {vrMode && <ModeToolsPanel />}
        </div>
    );
}
