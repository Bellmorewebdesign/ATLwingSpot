// Publish the compiled Vite site (app/dist) to the REPOSITORY ROOT so that
// GitHub Pages "Deploy from a branch → main → /root" serves it directly.
//
// This is intentionally surgical: it only removes the specific build artifacts
// it previously wrote (index.html, 404.html, .nojekyll, /assets, /static) and
// then copies the fresh build over. It never touches /app, /.git, or anything
// else at the repo root, so the editable source can never be clobbered.

import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appDir = path.resolve(__dirname, '..')
const repoRoot = path.resolve(appDir, '..')
const distDir = path.join(appDir, 'dist')

// The only paths this script is ever allowed to create/replace at the root.
const MANAGED = ['index.html', '404.html', '.nojekyll', 'assets', 'static']

function fail(msg) {
  console.error(`\n[publish-to-root] ${msg}\n`)
  process.exit(1)
}

if (!fs.existsSync(distDir)) fail('No build found at app/dist — run "vite build" first.')
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

// 3) SPA safety net: serve the app for any unknown path (HashRouter takes over).
fs.copyFileSync(path.join(repoRoot, 'index.html'), path.join(repoRoot, '404.html'))

// 4) Disable Jekyll processing on GitHub Pages.
fs.writeFileSync(path.join(repoRoot, '.nojekyll'), '')

const list = fs.readdirSync(repoRoot).filter((f) => MANAGED.includes(f)).sort()
console.log(`\n[publish-to-root] Published to repo root: ${list.join(', ')}`)
console.log('[publish-to-root] GitHub Pages: Deploy from a branch → main → /root\n')
