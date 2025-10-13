import { redraw } from "jsroot";
import { useEffect, useState } from "react";
import { merge, map } from "rxjs";
import { histogramSubjectGet, configSubjectGet } from "@ndmspc/ndmvr-aframe";

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

    useEffect(() => {
        const sub = configSubjectGet().getObservable().subscribe((c) =>{
            setConfig(c.config)
        });
        return () => sub.unsubscribe();
    }, []);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const pads = config?.environment?.histogramPads ?? [];
    const n = pads.length;

    const cols = Math.max(1, Math.ceil(Math.sqrt(n)));

    useEffect(() => {
        if (!n) return;

        const streams = pads.map((pad) =>
            histogramSubjectGet()
                .getStream(pad.id)
                .pipe(map((histo) => ({ id: pad.id, histo })))
        );

        const sub = merge(...streams).subscribe(({ id, histo }) => {
            jsrootRedraw(histo?.histogram, `histo-${id}`);
        });

        return () => sub.unsubscribe();
    }, [n, pads]);

    return (
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
                    id={`histo-${pad.id}`}
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
    );
}
