import { resolve, dirname } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import { fileURLToPath } from "url";

// Get the current file's URL
const __filename = fileURLToPath(import.meta.url);
// Get the current directory's path
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => ({
    base: mode === "production" ? "/ndmvr-r3f/" : "/",
    build: {
        chunkSizeWarningLimit: 1000,
        lib: {
            entry: resolve(__dirname, "src/lib/index.tsx"),
            name: "Ndmvr r3f React Library Vite",
            fileName: (format) => `ndmvr-r3f.${format}.js`,
        },
        rollupOptions: {
            external: [
                "react",
                "react-dom",
                "three",
                "@ndmspc/ndmvr-core",
                "@react-three/fiber",
                "@react-three/drei",
                "@react-three/xr",
                "@pmndrs/uikit",
                "@react-three/uikit",
                "@react-three/uikit-default",
                "@react-three/uikit-horizon",
                "@react-three/uikit-lucide",
                "jsroot",
            ],
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
                },
                inlineDynamicImports: true,
            },
        },
    },
    plugins: [
        react({
            babel: {
                plugins: ["babel-plugin-react-compiler"],
            },
        }),
        dts({
            include: ["src/lib"],
            insertTypesEntry: true,
            rollupTypes: true,
        }),
    ],
    optimizeDeps: {
        exclude: ["gl > gl"],
    },
}));
