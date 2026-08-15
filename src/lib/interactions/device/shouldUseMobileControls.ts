export function shouldUseMobileControls() {
    if (typeof window === "undefined") return false;

    const hasMultiTouch = navigator.maxTouchPoints >= 2;

    const noHover = window.matchMedia?.("(any-hover: none)").matches ?? false;
    const coarse = window.matchMedia?.("(any-pointer: coarse)").matches ?? false;

    const screenWidth = window.screen?.width;
    const screenHeight = window.screen?.height;
    const width =
        typeof screenWidth === "number" && screenWidth > 0 ? screenWidth : window.innerWidth;
    const height =
        typeof screenHeight === "number" && screenHeight > 0 ? screenHeight : window.innerHeight;
    const shortSide = Math.min(width, height);
    const phoneSized = shortSide <= 900;

    const uaMobile = (navigator as any).userAgentData?.mobile === true;

    return uaMobile || (hasMultiTouch && noHover && coarse && phoneSized);
}
