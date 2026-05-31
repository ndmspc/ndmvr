import { useEffect } from "react";
import type { NdmspcConfig } from "../../../interfaces/NdmspcConfig";
import { store } from "../../env/xrStore";

interface MenuMetadata {
    menuName: string;
    menuLabel: string;
}

interface CloseBrowserMenuProps {
    setBrowser: React.Dispatch<React.SetStateAction<NdmspcConfig | null>>;
}

function CloseBrowserMenu({ setBrowser }: CloseBrowserMenuProps) {
    useEffect(() => {
        let cancelled = false;

        const closeBrowser = () => {
            if (cancelled) return;

            setBrowser((prev) => ({
                ...(prev ?? {}),
                type: "object",
            }));
        };

        const session = store.getState().session;
        if (session) {
            session.end().then(closeBrowser).catch(closeBrowser);
        } else {
            closeBrowser();
        }

        return () => {
            cancelled = true;
        };
    }, [setBrowser]);

    return null;
}

const CloseBrowserMenuWithMetadata = CloseBrowserMenu as typeof CloseBrowserMenu & MenuMetadata;
CloseBrowserMenuWithMetadata.menuName = "close-browser";
CloseBrowserMenuWithMetadata.menuLabel = "Back to Object";

export default CloseBrowserMenuWithMetadata;
