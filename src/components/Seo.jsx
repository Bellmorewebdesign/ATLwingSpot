import { useEffect } from 'react'

const BASE_TITLE = 'ATL Wing Spot'

function setMeta(attr, key, content) {
  if (!content) return
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

// Per-page document head control without a routing/SSR dependency.
export function Seo({ title, description, suffix = true }) {
  useEffect(() => {
    const full = title
      ? suffix ? `${title} — ${BASE_TITLE}` : title
      : `${BASE_TITLE} — Stay Saucy.`
    document.title = full
    if (description) {
      setMeta('name', 'description', description)
      setMeta('property', 'og:description', description)
      setMeta('name', 'twitter:description', description)
    }
    setMeta('property', 'og:title', full)
    setMeta('name', 'twitter:title', full)
  }, [title, description, suffix])

  return null
}
