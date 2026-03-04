import { useEffect, useState } from "react";
import { configSubjectGet } from "@ndmspc/ndmvr-core";
import HistogramWrapper from "./HistogramWrapper.tsx";
import CanvasComponent from "./CanvasComponent.tsx";

export default function NdmvrContent() {
    const [config, setConfig] = useState(null);

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
        <group>
            {config?.environment?.histogramPads?.map((object) => (
                <HistogramWrapper key={object.id} id={object.id} />
            ))}
            {config?.environment?.histogramPads?.length > 0 && (
                <CanvasComponent
                    location={config?.environment?.canvas}
                    id={`${config?.environment?.histogramPads?.[0]?.id}-cinema`}
                />
            )}
        </group>
    );
}
