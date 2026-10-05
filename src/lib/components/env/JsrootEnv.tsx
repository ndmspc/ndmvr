import { cleanup, redraw } from "jsroot";
import { useEffect, useRef } from "react";
import { map, merge } from "rxjs";
import { histogramSubjectGet } from "@ndmspc/ndmvr-core";
import { Tabs } from "../ui/desktop/Tabs.tsx";
import { Tab } from "../ui/desktop/Tab.tsx";

const defaultUserHandler = (kind: string, info: unknown) => console.log(kind, info);
const pads = [{ id: "pad1" }];

interface RedrawTarget {
    element: HTMLElement;
    active: boolean;
    pending: unknown;
    running: boolean;
    revision: number;
    timer?: ReturnType<typeof setTimeout>;
}

function ownsTarget(target: RedrawTarget) {
    return target.active && document.getElementById(target.element.id) === target.element;
}

function jsrootRedraw(target: RedrawTarget) {
    if (!ownsTarget(target) || !target.pending || target.running) return;

    if (target.timer !== undefined) {
        if (target.element.offsetParent === null) return;
        clearTimeout(target.timer);
        target.timer = undefined;
    }

    if (target.element.offsetParent === null) {
        target.timer = setTimeout(() => {
            target.timer = undefined;
            jsrootRedraw(target);
        }, 100);
        return;
    }

    const obj = target.pending;
    const revision = target.revision;
    target.pending = undefined;
    target.running = true;
    // JSROOT cannot cancel an in-flight redraw. Keep it on its captured DOM
    // element and serialize updates so an older draw cannot finish last.
    redraw(target.element, obj, "")
        .then((painter) => {
            if (!ownsTarget(target) || revision !== target.revision) return;
            painter.configureUserClickHandler((info: unknown) => {
                if (ownsTarget(target)) defaultUserHandler("click", info);
            });
        })
        .catch((err) => {
            if (ownsTarget(target) && revision === target.revision)
                console.warn("[jsrootRedraw] redraw failed:", err);
        })
        .finally(() => {
            target.running = false;
            if (!ownsTarget(target)) {
                cleanup(target.element);
                return;
            }
            jsrootRedraw(target);
        });
}

export default function JsrootEnv() {
    const redrawTargets = useRef(new Map<HTMLElement, RedrawTarget>());
    const n: number = 1;
    const cols = Math.max(1, Math.ceil(Math.sqrt(n)));

    useEffect(() => {
        if (!n) return;

        const targets = new Map<string, RedrawTarget>();
        for (const id of pads.flatMap((pad) => [pad.id, `full-${pad.id}`])) {
            const element = document.getElementById(id);
            if (!element) continue;
            let target = redrawTargets.current.get(element);
            if (!target) {
                target = { element, active: true, pending: undefined, running: false, revision: 0 };
                redrawTargets.current.set(element, target);
            }
            // StrictMode setup may reclaim the same element while its previous
            // redraw settles. Reuse the queue rather than starting a second one.
            target.active = true;
            targets.set(id, target);
        }

        const streams = pads.map((pad) =>
            histogramSubjectGet()
                .getStream(pad.id)
                .pipe(map((histo) => ({ id: pad.id, obj: histo })))
        );

        const sub = merge(...streams).subscribe(({ id, obj }) => {
            for (const elementId of [id, `full-${id}`]) {
                const target = targets.get(elementId);
                if (!target) continue;
                target.pending = obj?.obj;
                target.revision++;
                if (!target.pending && target.timer !== undefined) {
                    clearTimeout(target.timer);
                    target.timer = undefined;
                }
                jsrootRedraw(target);
            }
        });

        return () => {
            sub.unsubscribe();
            for (const target of targets.values()) {
                target.active = false;
                target.pending = undefined;
                target.revision++;
                clearTimeout(target.timer);
                target.timer = undefined;
                if (!target.running) cleanup(target.element);
            }
        };
    }, [n]);

    return (
        <Tabs>
            <Tab name="Canvas">
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
        </Tabs>
    );
}
