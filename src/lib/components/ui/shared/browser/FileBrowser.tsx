import { Container } from "@react-three/uikit";
import InteractionContainer from "../common/InteractionContainer.tsx";
import { useState } from "react";
import TreeViewer from "./TreeViewer.tsx";
import type { JSRootHierarchy, RootNode } from "./TreeViewer.tsx";
import RendererModeSwitch from "./RendererModeSwitch.tsx";

interface FileBrowserProps {
    hierarchy: JSRootHierarchy | null;
    root: RootNode | null;
    doc: React.RefObject<HTMLDivElement | null> | null;
    onSelect?: (path: string) => void;
    rendererMode?: "jsroot" | "ndmvr";
    setRendererMode?: React.Dispatch<React.SetStateAction<"jsroot" | "ndmvr">>;
}

export default function FileBrowser({
    hierarchy,
    root,
    doc,
    onSelect,
    rendererMode = "jsroot",
    setRendererMode,
}: FileBrowserProps) {
    const [selectedPath, setSelectedPath] = useState("");
    return (
        <InteractionContainer
            classList={["menuContainer"]}
            borderRadius={16}
            width={500}
            height={400}
            overflow="scroll"
            display="flex"
            flexDirection="column"
            alignItems="flex-start"
            justifyContent="flex-start"
        >
            <RendererModeSwitch rendererMode={rendererMode} setRendererMode={setRendererMode} />

            <Container gap={8} display="flex" flexDirection="column">
                {root && doc?.current && (
                    <TreeViewer
                        hierarchy={hierarchy}
                        root={root}
                        doc={doc}
                        selNodeHook={selectedPath}
                        selSetNodeHook={setSelectedPath}
                        onSelect={(p) => onSelect?.(p)}
                    />
                )}
            </Container>
        </InteractionContainer>
    );
}
