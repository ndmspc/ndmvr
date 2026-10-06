import { resolve, dirname } from "path";
import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import dts from "vite-plugin-dts";
import { fileURLToPath } from "url";
import { copyFile, readFile, writeFile } from "node:fs/promises";
import ts from "typescript";

// Get the current file's URL
const __filename = fileURLToPath(import.meta.url);
// Get the current directory's path
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => ({
    base: mode === "production" ? "/ndmvr/" : "/",
    build: {
        chunkSizeWarningLimit: 1000,
        lib: {
            entry: resolve(__dirname, "src/lib/index.ts"),
            name: "NDMVR R3F React Library Vite",
            // The package entry points expose this ESM build.
            formats: ["es"],
            fileName: (format) => `ndmvr.${format}.js`,
        },
        rolldownOptions: {
            // Treat important peer and runtime deps (and their subpaths) as external so
            // they are not bundled into the library. Use regexes to cover subpath imports
            // like `react/jsx-runtime` or `react/cjs/*` which otherwise leak CJS shims.
            external: (id) => {
                return (
                    !!id &&
                    (/^react($|\/)/.test(id) ||
                        /^react-dom($|\/)/.test(id) ||
                        /^three($|\/)/.test(id) ||
                        /^@ndmspc\/ndmvr-core($|\/)/.test(id) ||
                        /^@react-three\//.test(id) ||
                        /^@pmndrs\/uikit($|\/)/.test(id) ||
                        /^jsroot($|\/)/.test(id))
                );
            },
        },
    },
    plugins: [
        react(),
        babel({
            presets: [reactCompilerPreset()],
        }),
        dts({
            include: ["src/lib", "src/types"],
            insertTypesEntry: true,
            bundleTypes: true,
            beforeWriteFile(filePath, content) {
                // unplugin-dts appends ambient namespaces after Extractor has
                // already bundled component statics. Remove identical copies.
                const source = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
                const printer = ts.createPrinter();
                const namespaces = source.statements.filter(ts.isModuleDeclaration);
                const isExported = (node: ts.ModuleDeclaration) =>
                    node.modifiers?.some(
                        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
                    );
                const body = (node: ts.ModuleDeclaration) =>
                    node.body && printer.printNode(ts.EmitHint.Unspecified, node.body, source);
                const exported = new Map(
                    namespaces
                        .filter(isExported)
                        .map((node) => [node.name.getText(source), body(node)])
                );
                for (const node of namespaces.reverse()) {
                    if (
                        ts.isIdentifier(node.name) &&
                        node.body &&
                        !isExported(node) &&
                        exported.get(node.name.text) === body(node)
                    ) {
                        content = content.slice(0, node.getStart(source)) + content.slice(node.end);
                    }
                }
                return { content };
            },
            async afterBuild() {
                // Core publishes no types. Keep its existing ambient shim in a
                // separate declaration script, where it declares the module.
                const declarationPath = resolve(__dirname, "dist/ndmvr.d.ts");
                await copyFile(
                    resolve(__dirname, "src/types/ndmvr-core.d.ts"),
                    resolve(__dirname, "dist/ndmvr-core.d.ts")
                );
                const content = await readFile(declarationPath, "utf8");
                await writeFile(
                    declarationPath,
                    `/// <reference path="./ndmvr-core.d.ts" />\n${content}`
                );
            },
        }),
    ],
    resolve: {
        dedupe: ["three"],
    },
    optimizeDeps: {
        exclude: ["gl > gl", "@resvg/resvg-js"],
    },
}));
