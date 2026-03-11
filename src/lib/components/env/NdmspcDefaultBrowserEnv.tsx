import NdmvrEnv from "./NdmvrEnv.tsx";
// import JsrootEnv from "./JsrootEnv.tsx";
import Switch from "../ui/desktop/Switch.tsx";
import { HierarchyPainter, setDefaultDrawOpt, draw } from "jsroot";

import { useCallback, useEffect, useRef, useState } from "react";
import { configSubjectGet, histogramSubjectGet } from "@ndmspc/ndmvr-core";

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
    menu?: boolean;
    help?: boolean;
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
    menu = false,
    help = false,
    renderer = "jsroot",
    vr = false,
    // file = "/nested_objects.root",
    // file = "/nested2.root",
    file = "/hsimple.root",
    // file = "/nested.root",
    item = null,
    opt = null,
    title = "Ndmspc Default Browser Environment",
    layout = "simple",
    defaultDrawOpt = { TH1: "hist", TH2: "col" },
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

        console.log("Read file: ", file);
        const painter = new HierarchyPainter("example", hiddenTreeDivRef.current);
        // const painter = new HierarchyPainter("example", "myTreeDiv");

        painter.setDrawFunc((dom, obj, opt) => {
            // console.log("call draw func");
            // console.log("dom:", dom);
            // console.log("obj:", obj);
            // console.log("opt:", opt);
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
            // console.log("Try to open");
            await painter.openRootFile(file).then((v) => {
                const ps = getPads(v.disp_kind);
                pads.current = ps;
                // console.log("File h: ", painter.h );
                console.log("HierarchyPainter opened file, disp_kind:", v.disp_kind, ps);
                configSubjectGet().appendPads(ps, v.disp_kind, defaultPad);
                setHierarchy(painter);
                setRootNode((painter as any).h);
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
                id="myTreeDiv"
                ref={hiddenTreeDivRef}
                style={{
                    width: "250px",
                    height: "100%",
                    float: "left",
                    // display: "flex",
                    display: !vrMode ? "flex" : "none",
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
        </div>
    );
}
