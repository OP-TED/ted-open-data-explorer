import vue from '@vitejs/plugin-vue'

import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  base: './', // Ensure assets use relative paths
  server: {
    proxy: {
      '/sparql': {
        target: 'https://publications.europa.eu/webapi/rdf/sparql',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/sparql/, ''),
      },
      '/ted-api': {
        target: 'https://api.ted.europa.eu/v3',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [
    vue(), nodePolyfills({
      include: ['path', 'stream', 'util'], exclude: ['http'], globals: {
        Buffer: true, global: true, process: true,
      }, overrides: {
        fs: 'memfs',
      }, protocolImports: true,
    })],
})

