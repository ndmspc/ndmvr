import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    build: {
        chunkSizeWarningLimit: 1000,
    },
    plugins: [react({
        babel: {
            plugins: ['babel-plugin-react-compiler'],
        },
    })],
    server: {
        host: true,
    },
    optimizeDeps: {
        exclude: ['gl > gl']
    }
})
