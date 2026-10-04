import { build } from "esbuild";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Keep dependencies external so tests and the adapter use the same real Core
// singleton. Bundle local TypeScript together so the store is shared too.
const result = await build({
    entryPoints: [
        fileURLToPath(new URL("../../src/lib/stores/histogramWorkspace/index.ts", import.meta.url)),
    ],
    bundle: true,
    packages: "external",
    platform: "node",
    format: "esm",
    write: false,
});

// A file beneath the checkout can resolve external packages; a data URL cannot.
// This ignored scratch file is removed once the module has been loaded.
const cacheDirectory = new URL("../../node_modules/.cache/ndmvr-tests/", import.meta.url);
const bundleUrl = new URL(`workspace-${process.pid}.mjs`, cacheDirectory);
await mkdir(cacheDirectory, { recursive: true });
await writeFile(bundleUrl, result.outputFiles[0].text);
let workspace;
try {
    workspace = await import(bundleUrl.href);
} finally {
    await unlink(bundleUrl);
}

export const { useHistogramWorkspace, retainHistogramWorkspace } = workspace;
