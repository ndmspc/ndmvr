import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/ x
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
  },
});
