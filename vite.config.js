import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import postcss from 'rollup-plugin-postcss';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    base: mode === 'production' ? '/ndmvr-r3f/' : '/',
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/lib/index.jsx'),
            name: 'Ndmvr r3f React Library Vite',
            fileName: (format) => `ndmvr-r3f.${format}.js`
        },
        rollupOptions: {
            // externalize deps that shouldn't be bundled
            // into your library
            external: [
                'react',
                'react-dom',
                'react-router-dom',
                'aframe',
                'three',
                'jsroot',
                '@ndmspc/ndmvr-aframe'
            ],
            output: {
                // Provide global variables to use in the UMD build
                // for externalized deps
                globals: {
                    react: 'React'
                },
                inlineDynamicImports: true
            }
        }
    },
    plugins: [
        react(),
        postcss({
            inject: true,  
            extract: false, 
            minimize: true,
        }),
    ],

    optimizeDeps: {
        exclude: ['gl > gl']
    },
    resolve: {
        alias: {
        "@ndmspc/ndmvr-r3f": path.resolve(__dirname, "./dist/ndmvr-r3f.es.js"),
        },
    },
    

}));
