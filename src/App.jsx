import { useEffect, useRef} from "react";

import NdmspcEnv from "./lib/components/env/NdmspcEnv.jsx";
import { histogramSubjectGet } from "@ndmspc/ndmvr-aframe";
import h3scat from "./data/h3scat.json";
import config from "./lib/config.json";

function App() {
    const effectRan = useRef(false);

    useEffect(() => {
        if (effectRan.current) return;
        effectRan.current = true;
        // console.log("SENDING");
        // // histogramSubjectGet().next({id: 'histogram1', opts: {render: "jsroot"}, histogram: h3scat});
        // histogramSubjectGet().next({id: 'histogram2', opts: {render: "nested"}, histogram: h3scat});
        // // histogramSubjectGet().next({id: 'histogram3', opts: {render: "jsroot"}, histogram: h3scat});
        // histogramSubjectGet().next({id: 'histogram4', opts: {render: "nested"}, histogram: h3scat});
        // setTimeout(() => {
        //     histogramSubjectGet().next({id: 'histogram1', opts: {render: "jsroot"}, histogram: h3scat});
        // }, 4000)
    }, []);


    return <>
        <NdmspcEnv config={config} />
    </>;
}

export default App;
