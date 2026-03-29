import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1000,
    target: "esnext", // smaller output, modern browsers
    minify: false, // faster minification
    sourcemap: true, // disable source maps in production
  },
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler", {}]],
      },
    }),
  ],
  server: {
    host: true,
  },
  optimizeDeps: {
    exclude: ["gl > gl"],
  },
});