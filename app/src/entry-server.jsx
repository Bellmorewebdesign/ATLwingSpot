// Build-time renderer. `vite build --ssr` compiles this file to
// app/dist-ssr/entry-server.js, and scripts/prerender-pages.mjs calls render()
// once per page to put that page's real HTML inside its index.html. Nothing
// here runs in the browser.
import React from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import App from './App'

export function render(path) {
  return renderToString(
    <React.StrictMode>
      <StaticRouter location={path}>
        <App />
      </StaticRouter>
    </React.StrictMode>
  )
}
