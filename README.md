# ATL Wing Spot — Website Redesign Concept

A bold, animated, mobile-first redesign concept for **ATL Wing Spot** — built with
React + Vite and deployable directly from **GitHub Pages (Deploy from a branch → `main` → `/root`)**
with **no GitHub Actions required**.

Ordering is intentionally **not** a real checkout — every "Order" action links out to
ATL's live ordering platform (order.online). Contact / catering / franchise forms are
polished front-end mockups that show a "Concept Preview" notice on submit.

---

## Repository layout

```
/                     ← what GitHub Pages serves (compiled, committed)
  index.html          ← built entry
  404.html            ← SPA fallback (copy of index.html)
  .nojekyll           ← disables Jekyll on Pages
  assets/             ← brand + food images (passthrough)
  static/             ← hashed JS / CSS / fonts
  app/                ← the editable Vite source (NOT the served entry)
    index.html        ← dev entry
    src/…             ← components, pages, data, hooks, styles
    public/…          ← source assets
    scripts/publish-to-root.mjs
    vite.config.js
```

The compiled site lives at the **repo root** so Pages can serve `main:/root` directly.
The editable source lives in **`/app`**, so a build can never overwrite the source entry.

---

## Develop & build

```bash
cd app
npm install
npm run dev      # local dev server (http://localhost:5173)
npm run build    # compiles app/dist, then publishes the site to the repo root
```

`npm run build` runs `vite build` and then `scripts/publish-to-root.mjs`, which copies
the compiled output to the repository root (replacing only `index.html`, `404.html`,
`.nojekyll`, `/assets`, `/static`). Commit the updated root files to deploy.

---

## Deploy on GitHub Pages

1. Push to `main` (the root already contains the compiled site).
2. GitHub → **Settings → Pages → Build and deployment**
   - **Source:** Deploy from a branch
   - **Branch:** `main`
   - **Folder:** `/ (root)`
3. That's it — no Actions workflow needed.

Routing uses **HashRouter** (`/#/menu`, `/#/flavors`, …) and asset paths are relative,
so refreshes never 404 and everything works under the project subpath
(`/<repo>/`) or a custom domain root.

---

## Tech

- React 18 + React Router (HashRouter)
- Vite 5 (`base: './'`, output published to repo root)
- Motion: CSS + IntersectionObserver + rAF (respects `prefers-reduced-motion`)
- Fonts bundled via `@fontsource` (Anton display, Manrope body)

## Notes on content

All copy, figures, and claims use ATL-supplied material only. Menu pricing is shown
with a "may vary by location" note; franchise figures are labeled as ATL-published and
informational (subject to the current FDD); no reviews, handles, or press outlets are
fabricated. Store hours are intentionally not hardcoded.
