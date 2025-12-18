// import { useEffect, useRef, useState } from "react";
// import { parse as jsrootParse } from "jsroot";
import NdmspcEnv from "../env/NdmspcEnv";
import NdmspcDefaultBrowserEnv from "../env/NdmspcDefaultBrowserEnv";
import useNdmspcConfig from "../../hooks/useNdmspcConfig";
import useNdmspcWebsocket from "../../hooks/useNdmspcWebsocket";
import { NdmspcConfig } from "../../interfaces/NdmspcConfig";
import { NdmvrConfig } from "../../interfaces/NdmvrConfig";

interface NdmspcNavigatorProps {
    children?: React.ReactNode;
    menu?: boolean;
    help?: boolean;
    ndmspcConfig?: NdmspcConfig | null;
    ndmvrConfig?: NdmvrConfig | null;
}
function NdmspcNavigator({
    children = null,
    menu = false,
    help = false,
    ndmspcConfig = null,
    ndmvrConfig = null,
}: NdmspcNavigatorProps) {
    useNdmspcWebsocket();
    useNdmspcConfig(ndmspcConfig);

    return (
        <>
            {children}
            {ndmspcConfig?.type === "object" && (
                <NdmspcEnv config={ndmvrConfig} help={help} menu={false} />
            )}
            {ndmspcConfig?.type === "browser" && (
                <NdmspcDefaultBrowserEnv file={ndmspcConfig?.file} layout="simple" />
            )}
            {!ndmspcConfig?.type && <NdmspcEnv config={ndmvrConfig} menu={menu} help={help} />}
        </>
    );
}

export default NdmspcNavigator;
