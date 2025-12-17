import { Container } from "../interactions/Container.tsx";
import { useEffect, useRef, useState } from "react";
import TreeViewer from "./TreeViewer.tsx";
import { HierarchyPainter } from "jsroot";

interface FileBrowserProps {
    url: string;
    openFunction?: () => void;
}

interface RootNode {
    _name: string;
    _childs?: RootNode[] | Record<string, RootNode>;
}

interface JSRootHierarchy {
    h: RootNode;
    expandItem(name: string): Promise<void>;
    openRootFile(path: string): Promise<void>;
}

export default function FileBrowser({ url }: FileBrowserProps) {
    const treeRef = useRef<HTMLDivElement>(document.createElement("div"));
    const [hierarchy, setHierarchy] = useState<JSRootHierarchy | null>(null);
    const [root, setRoot] = useState<RootNode | null>(null);

    useEffect(() => {
        const h = new HierarchyPainter("example", treeRef.current);

        h.openRootFile(url).then(() => {
            setHierarchy(h);
            setRoot(h.h);
        });
    }, [url]);

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
                {root && <TreeViewer hierarchy={hierarchy} root={root} doc={treeRef} />}
            </Container>
        </Container>
    );
}
