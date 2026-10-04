import type { NdmspcConfig } from "../../../interfaces/NdmspcConfig.ts";
import type { JSRootHierarchy, RootNode } from "./TreeViewer.tsx";
import FileBrowser from "./FileBrowser.tsx";
import FloatingContainer from "./FloatingContainer.tsx";

export interface BrowserConfig {
    browser?: boolean;
    hierarchy?: JSRootHierarchy | null;
    rootNode?: RootNode | null;
    hierarchyDocRef?: React.RefObject<HTMLDivElement | null>;
    onSelectItem?: (path: string) => void;
    setBrowser?: React.Dispatch<React.SetStateAction<NdmspcConfig | null>>;
    rendererMode?: "jsroot" | "ndmvr";
    setRendererMode?: React.Dispatch<React.SetStateAction<"jsroot" | "ndmvr">>;
    inputMenu?: React.ReactNode;
}

interface BrowserContentProps {
    browserConfig?: BrowserConfig;
}

export default function BrowserContent({ browserConfig }: BrowserContentProps) {
    return (
        <>
            {browserConfig?.browser && (
                <group position={[-12, 2, 0]}>
                    <FileBrowser
                        hierarchy={browserConfig.hierarchy ?? null}
                        root={browserConfig.rootNode ?? null}
                        doc={browserConfig.hierarchyDocRef ?? null}
                        onSelect={(path) => browserConfig.onSelectItem?.(path)}
                        rendererMode={browserConfig.rendererMode}
                        setRendererMode={browserConfig.setRendererMode}
                    />
                </group>
            )}
            {browserConfig?.inputMenu && (
                <FloatingContainer
                    offset={{ x: 0, y: 1.2, z: -4 }}
                    faceUser={true}
                    classList={["menuContainer"]}
                >
                    {browserConfig.inputMenu}
                </FloatingContainer>
            )}
        </>
    );
}
