import { Container } from "../interactions/Container.tsx";
import { useState } from "react";
import TreeViewer from "./TreeViewer.tsx";
import RendererModeSwitch from "./RendererModeSwitch.tsx";

interface FileBrowserProps {
    hierarchy: any;
    root: any;
    doc: React.MutableRefObject<HTMLDivElement>;
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

    // console.log(" FileBrowser Slelect: ", onSelect);
    const [selectedPath, setSelectedPath] = useState("");
    return (
        <Container
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
            <RendererModeSwitch
                rendererMode={rendererMode}
                setRendererMode={setRendererMode}
            />

            <Container gap={8} display="flex" flexDirection="column">
                {root && (
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
        </Container>
    );
}
