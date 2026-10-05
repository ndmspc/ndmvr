import { useLayoutEffect } from "react";
import { parse as jsrootParse } from "jsroot";
import { histogramSubjectGet } from "@ndmspc/ndmvr-core";
import type { NdmspcConfig } from "../interfaces/NdmspcConfig";

const useNdmspcConfig = (config: NdmspcConfig | null): null => {
    useLayoutEffect(() => {
        if (config === null) return;
        if (config?.type === "object") {
            if (config?.file) {
                const request = new AbortController();
                fetch(config.file, { signal: request.signal })
                    .then((response) => {
                        if (request.signal.aborted) return;
                        return response.text();
                    })
                    .then((data) => {
                        if (request.signal.aborted) return;
                        const obj = jsrootParse(data);
                        histogramSubjectGet().next({
                            id: `pad1`,
                            opts: { render: "" },
                            obj: obj,
                        });
                    })
                    .catch((error) => {
                        if (request.signal.aborted) return;
                        console.error("Error fetching object:", error);
                    });

                return () => request.abort();
            }
        }
    }, [config]);

    return null;
};
export default useNdmspcConfig;
