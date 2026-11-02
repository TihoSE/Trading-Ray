/**
 * Vite bundles and serves the app; React does not. The React plugin compiles
 * JSX, and Tailwind 4 runs as a Vite plugin. `vite build` emits static files
 * for Vercel. Nothing here is a server runtime.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
