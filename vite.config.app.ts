import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1000,
    target: "esnext",
    minify: false,
    sourcemap: true,

    rolldownOptions: {
      external: (id) => {
        return (
          id === "@resvg/resvg-js" ||
          id.startsWith("@resvg/resvg-js/")
        );
      },
    },
  },

  plugins: [
    react(),
    babel({
      presets: [reactCompilerPreset()],
    }),
  ],

  server: {
    host: true,
  },

  resolve: {
    dedupe: ["three"],
  },

  optimizeDeps: {
    exclude: ["gl > gl", "@resvg/resvg-js"],
  },
});
