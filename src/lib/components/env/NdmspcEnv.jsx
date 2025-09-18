import NdmvrEnv from "./NdmvrEnv.jsx";
import JsrootEnv from "./JsrootEnv.jsx";
import Switch from "../ui/desktop/Switch.jsx";

import { useEffect, useState } from "react";
import { configSubjectGet } from "@ndmspc/ndmvr-aframe";

import defaultConfig from "../../config.json";

export default function NdmspcEnv({ config = null }) {

    const [vrMode, setVRMode] = useState(true);


    useEffect(() => {
        const newConfig = configSubjectGet().getValue().config;
        const merged = {...newConfig, ...config};
        // if(config) configSubjectGet().next(config);
        configSubjectGet().next(merged);

    }, []);

    return (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <div style={{ display: vrMode ? "none" : "flex", width: "100%", height: "100%" }}>
                <JsrootEnv/>
            </div>
            <div style={{ display: vrMode ? "flex" : "none", width: "100%", height: "100%" }}>
                <NdmvrEnv/>
            </div>
            <Switch startState={true} checked onToggle={(checked) => setVRMode(checked)}/>
        </div>
    );
}
