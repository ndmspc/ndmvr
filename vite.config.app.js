import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cdn from 'vite-plugin-cdn-import'

export default defineConfig({
  build: {
    chunkSizeWarningLimit: "1M",
  },
  plugins: [
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
    cdn({
      modules: [
        {
          name: 'three',
          var: 'THREE',
          path: 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.173.0/three.core.min.js'
        },
        {
          name: 'jsroot',
          var: 'JSROOT',
          path: 'https://cdn.jsdelivr.net/npm/jsroot@7.10.0/build/jsroot.min.js'
        }
      ]
    })
  ],
  server: {
    allowedHosts: true,
  },
  optimizeDeps: {
    exclude: ['gl > gl']
  }
})