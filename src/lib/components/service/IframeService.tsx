import { useEffect } from 'react';

interface IframeMessage {
    data: {
        action: string;
        content: string
    };
}

interface IframeServiceProps {
    targetOrigin?: string;
    onMessage?: (message: IframeMessage) => void;
}

const IframeService = ({ targetOrigin = "*", onMessage = null }: IframeServiceProps) => {

    const handlePostMessage = (event: IframeMessage) => {
        console.log("Event: ", event)
        if (onMessage) onMessage(event);
    };

    useEffect(() => {
        window.parent.postMessage({ event: "init" }, targetOrigin);
        window.addEventListener('message', handlePostMessage);
        return () => {
            window.removeEventListener('message', handlePostMessage);
        };
    }, []);


    return null;
};
export default IframeService;

