// Publish the compiled Vite site (app/dist) to the REPOSITORY ROOT so that
// GitHub Pages "Deploy from a branch → main → /root" serves it directly.
//
// This is intentionally surgical: it only removes the specific build artifacts
// it previously wrote (index.html, 404.html, .nojekyll, sitemap.xml,
// robots.txt, /assets, /static and one folder per page, e.g. /menu,
// /about-us) and then copies the fresh build over. It never touches /app,
// /.git, or anything else at the repo root, so the editable source can never
// be clobbered.

import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { PAGES } from '../src/data/routes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appDir = path.resolve(__dirname, '..')
const repoRoot = path.resolve(appDir, '..')
const distDir = path.join(appDir, 'dist')

// The only paths this script is ever allowed to create/replace at the root:
// the fixed build output, plus the top folder of every page in routes.js.
const PAGE_DIRS = [...new Set(
  Object.values(PAGES).map((p) => p.path.split('/')[1]).filter(Boolean)
)]
const MANAGED = ['index.html', '404.html', '.nojekyll', 'sitemap.xml', 'robots.txt', 'assets', 'static', ...PAGE_DIRS]

// A page folder must never share a name with something that lives in the repo
// for another reason, or step 1 below would delete it.
const PROTECTED = ['app', 'aws', 'images', 'images-web', '.git', 'node_modules']
for (const dir of PAGE_DIRS) {
  if (PROTECTED.includes(dir)) {
    console.error(`\n[publish-to-root] Page folder "/${dir}" would overwrite a source folder. Rename the page path.\n`)
    process.exit(1)
  }
}

function fail(msg) {
  console.error(`\n[publish-to-root] ${msg}\n`)
  process.exit(1)
}

if (!fs.existsSync(distDir)) fail('No build found at app/dist — run "vite build" first.')
for (const dir of PAGE_DIRS) {
  if (!fs.existsSync(path.join(distDir, dir, 'index.html')) && !fs.existsSync(path.join(distDir, dir))) {
    fail(`app/dist/${dir} is missing — run "node scripts/prerender-pages.mjs" after "vite build".`)
  }
}
if (repoRoot === distDir || repoRoot === appDir) fail('Refusing to publish: unsafe root resolution.')

// 1) Remove previously-published artifacts (and only those).
for (const name of MANAGED) {
  const target = path.join(repoRoot, name)
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true })
}

// 2) Copy the fresh build to the repo root.
for (const entry of fs.readdirSync(distDir)) {
  fs.cpSync(path.join(distDir, entry), path.join(repoRoot, entry), { recursive: true })
}

// 3) 404.html comes from scripts/prerender-pages.mjs: the app, marked noindex,
//    served by GitHub Pages with status 404 for any path that has no file.

// 4) Disable Jekyll processing on GitHub Pages.
fs.writeFileSync(path.join(repoRoot, '.nojekyll'), '')

const list = fs.readdirSync(repoRoot).filter((f) => MANAGED.includes(f)).sort()
console.log(`\n[publish-to-root] Published to repo root: ${list.join(', ')}`)
console.log('[publish-to-root] GitHub Pages: Deploy from a branch → main → /root\n')
