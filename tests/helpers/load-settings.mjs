import { build } from "esbuild";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Bundle only local TypeScript; tests keep the installed Core and Ajv contracts.
const result = await build({
    entryPoints: [
        fileURLToPath(
            new URL(
                "../../src/lib/components/ui/shared/menu/panels/settings/settings-helpers.ts",
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
const bundleUrl = new URL(`settings-${process.pid}.mjs`, cacheDirectory);
await mkdir(cacheDirectory, { recursive: true });
await writeFile(bundleUrl, result.outputFiles[0].text);
let settings;
try {
    settings = await import(bundleUrl.href);
} finally {
    await unlink(bundleUrl);
}

export const {
    buildEnvironmentFromSettings,
    buildSettingsImport,
    createValidator,
    flattenSchema,
    getSettingsDefaults,
    readSettings,
} = settings;
