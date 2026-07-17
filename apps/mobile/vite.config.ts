import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './',
  envDir: path.resolve(__dirname, '../web'),
  publicDir: path.resolve(__dirname, '../web/public'),
  resolve: {
    alias: {
      '@pos/core': path.resolve(__dirname, '../../packages/core/src'),
      '@pos/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@pos/data': path.resolve(__dirname, '../../packages/data/src'),
    },
  },
  build: {
    outDir: 'www',
    emptyOutDir: true,
  },
})
