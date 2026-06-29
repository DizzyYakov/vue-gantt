import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
// Type declarations are emitted separately by `vue-tsc` (see the `build:types`
// script) so the test/dev pipeline stays free of the api-extractor toolchain.
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // This is a library build; don't copy the dev-only public/ assets into dist.
    copyPublicDir: false,
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      name: 'VueGantt',
      formats: ['es'],
      fileName: 'vue-gantt',
    },
    rollupOptions: {
      external: ['vue', /^date-fns($|\/)/],
      output: {
        globals: {
          vue: 'Vue',
        },
        assetFileNames: assetInfo => {
          if (assetInfo.names?.some(name => name.endsWith('.css'))) {
            return 'gantt.css'
          }
          return '[name][extname]'
        },
      },
    },
  },
})
