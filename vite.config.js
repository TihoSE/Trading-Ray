/**
 * Vite bundles and serves the app; React does not. The React plugin compiles
 * JSX, and Tailwind 4 runs as a Vite plugin. `vite build` emits static files
 * for Vercel. In dev, the same /api/finnhub route as the Vercel function runs
 * here so the browser never sees the market data key.
 */
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import finnhubHandler from './api/finnhub.js' // same handler Vercel runs

function finnhubDevProxy() {
  return {
    name: 'finnhub-dev-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.originalUrl || req.url || ''
        if (!url.startsWith('/api/finnhub')) {
          next()
          return
        }
        req.url = url
        Promise.resolve(finnhubHandler(req, res)).catch(next)
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  process.env.FINNHUB_SECRET_KEY =
    env.FINNHUB_SECRET_KEY || env.VITE_FINNHUB_API_KEY || process.env.FINNHUB_SECRET_KEY || ''

  return {
    plugins: [finnhubDevProxy(), react(), tailwindcss()],
  }
})
