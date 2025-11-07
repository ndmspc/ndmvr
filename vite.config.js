import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url';

// Get the current file's URL
const __filename = fileURLToPath(import.meta.url);
// Get the current directory's path
const __dirname = path.dirname(__filename);

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
            'react', 'react-dom', 'three',
            '@ndmspc/ndmvr-aframe',
            '@react-three/fiber',
            '@react-three/drei',
            '@react-three/xr',
            '@pmndrs/uikit',
            '@react-three/uikit',
            '@react-three/uikit-default',
            '@react-three/uikit-horizon',
            '@react-three/uikit-lucide',
            "jsroot"
        ],
        output: {
        globals: {
          react: 'React'
        },
        inlineDynamicImports: true
      }
    }
  },
  plugins: [react({
    babel: {
      plugins: ['babel-plugin-react-compiler'],
    },
  })],
  optimizeDeps: {
    exclude: ['gl > gl']
  }
}))
