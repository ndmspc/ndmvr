import { redraw } from "jsroot";
import { useEffect, useState } from "react";
import { map, merge } from "rxjs";
import { canvasSubjectGet, configSubjectGet, histogramSubjectGet } from "@ndmspc/ndmvr-aframe";
import { Tabs } from "../ui/desktop/Tabs.tsx";
import { Tab } from "../ui/desktop/Tab.tsx";

const defaultUserHandler = (kind, info) => console.log(kind, info);

function jsrootRedraw(obj, elementId, onUser = defaultUserHandler) {
    if (!obj) return;
    const el = document.getElementById(elementId);
    if (!el) return;

    if (el.offsetParent !== null) {
        redraw(elementId, obj, "")
            .then((painter) => painter.configureUserClickHandler((info) => onUser("click", info)))
            .catch((err) => console.warn("[jsrootRedraw] redraw failed:", err));
    } else {
        setTimeout(() => jsrootRedraw(obj, elementId, onUser), 100);
    }
}

export default function JsrootEnv() {
    const [config, setConfig] = useState(null);
    const histoCinemaID = "nh-canva";
    useEffect(() => {
        const sub = configSubjectGet()
            .getObservable()
            .subscribe((c) => {
                console.log("[JsrootEnv]");
                console.log(c.config);
                setConfig(c.config);
            });
        const cinemaSub = canvasSubjectGet()
            .getObservable()
            .pipe()
            // .pipe(filter)
            .subscribe((obj) => {
                console.log(obj);
                jsrootRedraw(obj?.obj, histoCinemaID);
            });
        return () => {
            sub.unsubscribe();
            cinemaSub.unsubscribe();
        };
    }, []);

    // const pads = config?.environment?.histogramPads ?? [];
    // const n = pads.length;

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const pads = [
        {
            id: "histogram1",
        },
    ];
    const n: number = 1;
    const cols = Math.max(1, Math.ceil(Math.sqrt(n)));

    useEffect(() => {
        if (!n) return;

        const streams = pads.map((pad) =>
            histogramSubjectGet()
                .getStream(pad.id)
                .pipe(map((histo) => ({ id: pad.id, obj: histo })))
        );

        const sub = merge(...streams).subscribe(({ id, obj }) => {
            console.log(id);
            jsrootRedraw(obj?.obj, id);
            jsrootRedraw(obj?.obj, `full-${id}`);
        });

        return () => sub.unsubscribe();
    }, [n, pads]);

    return (
        <Tabs>
            <Tab name="Cinema">
                <div
                    id={histoCinemaID}
                    style={{
                        width: "100%",
                        height: "100%",
                        overflow: "hidden",
                        aspectRatio: "1 / 1",
                        border: "1px solid black",
                    }}
                />
            </Tab>
            {/*<Tab name={n === 1 ? pads[0]?.id : "All histograms"}>*/}
            <Tab name={n === 1 ? "Canvas" : "All histograms"}>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${cols}, 1fr)`,
                        gridAutoRows: "1fr",
                        gap: "8px",
                        width: "100%",
                        height: "100%",
                        padding: 8,
                        boxSizing: "border-box",
                    }}
                >
                    {n === 0 && (
                        <div style={{ display: "grid", placeItems: "center", color: "#888" }}>
                            No histograms
                        </div>
                    )}

                    {pads.map((pad) => (
                        <div
                            key={pad.id}
                            id={pad.id}
                            style={{
                                width: "100%",
                                height: "100%",
                                overflow: "hidden",
                                aspectRatio: "1 / 1",
                                border: "1px solid black",
                            }}
                        />
                    ))}
                </div>
            </Tab>
            {n > 1 &&
                pads.map((pad) => (
                    <Tab name={pad?.id} key={pad.id}>
                        <div
                            id={`full-${pad.id}`}
                            style={{
                                width: "100%",
                                height: "100%",
                                overflow: "hidden",
                                aspectRatio: "1 / 1",
                                border: "1px solid black",
                            }}
                        />
                    </Tab>
                ))}
        </Tabs>
    );
}
