import { Container } from "../interactions/Container.tsx";
import { useEffect, useRef, useState } from "react";
import TreeViewer from "./TreeViewer.tsx";
import { HierarchyPainter } from "jsroot";


interface FileBrowserProps {
    hierarchy: any;
    root: any;
    doc: React.MutableRefObject<HTMLDivElement>;
    onSelect?: (path: string) => void;
}

export default function FileBrowser({ hierarchy, root, doc, onSelect }: FileBrowserProps) {

    // console.log(" FileBrowser Slelect: ", onSelect);

    return (
        <Container
            classList={["menuContainer"]}
            borderRadius={16}
            width={500}
            height={400}
            overflow="scroll"
            display="flex"
            flexDirection="row"
            alignItems="flex-start"
            justifyContent="flex-start"
        >
            <Container gap={8} display="flex" flexDirection="column">
                {root && (
                    <TreeViewer
                        hierarchy={hierarchy}
                        root={root}
                        doc={doc}
                        // expandable={true}
                        onSelect={(p) => onSelect?.(p)}
                    />
                ) }
            </Container>
        </Container>
    );
}
