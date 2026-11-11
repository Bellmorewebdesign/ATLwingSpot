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
  index.html          ← built entry (the home page)
  menu/ flavors/ …    ← one folder per page, each with its own index.html (built)
  404.html            ← the app's not-found page, served with status 404 (built)
  sitemap.xml         ← every page's canonical URL (built)
  robots.txt          ← points crawlers at the sitemap (built)
  CNAME               ← custom domain: atlwingspot.com
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

`npm run build` runs four steps:

1. `vite build` compiles the app to `app/dist`.
2. `vite build --ssr` compiles the same app for Node, to `app/dist-ssr` (not committed).
3. `scripts/prerender-pages.mjs` writes a real `index.html` for every page in
   `app/src/data/routes.js` (`menu/index.html`, `about-us/index.html`, …). Each file has
   that page's own title, description and canonical URL **and its finished content**: the
   script runs the app once per page and puts the resulting HTML inside the file. It also
   writes `404.html`, `sitemap.xml` and `robots.txt`.
4. `scripts/publish-to-root.mjs` copies the result to the repository root, replacing only
   what the build owns: `index.html`, `404.html`, `.nojekyll`, `sitemap.xml`, `robots.txt`,
   `/assets`, `/static` and the page folders.

Commit the updated root files to deploy.

## The franchising form

The franchising form is the one form on the site that actually sends something.
It posts to an API Gateway endpoint in front of a Lambda, which validates the
submission, verifies a Cloudflare Turnstile token, rate limits it in DynamoDB
and emails it on with SES. The handler,
its tests and an idempotent setup script live in
[`aws/franchise-form/`](aws/franchise-form/README.md).

The contact form is still front-end only and still says so.

Nothing secret is in the browser bundle: the only things the frontend knows are
the public endpoint URL and the public Turnstile site key. The recipient address, the SES identity and the
rate-limit key are all Lambda environment variables.

### Data and asset scripts

| Command | What it does |
| --- | --- |
| `npm run menu:data` | Regenerates `app/src/data/menu.js` and `app/public/assets/menu/` from `menu-items.json` plus the corrections in the script (`CARDS`, `RETIRED`, `ADDED`). |
| `python3 app/scripts/process-client-photos.py` | Prepares the September client photo pack for the web: keyed cut-outs into `app/public/assets/food/client-refresh/`, 5:4 menu frames into `images-web/`. Needs `pillow` and `numpy`. |
| `python3 app/scripts/make-favicon.py` | Rebuilds the favicon set in `app/public/assets/brand/` from the official logo. Needs `pillow` and `numpy`. |
| `node app/scripts/build-zip-areas.mjs <all_us_zipcodes.csv>` | Rebuilds `app/src/data/zip-areas.js`, the table the ZIP lookup ranks against. Run it after adding, moving or closing a shop. The CSV is a couple of megabytes and is not committed; the script's header says where to download it. |

The menu generator holds a `PHOTO_OVERRIDES` table, so regenerating the menu keeps the
client photography instead of falling back to the older scraped shots.

The ZIP table is the one piece of generated data that goes stale on its own: it is built
from the shop list in `app/src/data/locations.js`, so a new location will not show up in
the lookup until the script is re-run. It prints how far off the compression is when it
finishes, which is worth reading rather than skipping.

---

## Deploy on GitHub Pages

1. Push to `main` (the root already contains the compiled site).
2. GitHub → **Settings → Pages → Build and deployment**
   - **Source:** Deploy from a branch
   - **Branch:** `main`
   - **Folder:** `/ (root)`
3. That's it, no Actions workflow needed.

### URLs

Pages live at clean paths that match the old WordPress site wherever that page still
exists, so search results, map listings and old shared links keep working:

| Page | URL |
| --- | --- |
| Home | `/` |
| Menu | `/menu/` |
| Flavors | `/flavors/` |
| Locations | `/locations/` |
| Catering | `/catering/` |
| Book catering (new) | `/catering/book/` |
| Our Story (old "About Us") | `/about-us/` |
| Franchise | `/franchise/` |
| Contact (new) | `/contact/` |

All of them are defined once, in `app/src/data/routes.js`. The router, navigation, page
titles and canonicals, the per-page HTML files, `sitemap.xml` and the publish step read
from it, so **to add or rename a page, change it there**.

GitHub Pages is a plain file server, so each path needs its own file to answer with HTTP
200 on a direct visit or refresh. That is what the per-page `index.html` files are for.
A path without its trailing slash (`/menu`) is redirected to `/menu/` by GitHub Pages.
Anything else gets `404.html` with a real 404 status.

Links from when the site used `#/` URLs (`/#/menu`, `/#/story`) are moved to the clean
path (`/menu/`, `/about-us/`) as the page loads, with the address bar updated. Ordinary
in-page anchors (`/franchise/#fn-1`) are left alone.

Asset paths are root-relative (`/static/…`, `/assets/…`, Vite `base: '/'`), which is what
lets nested pages load them. The site therefore has to be served from the root of its
domain, as it is on atlwingspot.com; it no longer works under a `/<repo>/` subpath.

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
  The words on the cyan stripe are ATL orange, the client's choice; the colour is one value
  (`.ws--cyan` in `WordStripe.css`) so white or ink can be swapped in.
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

## Search engines (SEO)

What is in place, and where it lives:

- **Old URLs kept.** Pages sit at the old WordPress site's paths (see URLs above), so
  existing search results and links keep working.
- **Content is in the HTML.** Every page file contains its full text, links and images,
  not an empty shell that needs JavaScript. Crawlers and link previews read it directly;
  the browser shows it immediately and React then attaches to it (`src/main.jsx`). A
  component must render the same thing at build time as on first load in the browser: read
  `window`, media queries or storage inside an effect or with `hooks/useMediaQuery.js`,
  never during render.
- **Titles and descriptions** for every page are in `app/src/data/routes.js`. Keep titles
  near 60 characters and descriptions near 155, and only claim what the page shows.
- **Structured data** (schema.org JSON-LD) is generated in
  `app/src/data/structuredData.js` from the same data the pages display: the brand on the
  home page, one `Restaurant` per open shop on the locations page (address, phone, hours),
  the full `Menu` on the menu page and a breadcrumb trail on every inner page. There are no
  prices, ratings or reviews in it because the site does not publish any. Shop hours are
  converted by `app/src/data/hours.js`, which fails the build on a format it does not
  recognise rather than publish wrong hours.
- **`sitemap.xml` and `robots.txt`** are rebuilt on every build. One canonical URL per
  page; the not-found page is `noindex`.
- **Fonts** for the first screen are preloaded; images are lazy-loaded with fixed
  dimensions and alt text.

After a deploy that changes URLs or adds pages, resubmit `https://atlwingspot.com/sitemap.xml`
in Google Search Console and Bing Webmaster Tools. Each shop's Google Business Profile
should link to `https://atlwingspot.com/locations/` (or the home page) and show the same
name, address, phone and hours as `app/src/data/locations.js`: matching details across the
site and the listings is what local search ranks on.

## Notes on content

**Menu changes.** The menu is generated: edit the `CARDS`, `RETIRED` and `ADDED` tables in
`app/scripts/build-menu-data.mjs`, then run `npm run menu:data` and `npm run build`. A dish
with no photograph yet takes `noPhoto: true` and shows a "no photo" tile rather than a
picture of something else.

**Shops.** Open shops are in `LOCATIONS` and announced ones in `COMING_SOON`, both in
`app/src/data/locations.js`. Coming-soon shops show city and state only and are not in the
ZIP lookup; when one opens, move it into `LOCATIONS` and rebuild the ZIP table.


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
