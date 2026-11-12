import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  // maplibre-gl spawns its worker via `new URL('maplibre-gl-worker.mjs', import.meta.url)`.
  // Pre-bundling moves the module into .vite/deps, where that file does not exist (404,
  // "Worker failed to load"), so serve it straight from node_modules in dev.
  optimizeDeps: { exclude: ['maplibre-gl'] },
  test: { environment: 'jsdom' },
})
