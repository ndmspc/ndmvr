import { build } from "esbuild";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Keep installed Core/Three.js dependencies external while loading local TypeScript.
const result = await build({
    entryPoints: [
        fileURLToPath(
            new URL(
                "../../src/lib/components/scene/histogram-wrapper/bounding-box-helpers.ts",
                import.meta.url
            )
        ),
    ],
    bundle: true,
    packages: "external",
    platform: "node",
    format: "esm",
    write: false,
});

const cacheDirectory = new URL("../../node_modules/.cache/ndmvr-tests/", import.meta.url);
const bundleUrl = new URL(`bounds-${process.pid}.mjs`, cacheDirectory);
await mkdir(cacheDirectory, { recursive: true });
await writeFile(bundleUrl, result.outputFiles[0].text);
let bounds;
try {
    bounds = await import(bundleUrl.href);
} finally {
    await unlink(bundleUrl);
}

export const { getShiftScaleStep } = bounds;
