import { useEffect } from 'react'
import { SITE_NAME, pageTitle, canonicalUrl } from '../data/routes'

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

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!href) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * Per-page document head.
 *
 * Pages pass their entry from data/routes.js (`page`), which is the same data
 * the build uses to write each page's static HTML, so what a crawler reads
 * before JavaScript runs and what this sets afterwards always agree. The
 * not-found page passes a title and description directly and gets no
 * canonical URL.
 */
export function Seo({ page, title, description }) {
  const full = page ? pageTitle(page) : title ? `${title} | ${SITE_NAME}` : pageTitle(null)
  const desc = page ? page.description : description
  const canonical = page ? canonicalUrl(page.path) : null

  useEffect(() => {
    document.title = full
    if (desc) {
      setMeta('name', 'description', desc)
      setMeta('property', 'og:description', desc)
      setMeta('name', 'twitter:description', desc)
    }
    setMeta('property', 'og:title', full)
    setMeta('name', 'twitter:title', full)
    setCanonical(canonical)
    if (canonical) setMeta('property', 'og:url', canonical)
  }, [full, desc, canonical])

  return null
}
