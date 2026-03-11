import { createContext, useEffect, useState } from "react";
import { configSubjectGet } from "@ndmspc/ndmvr-core";
import HistogramWrapper from "./HistogramWrapper.tsx";
import CanvasComponent from "./CanvasComponent.tsx";
import KeyboardListener from "../systems/inputs/KeyboardListener.tsx";
import { histogramSubjectGet } from "@ndmspc/ndmvr-core";
import { map, merge } from "rxjs";

// eslint-disable-next-line react-refresh/only-export-components
export const HistogramContext = createContext(null);

export default function NdmvrContent({ children }: { children?: React.ReactNode | null }) {
    const [config, setConfig] = useState(null);
    const [histogram, setHistogram] = useState(null);

    useEffect(() => {
        const pads = config?.environment?.histogramPads ?? [];

        const streams = pads.map((pad) =>
            histogramSubjectGet()
                .getStream(pad.id)
                .pipe(map((histo) => ({ id: pad.id, obj: histo })))
        );

        const histoSub = merge(...streams).subscribe(({ obj }) => {
            console.log(obj);
            setHistogram(obj);
        });
        return () => {
            histoSub.unsubscribe();
        };
    }, [config]);

    useEffect(() => {
        const configSub = configSubjectGet()
            .getObservable()
            .subscribe((c) => {
                setConfig(c.config);
            });
        return () => {
            configSub.unsubscribe();
        };
    }, []);

    return (
        <>
            <HistogramContext.Provider value={histogram}>
                {config?.environment?.histogramPads?.map((object) => (
                    <HistogramWrapper key={object.id} id={object.id} />
                ))}
                {config?.environment?.histogramPads?.length > 0 && (
                    <CanvasComponent
                        location={config?.environment?.canvas}
                        id={`${config?.environment?.histogramPads?.[0]?.id}-cinema`}
                    />
                )}
                <KeyboardListener />
                {children}
            </HistogramContext.Provider>
        </>
    );
}
