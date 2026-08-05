import { createXRStore } from "@react-three/xr";

const XR_CURSOR_RENDER_ORDER = 10000;

const xrRayPointer = {
    cursorModel: {
        color: "#ffffff",
        opacity: 1,
        size: 0.25,
        cursorOffset: 0.035,
        renderOrder: XR_CURSOR_RENDER_ORDER,
    },
};

export const store = createXRStore({
    emulate: true,
    offerSession: "immersive-vr",
    domOverlay: false,
    controller: {
        rayPointer: xrRayPointer,
    },
    hand: {
        rayPointer: xrRayPointer,
    },
});
