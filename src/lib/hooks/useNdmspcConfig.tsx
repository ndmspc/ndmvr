import { useLayoutEffect } from "react";
import { parse as jsrootParse } from "jsroot";
import { histogramSubjectGet } from "@ndmspc/ndmvr-aframe";
import { NdmspcConfig } from "../interfaces/NdmspcConfig";

const useNdmspcConfig = (config: NdmspcConfig) => {
    useLayoutEffect(() => {
        console.log("Config state updated:", config);

        if (config === null) return;
        if (config?.type === "object") {
            if (config?.file) {
                fetch(config.file)
                    .then((response) => response.text())
                    .then((data) => {
                        const obj = jsrootParse(data);
                        console.log("Fetched object:", obj);
                        histogramSubjectGet().next({
                            id: `histogram1`,
                            opts: { render: "" },
                            obj: obj,
                        });
                    })
                    .catch((error) => {
                        console.error("Error fetching object:", error);
                    });
            }
        } else if (config?.type === "browser") {
            console.log("Browser type selected - no action taken.");
        }
    }, [config]);

    return null;
};
export default useNdmspcConfig;
