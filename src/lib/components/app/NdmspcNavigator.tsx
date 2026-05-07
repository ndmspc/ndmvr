// import { useRef, useState } from "react";
// import { parse as jsrootParse } from "jsroot";
import NdmspcEnv from "../env/NdmspcEnv";
import NdmspcDefaultBrowserEnv from "../env/NdmspcDefaultBrowserEnv";
import useNdmspcConfig from "../../hooks/useNdmspcConfig";
import useNdmspcWebsocket from "../../hooks/useNdmspcWebsocket";
import type { NdmspcConfig } from "../../interfaces/NdmspcConfig";
import type { NdmvrConfig } from "../../interfaces/NdmvrConfig";
import { useCallback, useRef, useState } from "react";

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

    const [localConfig, setLocalConfig] = useState<NdmspcConfig | null>(ndmspcConfig);
    const previousNonBrowserConfigRef = useRef<NdmspcConfig | null>(
        ndmspcConfig?.type === "browser" ? null : ndmspcConfig
    );

    const setBrowserConfig = useCallback<React.Dispatch<React.SetStateAction<NdmspcConfig | null>>>(
        (value) => {
            setLocalConfig((prev) => {
                const next = typeof value === "function" ? value(prev) : value;

                if (next?.type === "browser" && prev?.type !== "browser") {
                    previousNonBrowserConfigRef.current = prev;
                }

                if (prev?.type === "browser" && next?.type === "object") {
                    return previousNonBrowserConfigRef.current;
                }

                if (next?.type !== "browser") {
                    previousNonBrowserConfigRef.current = next;
                }

                return next;
            });
        },
        []
    );

    return (
        <>
            {children}
            {localConfig?.type === "object" && (
                <NdmspcEnv config={ndmvrConfig} help={help} menu={false} setBrowser={setBrowserConfig} />
            )}
            {localConfig?.type === "browser" && (
                <NdmspcDefaultBrowserEnv file={localConfig?.file} layout="simple" setBrowser={setBrowserConfig}/>
            )}
            {!localConfig?.type && <NdmspcEnv config={ndmvrConfig} menu={menu} help={help} setBrowser={setBrowserConfig}/>}
        </>
    );
}

export default NdmspcNavigator;
