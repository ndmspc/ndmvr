import NdmvrEnv from "./NdmvrEnv.jsx";
// import JsrootEnv from "./JsrootEnv.jsx";
import Switch from "../ui/desktop/Switch.jsx";
import {draw, HierarchyPainter, setDefaultDrawOpt} from 'jsroot';

import { useCallback, useEffect, useRef, useState } from "react";
import { configSubjectGet, histogramSubjectGet } from "@ndmspc/ndmvr-aframe";

import defaultConfig from "../../config.json";
import { getPads } from "../../utils/helper-functions.js";

export default function NdmspcDefaultBrowserEnv({ children, config = null, onConfigChange, controlsHelp = false, renderer = "jsroot", vr = false, painterDisplay = "simple" }) {
    const [vrMode, setVRMode] = useState(vr);
    const initializedRef = useRef(false);
    const [appConfig, setAppConfig] = useState(defaultConfig);
    const painterRef = useRef(null);
    const pads = useRef([]);
    const padsCounter = useRef(0);


    console.log("NdmspcDefaultBrowserEnv render, config:", appConfig, "onConfigChange:", typeof onConfigChange);

    const applyConfig = useCallback((newConfig) => {
        console.log("Config changed from SettingsPanel:", newConfig);
        setAppConfig(newConfig);
        configSubjectGet().next(newConfig);
        onConfigChange?.(newConfig);
    }, [onConfigChange]);


    useEffect(() => {
        configSubjectGet().next(defaultConfig);
        if (config) {
            configSubjectGet().next(config);
        }
        setAppConfig(configSubjectGet().getValue());
    }, [config]);

    useEffect(() => {
        if (!vrMode && painterRef.current) {
            painterRef.current.checkResize();
        }
    }, [vrMode]);

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        const painter = new HierarchyPainter('example', 'myTreeDiv');

        // painter.setDisplay('simple', 'myMainDiv');
        painter.setDisplay(painterDisplay, 'myMainDiv');

        // catch draw function calls

        painter.setDrawFunc((dom, obj, opt) => {
            histogramSubjectGet().next({
                id: `pad${padsCounter.current + 1}`,
                opts: { render: renderer },
                obj: obj,
            });
            if (pads.current.length > 0)
                padsCounter.current = (padsCounter.current + 1) % (pads.current.length);
            return draw(dom, obj, opt);
        });
        painterRef.current = painter;

        const fetchData = async () => {
            // setDefaultDrawOpt('TH1', 'text');
            setDefaultDrawOpt('TH2', 'col');
            // setDefaultDrawOpt('TBranch', 'lego');
            // painter.setDisplay('simple', 'myMainDiv');

            painter.no_select = true;
            // let enable scrollbars for hierarchy content, otherwise only HTML resize can be use to see elements
            painter.show_overflow = true;
            // configure 'simple' layout for drawings     _____DONE______
            // one also can specify "grid2x2" or "flex"   _____FIX COUNTER FOR GRID, FLEX WILL NEED TO BE DYNAMIC?_____
            // h.prepareGuiDiv('simpleGUI', 'flex');
            // open file and display element
            // await h.createBrowser('fix');
            await painter.openRootFile('https://root.cern.ch/js/files/hsimple.root').then((v) => {
                const ps = getPads(v.disp_kind);
                pads.current = ps;
                console.log(ps);
                configSubjectGet().appendPads(ps, v.disp_kind, {
                    scale: { x: 10, y: 5, z: 10 },
                    padding: { x: 0, y: 0, z: 0 },
                    origin: { x: -10, y: 0.5, z: 1 }
                })
                painter.display("hpxpy;1", "colz");

            });
            // await h.expandItem('E;1//Event/Gen/Header');
            console.log("HierarchyPainter h:", painter);
        }
        fetchData();
    }, []);

    return (
        <div style={{
            width: "100%", height: "100%", display: "flex"
        }}>

            <div id="myTreeDiv" style={{
                width: "250px", height: "100%", float: "left"
            }}/>

            <div id="myMainDiv" className="main-div" style={{
                display: !vrMode ? "flex" : "none"
            }}/>

            <div className="main-div" style={{
                display: vrMode ? "flex" : "none",
            }}>
                <NdmvrEnv
                    controlsHelp={controlsHelp}
                    currentConfig={appConfig}
                    onConfigChange={applyConfig}
                >
                    {children}
                </NdmvrEnv>
            </div>

            <Switch startState={vrMode} checked onToggle={(checked) => setVRMode(checked)} />
        </div>
    );
}
