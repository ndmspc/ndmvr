import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface IframeMessage {
    data: {
        action: string;
        content: string;
    };
}

interface IframeServiceProps {
    targetOrigin?: string;
    onConfigLoad?: (config: unknown) => void;
}

const IframeCernboxService = ({
    targetOrigin = "*",
    onConfigLoad = null,
}: IframeServiceProps): null => {
    const [config, setConfig] = useState<unknown>(null);
    const latest = useRef({ targetOrigin, config });
    useLayoutEffect(() => {
        latest.current.targetOrigin = targetOrigin;
    }, [targetOrigin]);

    useEffect(() => {
        if (!window.parent) return;

        const handlePostMessage = (event: IframeMessage) => {
            if (event?.data?.action === "load") {
                const ndmspcConfigString = event.data.content;
                try {
                    const ndmspcConfig: unknown = JSON.parse(ndmspcConfigString);
                    // Save requests can arrive before React commits the loaded configuration.
                    latest.current.config = ndmspcConfig;
                    setConfig(ndmspcConfig);
                } catch (e) {
                    console.error(
                        "IframeCernboxService: Error parsing configuration JSON string from iframe parent : ",
                        e
                    );
                }
            } else if (event?.data?.action === "init_save") {
                window.parent.postMessage(
                    { event: "upload", content: JSON.stringify(latest.current.config) },
                    latest.current.targetOrigin
                );
            }
        };
        window.parent.postMessage({ event: "init" }, latest.current.targetOrigin);
        window.addEventListener("message", handlePostMessage);
        return () => {
            window.removeEventListener("message", handlePostMessage);
        };
    }, []);

    useEffect(() => {
        if (config === null || onConfigLoad === null) return;
        onConfigLoad(config);
    }, [config, onConfigLoad]);

    return null;
};
export default IframeCernboxService;
