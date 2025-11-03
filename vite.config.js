import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
    base: mode === 'production' ? '/ndmvr-r3f/' : '/',
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/lib/index.jsx'),
            name: 'Ndmvr r3f React Library Vite',
            fileName: (format) => `ndmvr-r3f.${format}.js`
        },
        rollupOptions: {
            external: [
                'react',
                'react-dom',
                'react-router-dom',
                'aframe',
                'three',
                'jsroot',
                '@ndmspc/ndmvr-aframe',
                '@react-three/fiber',
                '@react-three/drei',
                '@react-three/xr',
                '@react-three/uikit',
                '@react-three/uikit-apfel',
                '@react-three/uikit-default'
            ],
            output: {
                globals: {
                    react: 'React'
                },
                inlineDynamicImports: true
            }
        }
    },
    plugins: [react()],
    optimizeDeps: {
        exclude: ['gl > gl']
    }
}))
