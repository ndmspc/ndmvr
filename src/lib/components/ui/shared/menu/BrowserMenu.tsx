import { useEffect } from "react";
import type { BrowserConfig } from "../browser/BrowserContent.tsx";
import { store } from "../../../../stores/xr/store";

interface BrowserMenuProps {
    browserConfig?: BrowserConfig;
}

function BrowserMenu({ browserConfig }: BrowserMenuProps) {
    const setBrowser = browserConfig?.setBrowser;
    const browser = browserConfig?.browser ?? false;

    useEffect(() => {
        if (!setBrowser) return;
        let cancelled = false;

        const changeBrowser = () => {
            if (cancelled) return;
            setBrowser((prev) => ({
                ...(prev ?? {}),
                type: browser ? "object" : "browser",
            }));
        };

        const session = store.getState().session;
        if (session) {
            session.end().then(changeBrowser).catch(changeBrowser);
        } else {
            changeBrowser();
        }

        return () => {
            cancelled = true;
        };
    }, [browser, setBrowser]);

    return null;
}

BrowserMenu.getMenuMetadata = ({ browserConfig }: { browserConfig?: BrowserConfig }) => {
    if (!browserConfig?.setBrowser) return null;
    return browserConfig.browser
        ? { menuName: "close-browser", menuLabel: "Back to Object" }
        : { menuName: "open-browser", menuLabel: "Browser" };
};

export default BrowserMenu;
