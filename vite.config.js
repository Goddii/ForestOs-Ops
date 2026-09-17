import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Cesium ships large static assets (Workers, Assets, Widgets, ThirdParty).
// They are copied to /public/cesium by scripts/copy-cesium.mjs (pre-dev / pre-build)
// and served from CESIUM_BASE_URL = '/cesium/' (set in src/lib/cesium.js).
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 4000,
  },
})
