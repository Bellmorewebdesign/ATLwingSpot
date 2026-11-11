import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { canonicalRedirect } from './data/routes'

// Design system first: tokens + base must be emitted BEFORE component styles
// so component rules of equal specificity win the cascade.
import './styles/index.css'
import App from './App'

// Old "#/" links (atlwingspot.com/#/menu) still arrive from shares, bookmarks
// and search results. Move them to the real path (/menu/) before the router
// reads the URL, replacing the history entry so Back does not bounce through
// the old address. Plain in-page anchors (#main, #request) are left alone.
const { pathname, search, hash } = window.location
const target = canonicalRedirect(pathname, search, hash)
if (target) window.history.replaceState(null, '', target)

const app = (
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)

/*
 * Every page file already contains that page's HTML (the build prerenders it,
 * see scripts/prerender-pages.mjs), so normally React just attaches to what is
 * there ("hydrate").
 *
 * Two cases where the HTML in the file is not the page being shown, and React
 * renders from scratch instead:
 *   - the URL was just moved (an old "#/menu" link landed on the home page's
 *     file but should show the menu);
 *   - the URL has a query (?cat=wings), which the prerendered file knows
 *     nothing about.
 * The same goes for a file with nothing in #root (the dev server).
 */
const root = document.getElementById('root')
if (root.hasChildNodes() && !target && !window.location.search) {
  ReactDOM.hydrateRoot(root, app)
} else {
  ReactDOM.createRoot(root).render(app)
}
