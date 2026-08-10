// Resolve a public asset path against Vite's BASE_URL so images work both
// at a domain root and under a GitHub Pages /<repo>/ subpath.
const BASE = import.meta.env.BASE_URL || '/'

export function asset(path) {
  return BASE + String(path).replace(/^\/+/, '')
}
