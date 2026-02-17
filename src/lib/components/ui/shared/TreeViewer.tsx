import { useEffect, useRef, useState } from "react";
import { Text } from "@react-three/uikit";
import { Container } from "../interactions/Container";
//
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
    onSelect?: (path_: string) => void;
}
//
function Line({
    type,
    color = "#7c7c7c",
}: {
    type: "vertical" | "horizontal" | "corner";
    color?: string;
}) {
    switch (type) {
        case "vertical":
            return <Container width={2} height="100%" backgroundColor={color} />;

        case "horizontal":
            return (
                <Container
                    width="100%"
                    height={20}
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                >
                    <Container width="100%" height={2} backgroundColor={color} />
                </Container>
            );

        case "corner":
            return <Container width={2} height={11} backgroundColor={color} />;

        default:
            return <Container />;
    }
}
//
export default function TreeViewer({
    hierarchy,
    root,
    path = "",
    doc,
    expandable = false,
    onSelect = null,
}: TreeViewerProps) {
    const [show, setShow] = useState(false);
    // const [isExpanded, setExpand] = useState(false);
    const [nodeName, setNodeName] = useState("");
    const [childs, setChilds] = useState<RootNode[]>([]);
    const [path_, setPath] = useState("");
    const [canOpen, setCanOpen] = useState<string[]>([]);
    const rootAutoOpened = useRef(false);


    const norm = (s: string) => (s ?? "").trim().replace(/;\d+$/, "");


    useEffect(() => {
        const raw = root._childs;

        const childsArray: RootNode[] = Array.isArray(raw) ? raw : Object.values(raw || {});

        // eslint-disable-next-line react-hooks/set-state-in-effect
        const normName = norm(root._name);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setNodeName(normName);
        const nextPath = path ? `${path}/${normName}` : normName;
        setPath(nextPath)
        setChilds(childsArray);

        // console.log("DOC in Tree: ", doc.current );

        // elements with + or - can be expanded
        const pluses =
            doc.current.querySelectorAll(
                ".img_plus, .img_plusbottom, .img_minus, .img_minusbottom, .img_folder, .img_folderopen"
            ) ?? [];


        const nodes: string[] = [];
        pluses.forEach((plus) => {
            const line = plus.closest(".h_line");
            if (!line) return;

            const nameEl = line.querySelector(".h_item");
            if (nameEl) nodes.push(norm(nameEl.textContent || ""));
        });

        setCanOpen(nodes);

    }, [doc, path, root._childs, root._name, show]);

    const isOpenIn2D = (nodeLabel: string) => {
        const d = doc.current;
        if (!d) return false;

        const wanted = norm(nodeLabel);

        const items = Array.from(d.querySelectorAll(".h_line .h_item")) as HTMLElement[];
        const nameEl = items.find((el) => norm(el.textContent || "") === wanted);
        if (!nameEl) return false;

        const line = nameEl.closest(".h_line");
        if (!line) return false;

        return !!line.querySelector(".img_minus, .img_minusbottom, .img_folderopen");
    };



    const handler = async () => {
        if (!show) {

            if ( hierarchy && !isOpenIn2D(nodeName)) {
                // console.log("expand: ", path_);
                await hierarchy.expandItem(path_);
            }

            const raw = root._childs;
            const childsArray: RootNode[] = Array.isArray(raw) ? raw : Object.values(raw || {});
            setChilds(childsArray);
            // setExpand(true);
        }

        setShow((v) => !v);
    };


    useEffect(() => {
        if (path !== "") return;
        if (!root) return;
        if (rootAutoOpened.current) return;

        rootAutoOpened.current = true;

        (async () => {
            if (hierarchy && !isOpenIn2D(nodeName)) {
                await hierarchy.expandItem(path_);
            }

            const raw = root._childs;
            const childsArray: RootNode[] = Array.isArray(raw) ? raw : Object.values(raw || {});
            setChilds(childsArray);

            // setExpand(true);
            setShow(true);
        })();
    }, [root, hierarchy, path, path_, nodeName]);


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
                    <Text onClick={() => {
                        // console.log("Not expandable ", path_);

                            // console.log(onSelect)
                        onSelect?.(path_);

                        // console.log(path_)
                        // hierarchy.display(path_, "");

                        // const painter = hierarchy;
                        // const painterDisplay = async () => {
                        //     console.log("painterDis: " + path_);
                        //     // console.log(;
                        //     await painter.display(path_, "");
                        // };
                        // painterDisplay();

                    }}
                        >{nodeName}</Text>
                )}

                {show && childs.length > 0 ? (
                    <Container flexDirection="column">
                        {childs.map((child, index) => (
                            <Container key={index} flexDirection="row">
                                <Container flexDirection="row" justifyContent="flex-end" width={25}>
                                    {index === childs.length - 1 ? (
                                        <Line type="corner" />
                                    ) : (
                                        <Line type="vertical" />
                                    )}
                                </Container>

                                <Container flexDirection="row" justifyContent="center" width={25}>
                                    <Line type="horizontal" />
                                </Container>

                                <TreeViewer
                                    hierarchy={hierarchy}
                                    root={child}
                                    path={path_}
                                    doc={doc}
                                    // expandable={canOpen.includes(child._name)}
                                    expandable={canOpen.includes(norm(child._name))}
                                    onSelect={onSelect}
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

