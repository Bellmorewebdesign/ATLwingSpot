// Build-time renderer. `vite build --ssr` compiles this file to
// app/dist-ssr/entry-server.js, and scripts/prerender-pages.mjs calls render()
// once per page to put that page's real HTML inside its index.html. Nothing
// here runs in the browser.
import React from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import App from './App'
import { LOCATION_PAGES } from './data/locations'

// Pages that are not in routes.js because they come from data: one per shop.
// The prerender step writes a file for each and lists them in the sitemap.
export const extraPages = LOCATION_PAGES

export function render(path) {
  return renderToString(
    <React.StrictMode>
      <StaticRouter location={path}>
        <App />
      </StaticRouter>
    </React.StrictMode>
  )
}
