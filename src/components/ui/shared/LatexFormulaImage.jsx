import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Image as VRImage, Icon as VRIcon } from "@react-three/uikit";
import { loadMathjax, produceMathjax } from "jsroot/latex";
import * as d3 from "d3-selection";

// import {formulaImagesCache as imageCache} from "../../../App.jsx"
const imageCache = new Map();
const svgHostSingleton = { current: null };

const getCacheKey = (text, color, background, scale, useSvg) => {
    return JSON.stringify({ text, color, background, scale, useSvg });
};

const cleanupCache = (maxSize = 100) => {
    if (imageCache.size > maxSize) {
        const entriesToDelete = imageCache.size - maxSize;
        const iterator = imageCache.keys();
        for (let i = 0; i < entriesToDelete; i++) {
            const keyToDelete = iterator.next().value;
            const cached = imageCache.get(keyToDelete);
            if (cached?.url && cached.url.startsWith('blob:')) {
                URL.revokeObjectURL(cached.url);
            }
            imageCache.delete(keyToDelete);
        }
    }
};

export default function LatexFormulaImage({
    text,
    color = "#000",
    background = "transparent",
    scale = 2,
    width,
    height,
    svg = false,
    cacheEnabled = true,
    ...rest
}) {
    const [imageData, setImageData] = useState(null);
    const [natural, setNatural] = useState({ w: 1, h: 1 });
    const isMountedRef = useRef(true);
    const currentGenerationRef = useRef(0);

    const mjReady = useMemo(() => loadMathjax().catch(() => {}), []);

    const getSvgHost = useCallback(() => {
        if (!svgHostSingleton.current) {
            const svgHost = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svgHost.setAttribute("width", "1");
            svgHost.setAttribute("height", "1");
            svgHost.style.cssText =
                "position:fixed;left:-99999px;top:-99999px;visibility:hidden;pointer-events:none;";
            document.body.appendChild(svgHost);
            svgHostSingleton.current = svgHost;
        }
        return svgHostSingleton.current;
    }, []);

    const generateImage = useCallback(async () => {
        const generationId = ++currentGenerationRef.current;

        const cacheKey = getCacheKey(text, color, background, scale, svg);
        if (cacheEnabled && imageCache.has(cacheKey)) {
            const cached = imageCache.get(cacheKey);
            if (isMountedRef.current && generationId === currentGenerationRef.current) {
                setImageData(cached.url);
                setNatural(cached.natural);
            }
            return;
        }

        await mjReady;

        if (!isMountedRef.current || generationId !== currentGenerationRef.current) return;

        const host = getSvgHost();

        const previousContent = host.innerHTML;
        host.innerHTML = "";

        try {
            const painter = {
                getColor: () => color,
                scaleTextDrawing: (size) => size,
            };

            await produceMathjax(painter, d3.select(host), {
                text,
                font: { size: 16 },
                font_size: 16,
                color,
                x: 0,
                y: 0,
                width: 0,
                height: 0,
                align: ["start", "top"],
                rotate: 0,
            });

            const generatedSvg = host.querySelector("svg");
            if (!generatedSvg) {
                throw new Error("SVG generation failed");
            }

            if (!generatedSvg.getAttribute("width") || !generatedSvg.getAttribute("height")) {
                const vb = generatedSvg.getAttribute("viewBox");
                if (vb) {
                    const [, , w, h] = vb.split(/\s+/).map(Number);
                    if (w > 0 && h > 0) {
                        generatedSvg.setAttribute("width", String(w));
                        generatedSvg.setAttribute("height", String(h));
                    }
                }
            }

            const w = Number(generatedSvg.getAttribute("width") || 1);
            const h = Number(generatedSvg.getAttribute("height") || 1);
            const naturalDimensions = { w: Math.max(1, w), h: Math.max(1, h) };

            if (!isMountedRef.current || generationId !== currentGenerationRef.current) return;

            let resultUrl;

            if (svg) {
                const xml = new XMLSerializer().serializeToString(generatedSvg);
                const svgBlob = new Blob([xml], { type: "image/svg+xml" });
                resultUrl = URL.createObjectURL(svgBlob);
            } else {
                resultUrl = await new Promise((resolve) => {
                    const xml = new XMLSerializer().serializeToString(generatedSvg);
                    const svgBlob = new Blob([xml], { type: "image/svg+xml" });
                    const svgUrl = URL.createObjectURL(svgBlob);

                    const img = new globalThis.Image();
                    img.onload = () => {
                        const canvas = document.createElement("canvas");
                        canvas.width = Math.max(1, Math.ceil(img.width * scale));
                        canvas.height = Math.max(1, Math.ceil(img.height * scale));
                        const ctx = canvas.getContext("2d");

                        if (background !== "transparent") {
                            ctx.fillStyle = background;
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                        }
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                        canvas.toBlob((blob) => {
                            URL.revokeObjectURL(svgUrl);
                            if (blob) {
                                const pngUrl = URL.createObjectURL(blob);
                                resolve(pngUrl);
                            } else {
                                resolve(null);
                            }
                        }, "image/png");
                    };
                    img.onerror = () => {
                        URL.revokeObjectURL(svgUrl);
                        resolve(null);
                    };
                    img.src = svgUrl;
                });
            }

            if (resultUrl && isMountedRef.current && generationId === currentGenerationRef.current) {
                if (cacheEnabled) {
                    imageCache.set(cacheKey, {
                        url: resultUrl,
                        natural: naturalDimensions
                    });
                    cleanupCache();
                }

                setImageData(resultUrl);
                setNatural(naturalDimensions);
            }
        } catch (error) {
            console.error("Error generating LaTeX image:", error);
        } finally {
            host.innerHTML = previousContent;
        }
    }, [text, color, background, scale, svg, cacheEnabled, mjReady, getSvgHost]);

    useEffect(() => {
        isMountedRef.current = true;
        generateImage();

        return () => {
            isMountedRef.current = false;
        };
    }, [generateImage]);

    const aspect = natural.w / natural.h || 1;
    const dispW = width ?? (height ? height * aspect : natural.w);
    const dispH = height ?? (width ? width / aspect : natural.h);

    if (!imageData) return null;

    if (svg) {
        return <VRIcon src={imageData} width={dispW} height={dispH} {...rest} />;
    } else {
        return <VRImage src={imageData} width={dispW} height={dispH} {...rest} />;
    }
}

export const clearLatexCache = () => {
    imageCache.forEach((cached) => {
        if (cached?.url && cached.url.startsWith('blob:')) {
            URL.revokeObjectURL(cached.url);
        }
    });
    imageCache.clear();
};
