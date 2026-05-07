import { useEffect } from "react";
import type { NdmspcConfig } from "../../../interfaces/NdmspcConfig";

interface MenuMetadata {
    menuName: string;
    menuLabel: string;
}

interface OpenBrowserMenuProps {
    setBrowser: React.Dispatch<React.SetStateAction<NdmspcConfig | null>>;
}

function OpenBrowserMenu({ setBrowser }: OpenBrowserMenuProps) {
    useEffect(() => {
        setBrowser((prev) => ({
            ...(prev ?? {}),
            type: "browser",
        }));
    }, [setBrowser]);

    return null;
}

const OpenBrowserMenuWithMetadata = OpenBrowserMenu as typeof OpenBrowserMenu & MenuMetadata;
OpenBrowserMenuWithMetadata.menuName = "open-browser";
OpenBrowserMenuWithMetadata.menuLabel = "Browser";

export default OpenBrowserMenuWithMetadata;
