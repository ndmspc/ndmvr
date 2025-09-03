import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    chunkSizeWarningLimit: "1M",
  },
  plugins: [react()],
  server: {
    allowedHosts: true,
  },
  optimizeDeps: {
    exclude: ['gl > gl']
  }
})
