import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Cesium ships large static assets (Workers, Assets, Widgets, ThirdParty).
// They are copied to /public/cesium by scripts/copy-cesium.mjs (pre-dev / pre-build)
// and served from CESIUM_BASE_URL = '/cesium/' (set in src/lib/cesium.js).
// Serves /api/gfw-alerts in dev with the key from .env.local (GFW_API_KEY);
// on Vercel the same handler runs from api/gfw-alerts.js.
function gfwDevApi(apiKey) {
  return {
    name: 'gfw-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/gfw-alerts', async (req, res) => {
        const { handler } = await import('./server/gfwAlerts.js')
        return handler(req, res, apiKey)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), gfwDevApi(loadEnv(mode, process.cwd(), '').GFW_API_KEY)],
  build: {
    chunkSizeWarningLimit: 4000,
  },
}))
