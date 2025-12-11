import { useEffect, useState } from "react";
import { Container, Text } from "@react-three/uikit";

interface RootNode {
    _name: string;
    _childs?: RootNode[] | Record<string, RootNode>;
}

interface JSRootHierarchy {
    h: RootNode;
    expandItem(name: string): Promise<void>;
    openRootFile(path: string): Promise<void>;
}

interface TreeViewerProps {
    hierarchy: JSRootHierarchy | null;
    root: RootNode;
    path?: string;
    doc: React.MutableRefObject<HTMLDivElement>;
    expandable?: boolean;
    onSelect?: (path_: string) => null;
}

function Line({
                  type,
                  color = "#7c7c7c",
              }: {
    type: "vertical" | "horizontal" | "corner";
    color?: string;
}) {
    switch (type) {
        case "vertical":
            return (
                <Container width={2} height="100%" backgroundColor={color} />
            );

        case "horizontal":
            return (
                <Container
                    width="100%"
                    height={20}
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                >
                    <Container
                        width="100%"
                        height={2}
                        backgroundColor={color}
                    />
                </Container>
            );

        case "corner":
            return <Container width={2} height={11} backgroundColor={color} />;

        default:
            return <Container />;
    }
}


export default function TreeViewer({
                        hierarchy,
                        root,
                        path = "",
                        doc,
                        expandable = false,
                        onSelect = null
                    }: TreeViewerProps) {
    const [show, setShow] = useState(false);
    const [isExpanded, setExpand] = useState(false);
    const [nodeName, setNodeName] = useState("");
    const [childs, setChilds] = useState<RootNode[]>([]);
    const [path_, setPath] = useState("");
    const [canOpen, setCanOpen] = useState<string[]>([]);

    useEffect(() => {
        const raw = root._childs;

        const childsArray: RootNode[] = Array.isArray(raw)
            ? raw
            : Object.values(raw || {});

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setNodeName(root._name);
        setPath(path + "/" + root._name);
        setChilds(childsArray);


        // elements with + or - can be expanded
        const pluses =
            doc.current.querySelectorAll(
                ".img_plus, .img_plusbottom, .img_minus, .img_minusbottom"
            ) ?? [];

        const nodes: string[] = [];
        pluses.forEach((plus) => {
            const line = plus.closest(".h_line");
            if (!line) return;

            const nameEl = line.querySelector(".h_item");
            if (nameEl) nodes.push(nameEl.textContent?.trim() || "");
        });

        setCanOpen(nodes);
    }, [show]);

    const handler = async () => {


        if (!isExpanded) {
            await hierarchy.expandItem(root._name);

            const raw = root._childs;
            const childsArray: RootNode[] = Array.isArray(raw)
                ? raw
                : Object.values(raw || {});

            setChilds(childsArray);
            setExpand(true);
        }

        setShow((v) => !v);
    };

    useEffect(() => {
        if (path === "" && root) {
            (async () => {
                await handler();
            })();
        }
    }, [ root]);


    return (
        <Container flexDirection="column" height="auto">
            <Container flexDirection="column">
                {expandable ? (
                    <Container display="flex" flexDirection="row">
                        <Container
                            width={20}
                            height={20}
                            justifyContent="center"
                            alignItems="center"
                            onClick={handler}
                            backgroundColor="#ccc"
                            marginLeft={-37}
                            borderWidth={2}
                            borderColor="#000"
                            borderRadius={4}
                        >
                            {show ? (
                                <Text
                                    fontSize={35}
                                    // weight="bold"
                                    color="#000"
                                    marginTop={-4}
                                >
                                    -
                                </Text>
                            ) : (
                                <Text
                                    fontSize={30}
                                    // weight="bold"
                                    color="#000"
                                    marginTop={-5}
                                >
                                    +
                                </Text>
                            )}
                        </Container>

                        <Text marginLeft={17} onClick={handler}>
                            {nodeName}
                        </Text>
                    </Container>
                ) : (
                    <Text onClick={() => onSelect(path_) }>{nodeName}</Text>
                )}

                {show && childs.length > 0 ? (
                    <Container flexDirection="column">
                        {childs.map((child, index) => (
                            <Container key={index} flexDirection="row">
                                <Container
                                    flexDirection="row"
                                    justifyContent="flex-end"
                                    width={25}
                                >
                                    {index === childs.length - 1 ? (
                                        <Line type="corner" />
                                    ) : (
                                        <Line type="vertical" />
                                    )}
                                </Container>

                                <Container
                                    flexDirection="row"
                                    justifyContent="center"
                                    width={25}
                                >
                                    <Line type="horizontal" />
                                </Container>

                                <TreeViewer
                                    hierarchy={hierarchy}
                                    root={child}
                                    path={path_}
                                    doc={doc}
                                    expandable={canOpen.includes(child._name)}
                                />
                            </Container>
                        ))}
                    </Container>
                ) : (
                    <Container />
                )}
            </Container>
        </Container>
    );
}


