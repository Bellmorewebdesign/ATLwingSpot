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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
