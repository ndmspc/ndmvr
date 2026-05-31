import { useEffect } from "react";
import type { NdmspcConfig } from "../../../interfaces/NdmspcConfig";
import { store } from "../../env/xrStore";

interface MenuMetadata {
    menuName: string;
    menuLabel: string;
}

interface OpenBrowserMenuProps {
    setBrowser: React.Dispatch<React.SetStateAction<NdmspcConfig | null>>;
}

function OpenBrowserMenu({ setBrowser }: OpenBrowserMenuProps) {
    useEffect(() => {
        let cancelled = false;

        const openBrowser = () => {
            if (cancelled) return;

            setBrowser((prev) => ({
                ...(prev ?? {}),
                type: "browser",
            }));
        };

        const session = store.getState().session;
        if (session) {
            session.end().then(openBrowser).catch(openBrowser);
        } else {
            openBrowser();
        }

        return () => {
            cancelled = true;
        };
    }, [setBrowser]);

    return null;
}

const OpenBrowserMenuWithMetadata = OpenBrowserMenu as typeof OpenBrowserMenu & MenuMetadata;
OpenBrowserMenuWithMetadata.menuName = "open-browser";
OpenBrowserMenuWithMetadata.menuLabel = "Browser";

export default OpenBrowserMenuWithMetadata;
