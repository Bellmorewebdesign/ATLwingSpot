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

## Design system

Built from ATL's own physical brand rather than a generic dark-restaurant palette:

- **Cream is the ground.** Every ATL product photo is shot on white, so a cream page
  lets the food merge into the layout instead of floating on black with visible edges.
- **Chapter surfaces.** Each section sets `--bg` / `--fg` / `--line` via one class
  (`.ch-cream`, `.ch-dark`, `.ch-cyan`, `.ch-orange`, `.ch-paper`). Scrolling moves
  through colour chapters instead of one long dark page.
- **Word-stripe** (`WordStripe`) reproduces the repeating WINGS · TENDERS · MUNCHIES
  print on ATL's real cyan takeout box, used as the structural divider.
- **Seal** (`.seal`) echoes the round "SAUCE IT UP!" stamp on their basket paper.
- **Pill geometry** for buttons and tags, taken from the logo's `atl` lozenge.
- Type: Anton display / Manrope UI, bundled via `@fontsource` (no external requests).

Composition is art-directed per section — centred hero, horizontal crave track,
right-led story figures, split locations, full-bleed catering — rather than repeating
one eyebrow/headline/paragraph/button stack.

### Signature interactions

1. **Hero** — the headline is painted twice and the upper copy is clipped, so the wing
   basket is wedged *inside* the letterforms.
2. **Flavor stage** — heat and wet/dry selections re-colour the entire section.
3. **Crave track** — full-bleed horizontal product panels with snap + arrow controls.
4. **Crew calculator** — an oversized count-in number.

Motion is CSS + IntersectionObserver + rAF only, and every piece has a
`prefers-reduced-motion` path. No animation library.

## Notes on content

Copy and figures use ATL's own materials and public press (QSR Magazine, Long Island
local press) only. Sauce names are real ATL flavours, shown as a featured selection of
the 30+ on the board. Menu prices carry a "varies by location" note; franchise figures
are labelled as ATL-published with an FDD disclaimer and no earnings claims. No invented
reviews, follower counts, handles, hours, or location totals. Distances are not faked —
"use my location" hands off to ATL's ordering site, which does the real lookup.
