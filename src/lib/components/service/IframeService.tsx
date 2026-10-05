import { useEffect, useLayoutEffect, useRef } from "react";

interface IframeMessage {
    data: {
        action: string;
        content: string;
    };
}

interface IframeServiceProps {
    targetOrigin?: string;
    onMessage?: (message: IframeMessage) => void;
}

const IframeService = ({ targetOrigin = "*", onMessage = null }: IframeServiceProps): null => {
    const latest = useRef({ targetOrigin, onMessage });
    useLayoutEffect(() => {
        latest.current = { targetOrigin, onMessage };
    }, [targetOrigin, onMessage]);

    useEffect(() => {
        const handlePostMessage = (event: IframeMessage) => {
            latest.current.onMessage?.(event);
        };
        window.parent.postMessage({ event: "init" }, latest.current.targetOrigin);
        window.addEventListener("message", handlePostMessage);
        return () => {
            window.removeEventListener("message", handlePostMessage);
        };
    }, []);

    return null;
};
export default IframeService;
