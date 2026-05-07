import { useEffect } from "react";
import type { NdmspcConfig } from "../../../interfaces/NdmspcConfig";

interface MenuMetadata {
    menuName: string;
    menuLabel: string;
}

interface CloseBrowserMenuProps {
    setBrowser: React.Dispatch<React.SetStateAction<NdmspcConfig | null>>;
}

function CloseBrowserMenu({ setBrowser }: CloseBrowserMenuProps) {
    useEffect(() => {
        setBrowser((prev) => ({
            ...(prev ?? {}),
            type: "object",
        }));
    }, [setBrowser]);

    return null;
}

const CloseBrowserMenuWithMetadata = CloseBrowserMenu as typeof CloseBrowserMenu & MenuMetadata;
CloseBrowserMenuWithMetadata.menuName = "close-browser";
CloseBrowserMenuWithMetadata.menuLabel = "Back to Object";

export default CloseBrowserMenuWithMetadata;
