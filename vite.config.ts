import { resolve, dirname } from "path";
import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import dts from "vite-plugin-dts";
import { fileURLToPath } from "url";

// Get the current file's URL
const __filename = fileURLToPath(import.meta.url);
// Get the current directory's path
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => ({
    base: mode === "production" ? "/ndmvr/" : "/",
    build: {
        chunkSizeWarningLimit: 1000,
        lib: {
            entry: resolve(__dirname, "src/lib/index.tsx"),
            name: "NDMVR R3F React Library Vite",
            // Build only ESM to avoid generating a UMD bundle that requires
            // providing global names for many subpath externals (react/jsx-runtime, etc.)
            formats: ['es'],
            fileName: (format) => `ndmvr.${format}.js`,
        },
        rollupOptions: {
            // Treat important peer and runtime deps (and their subpaths) as external so
            // they are not bundled into the library. Use regexes to cover subpath imports
            // like `react/jsx-runtime` or `react/cjs/*` which otherwise leak CJS shims.
            external: (id) => {
                return !!id && (
                    /^react($|\/)/.test(id) ||
                    /^react-dom($|\/)/.test(id) ||
                    /^three($|\/)/.test(id) ||
                    /^@ndmspc\/ndmvr-core($|\/)/.test(id) ||
                    /^@react-three\//.test(id) ||
                    /^@pmndrs\/uikit($|\/)/.test(id) ||
                    /^jsroot($|\/)/.test(id)
                );
            },
            output: {
                globals: {
                    react: "React",
                    three: "THREE",
                    jsroot: "JSROOT",
                    "@ndmspc/ndmvr-core": "ndmvrAframe",
                    "@pmndrs/uikit": "uikit",
                    "@react-three/fiber": "fiber",
                    "@react-three/drei": "drei",
                    "@react-three/xr": "xr",
                    "@react-three/uikit": "uikit$1",
                    "@react-three/uikit-default": "uikitDefault",
                    "@react-three/uikit-lucide": "uikitLucide",
                    "@react-three/uikit-horizon": "uikitHorizon",
                }
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
        }),
    ],
    resolve: {
        dedupe: ["three"],
    },
    optimizeDeps: {
        exclude: ["gl > gl", "@resvg/resvg-js"],
    },
}));
