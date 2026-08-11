import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The editable app lives in /app. `npm run build` compiles to /app/dist,
// then scripts/publish-to-root.mjs copies the compiled site to the REPO ROOT
// so GitHub Pages can serve `main:/root` directly (no Actions needed).
//
// base: './'  -> every asset/script URL is relative, so the site works both
//               under a project-page subpath (/<repo>/) and at a domain root.
// assetsDir: 'static' -> hashed JS/CSS live in /static, keeping them clearly
//               separate from the passthrough /assets (brand + food images).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'static',
    emptyOutDir: true,
    assetsInlineLimit: 2048,
  },
})
