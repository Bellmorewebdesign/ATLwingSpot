import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base keeps every asset + module path working on GitHub Pages
// project sites (served from /<repo>/) AND at a custom domain root.
// HashRouter handles client routing so refreshes never 404.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsInlineLimit: 2048,
  },
})
