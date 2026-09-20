# ATL Wing Spot — website

A bold, animated, mobile-first site for **ATL Wing Spot**, built with React + Vite and
deployed straight from **GitHub Pages (Deploy from a branch → `main` → `/root`)** with no
GitHub Actions.

This site is ATL Wing Spot's own site, so its copy speaks in the first person and never
defers to some other "official" ATL page.

Ordering is not a checkout. Every ordering control opens our **Snackpass** ordering page
(`https://order.snackpass.co/atlwingspot`) in a new tab, from the single `ORDER_URL`
constant in `app/src/data/site.js`.

The contact, catering and franchise forms are front-end only. There is no server, so a
valid submit opens a notice that says the form is not connected yet and points at
Instagram. Nothing on the site claims a message was delivered.

---

## Repository layout

```
/                     ← what GitHub Pages serves (compiled, committed)
  index.html          ← built entry
  404.html            ← SPA fallback (copy of index.html)
  .nojekyll           ← disables Jekyll on Pages
  assets/             ← brand + food images (passthrough)
  static/             ← hashed JS / CSS / fonts
  images-web/         ← source images the menu generator reads
  menu-items.json     ← ATL's published menu listing, the menu's source of truth
  app/                ← the editable Vite source (NOT the served entry)
    index.html        ← dev entry
    src/…             ← components, pages, data, hooks, styles
    public/…          ← source assets
    scripts/…         ← menu generator + asset preparation
    vite.config.js
```

The compiled site lives at the **repo root** so Pages can serve `main:/root` directly. The
editable source lives in **`/app`**, so a build can never overwrite the source entry.

---

## Develop & build

```bash
cd app
npm ci
npm run dev      # local dev server (http://localhost:5173)
npm run build    # compiles app/dist, then publishes the site to the repo root
```

`npm run build` runs `vite build` and then `scripts/publish-to-root.mjs`, which copies the
compiled output to the repository root (replacing only `index.html`, `404.html`,
`.nojekyll`, `/assets`, `/static`). Commit the updated root files to deploy.

### Data and asset scripts

| Command | What it does |
| --- | --- |
| `npm run menu:data` | Regenerates `app/src/data/menu.js` and `app/public/assets/menu/` from `menu-items.json`. |
| `python3 app/scripts/process-client-photos.py` | Prepares the September client photo pack for the web: keyed cut-outs into `app/public/assets/food/client-refresh/`, 5:4 menu frames into `images-web/`. Needs `pillow` and `numpy`. |
| `python3 app/scripts/make-favicon.py` | Rebuilds the favicon set in `app/public/assets/brand/` from the official logo. Needs `pillow` and `numpy`. |

The menu generator holds a `PHOTO_OVERRIDES` table, so regenerating the menu keeps the
client photography instead of falling back to the older scraped shots.

---

## Deploy on GitHub Pages

1. Push to `main` (the root already contains the compiled site).
2. GitHub → **Settings → Pages → Build and deployment**
   - **Source:** Deploy from a branch
   - **Branch:** `main`
   - **Folder:** `/ (root)`
3. That's it, no Actions workflow needed.

Routing uses **HashRouter** (`/#/menu`, `/#/flavors`, …) and asset paths are relative, so
refreshes never 404 and everything works under the project subpath (`/<repo>/`) or a
custom domain root.

---

## Design system

Built from ATL's own physical brand rather than a generic dark-restaurant palette:

- **Cream is the ground.** Every ATL product photo is shot on a studio white, so a cream
  page lets the food merge into the layout instead of floating on black with visible edges.
- **Chapter surfaces.** Each section sets `--bg` / `--fg` / `--line` and its two accent
  tones via one class (`.ch-cream`, `.ch-warm`, `.ch-dark`, `.ch-cyan`, `.ch-orange`,
  `.ch-paper`). Scrolling moves through colour chapters instead of one long dark page. The
  accents are chapter-level because ATL's display cyan and orange wash out on cream and
  need their deeper tones there.
- **Word-stripe** (`WordStripe`) reproduces the repeating WINGS · TENDERS · MUNCHIES ·
  WAFFLES · SHAKES print on ATL's real cyan takeout box, used as the structural divider.
  The words stay white: ATL orange on ATL cyan measures 1.26:1 and goes muddy even at
  display size.
- **Seal** (`.seal`) echoes the round "SAUCE IT UP!" stamp on their basket paper.
- **Pill geometry** for buttons and tags, taken from the logo's `atl` lozenge, which is
  also the favicon.
- Type: Anton display / Manrope UI, bundled via `@fontsource` (no external requests).

Composition is art-directed per section: centred hero, group-shot handoff, horizontal
crave track, right-led story figures, split locations, full-bleed catering.

### Photography

Feature slots place food with `object-fit: contain` over a coloured surface, so those
shots are real cut-outs: the studio ground is measured from the border, alpha is keyed off
distance from it, and every edge pixel is un-premultiplied so no pale fringe survives.
Menu cards use `object-fit: cover` in a 5:4 box on white, so those get an opaque 5:4 crop
framed around the food. Only the hero image and the header logo load eagerly; everything
else is lazy, with intrinsic `width`/`height` on every `<img>`.

### Signature interactions

1. **Hero** — the headline is painted twice and the front copy is clipped at SAUCY.'s cap
   line, so the wings break forward through the wide tracking of STAY while the second
   line stays perfectly crisp.
2. **Flavor stage** — heat and wet/dry selections re-colour the entire section.
3. **Crave track** — full-bleed horizontal product panels with snap + arrow controls.
4. **Crew calculator** — an oversized count-in number.

Motion is CSS + IntersectionObserver + rAF only, and every piece has a
`prefers-reduced-motion` path. No animation library.

## Notes on content

Copy and figures use ATL's own materials and public press (QSR Magazine, Long Island local
press) only. Sauce names are real ATL flavours, shown as a featured selection of the board.

**The customer-facing menu shows no prices anywhere**, by design: name, description, photo
and category only, because prices vary by location. The franchise page speaks as the
franchisor, in the first person, and carries our published investment figures under an FDD
disclaimer with no earnings claims. The figures on that page are unverified against the
current FDD: see the NEEDS CONFIRMATION block at the top of `app/src/pages/Franchise.jsx`.

No invented reviews, follower counts, handles, hours, awards or location totals. Distances
are not faked: "use my location" hands off to our Snackpass ordering page, which does the
real lookup.
