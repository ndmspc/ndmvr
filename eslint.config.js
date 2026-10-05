import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
    globalIgnores(["dist"]),
    {
        files: ["src/**/*.{js,jsx,ts,tsx}"],
        extends: [
            js.configs.recommended,
            tseslint.configs.recommended,
            reactHooks.configs.flat.recommended,
            reactRefresh.configs.vite,
        ],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
        },
    },
    {
        files: ["vite.config.ts", "vite.config.app.ts"],
        extends: [js.configs.recommended, tseslint.configs.recommended],
        languageOptions: {
            globals: globals.node,
        },
    },
    {
        files: ["eslint.config.js", "tests/**/*.mjs"],
        extends: [js.configs.recommended],
        languageOptions: {
            globals: globals.node,
        },
    },
    {
        files: ["tests/**/*.mjs"],
        languageOptions: {
            // Mounted test harnesses install these jsdom globals.
            globals: { window: "readonly", document: "readonly" },
        },
    },
]);
