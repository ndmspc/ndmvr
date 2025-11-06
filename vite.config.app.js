import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  build: {
    chunkSizeWarningLimit: "1M",
  },
  plugins: [react({
    babel: {
      plugins: ['babel-plugin-react-compiler'],
    },
  })],
  server: {
    allowedHosts: true,
  },
  optimizeDeps: {
    exclude: ['gl > gl']
  }
})
