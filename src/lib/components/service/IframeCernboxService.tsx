import { useEffect, useState } from "react";

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

const IframeCernboxService = ({ targetOrigin = "*", onConfigLoad = null }: IframeServiceProps) => {
    const [config, setConfig] = useState(null);

    const handlePostMessage = (event: IframeMessage) => {
        // console.log("Event: ", event)

        if (event?.data?.action === "load") {
            // console.log(event.data)
            const ndmspcConfigString = event.data.content;
            console.log(
                "IframeCernboxService: Configuration string from iframe parent : ",
                ndmspcConfigString
            );
            try {
                const ndmspcConfig = JSON.parse(ndmspcConfigString);
                console.log(
                    "IframeCernboxService: Configuration from iframe parent : ",
                    ndmspcConfig
                );
                setConfig(ndmspcConfig);
            } catch (e) {
                console.error(
                    "IframeCernboxService: Error parsing configuration JSON string from iframe parent : ",
                    e
                );
            }
        } else if (event?.data?.action === "init_save") {
            console.log("IframeCernboxService: save:", JSON.stringify(config));
            window.parent.postMessage(
                { event: "upload", content: JSON.stringify(config) },
                targetOrigin
            );
        }
    };

    useEffect(() => {
        if (!window.parent) return;

        console.log("IframeCernboxService: Sending init message to iframe parent ...");
        window.parent.postMessage({ event: "init" }, targetOrigin);
        window.addEventListener("message", handlePostMessage);
        return () => {
            window.removeEventListener("message", handlePostMessage);
        };
    }, []);

    useEffect(() => {
        if (config === null || onConfigLoad === null) return;
        console.log(
            "IframeCernboxService: Calling onConfigLoad callback on ndmspc config ",
            config
        );
        onConfigLoad(config);
    }, [config, onConfigLoad]);

    return null;
};
export default IframeCernboxService;
