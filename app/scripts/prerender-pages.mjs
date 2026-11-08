// Give every page a real HTML file, so GitHub Pages answers each public URL
// with HTTP 200 and that page's own title, description and canonical.
//
// The site is one React app, but GitHub Pages is a plain file server: it only
// returns 200 for a path if a file exists there. Without this step /menu/ would
// fall through to 404.html (status 404, even though the app would then draw the
// menu), which is what search engines and link checkers see. So after
// `vite build` this writes, from app/src/data/routes.js:
//
//   dist/<path>/index.html  for every page (menu/index.html, about-us/index.html,
//                           catering/book/index.html, ...). Same app bundle,
//                           with that page's <title>, description, canonical,
//                           og:url and og/twitter title and description baked in.
//   dist/404.html           the app again, for unknown paths: GitHub Pages serves
//                           it with status 404 and the app shows its not-found
//                           page. Marked noindex, with no canonical.
//   dist/sitemap.xml        every page's canonical URL.
//   dist/robots.txt         points crawlers at the sitemap.
//
// It refuses to run if a tag it needs to rewrite is missing or repeated, so a
// change to index.html can't quietly ship every page with the home page's
// title.

import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { PAGES, SITE_ORIGIN, pageTitle, canonicalUrl } from '../src/data/routes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, '..', 'dist')
const template = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8')

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function fail(msg) {
  console.error(`\n[prerender-pages] ${msg}\n`)
  process.exit(1)
}

// Replace exactly one match of `re`, or stop the build.
function replaceOne(html, re, replacement, what) {
  const hits = html.match(new RegExp(re.source, 'g')) || []
  if (hits.length !== 1) fail(`expected exactly one ${what} in dist/index.html, found ${hits.length}`)
  return html.replace(re, replacement)
}

function render({ title, description, canonical, notFound = false }) {
  let html = template
  html = replaceOne(html, /<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`, '<title>')
  for (const [attr, key, value] of [
    ['name', 'description', description],
    ['property', 'og:title', title],
    ['property', 'og:description', description],
    ['name', 'twitter:title', title],
    ['name', 'twitter:description', description],
  ]) {
    html = replaceOne(
      html,
      new RegExp(`<meta ${attr}="${key}" content="[^"]*"\\s*/?>`),
      `<meta ${attr}="${key}" content="${esc(value)}" />`,
      `<meta ${attr}="${key}">`
    )
  }
  const canonicalTag = /<link rel="canonical" href="[^"]*"\s*\/?>\n?\s*/
  const ogUrlTag = /<meta property="og:url" content="[^"]*"\s*\/?>\n?\s*/
  if (notFound) {
    html = replaceOne(html, canonicalTag, '<meta name="robots" content="noindex" />\n    ', 'canonical link')
    html = replaceOne(html, ogUrlTag, '', 'og:url')
  } else {
    html = replaceOne(html, canonicalTag, `<link rel="canonical" href="${esc(canonical)}" />\n    `, 'canonical link')
    html = replaceOne(html, ogUrlTag, `<meta property="og:url" content="${esc(canonical)}" />\n    `, 'og:url')
  }
  return html
}

// Paths must be absolute and end in "/" so they map onto <dir>/index.html.
const pages = Object.entries(PAGES)
for (const [key, page] of pages) {
  if (!/^\/([a-z0-9-]+\/)*$/.test(page.path)) fail(`PAGES.${key}.path "${page.path}" must look like /a/b/`)
}

const written = []
for (const [, page] of pages) {
  const html = render({
    title: pageTitle(page),
    description: page.description,
    canonical: canonicalUrl(page.path),
  })
  const file = path.join(distDir, page.path, 'index.html')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, html)
  written.push(page.path)
}

fs.writeFileSync(
  path.join(distDir, '404.html'),
  render({
    title: pageTitle({ title: 'Page not found' }),
    description: 'That page doesn’t exist. Head back to the wings.',
    notFound: true,
  })
)

const urls = pages
  .map(([, p]) => `  <url><loc>${esc(canonicalUrl(p.path))}</loc></url>`)
  .join('\n')
fs.writeFileSync(
  path.join(distDir, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
)
fs.writeFileSync(path.join(distDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`)

console.log(`[prerender-pages] wrote ${written.length} pages: ${written.join(' ')}`)
console.log('[prerender-pages] wrote 404.html, sitemap.xml, robots.txt')
