import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The editable app lives in /app. `npm run build` compiles to /app/dist,
// then scripts/publish-to-root.mjs copies the compiled site to the REPO ROOT
// so GitHub Pages can serve `main:/root` directly (no Actions needed).
//
// base: '/'   -> every asset/script URL is root-relative (/static/..., /assets/...).
//               Pages live at real nested paths (/menu/, /catering/book/), where
//               a relative "./static/x.js" would resolve to /menu/static/x.js and
//               404. The site is served from the root of its own domain
//               (atlwingspot.com, see /CNAME), so "/" is correct. Serving it
//               under a /<repo>/ subpath again would need this changed.
// assetsDir: 'static' -> hashed JS/CSS live in /static, keeping them clearly
//               separate from the passthrough /assets (brand + food images).
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'static',
    emptyOutDir: true,
    assetsInlineLimit: 2048,
  },
})
