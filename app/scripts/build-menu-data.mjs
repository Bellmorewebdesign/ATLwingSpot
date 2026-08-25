/**
 * Regenerate the menu data layer + its images from the official asset pack.
 *
 *   node app/scripts/build-menu-data.mjs        (run from the repo root)
 *
 * Inputs  : menu-items.json + images-web/ (the pack, at the repo root)
 * Outputs : app/src/data/menu.js
 *           app/public/assets/menu/*        (only the images actually mapped)
 *
 * menu-items.json is the sole authority for categories, item names, item-to-
 * image mapping and the factual content of each description. Nothing here
 * invents ingredients, portions, prices, preparation or flavor counts.
 *
 * SIZE VARIANTS ARE ONE CARD. The pack lists every portion separately, so
 * bone-in wings alone arrive as six near-identical rows, four of them sharing a
 * single photograph. Listing them that way makes the menu read as padding. Each
 * CARD below therefore names the pack indices it stands for, and its copy states
 * which portions exist. Every one of the pack's listings is still represented;
 * they are grouped, not dropped, and the build asserts that.
 *
 * Descriptions are the pack's text, copy-edited only: real typos fixed
 * ("sour scream", "suqar"), shouting normalised, missing terminal punctuation
 * added. Where the source contradicts itself on how many sauces exist — some
 * rows say "over 30 flavors", others "over 25" — both are replaced with a
 * count-free phrase rather than picking a side.
 *
 * There is deliberately NO price field. Prices are not shown anywhere on the
 * customer-facing menu.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync, readdirSync } from 'node:fs'
import { dirname, basename, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sizeOf from 'image-size'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PACK = resolve(ROOT, 'menu-items.json')
const OUT_DATA = resolve(ROOT, 'app/src/data/menu.js')
const OUT_IMG = resolve(ROOT, 'app/public/assets/menu')

/* The pack's category slugs mapped onto the ids this site already routes on,
   so existing deep links (/menu?cat=wings) keep working. `quesadillas` is new:
   the pack breaks it out of starters, and it is big enough to stand alone. */
const CATEGORIES = [
  { id: 'starters',    label: 'Starters',             from: 'starters' },
  { id: 'wings',       label: 'Wings',                from: 'traditional' },
  { id: 'boneless',    label: 'Boneless Wings',       from: 'boneless' },
  { id: 'tenders',     label: 'Saucy Tenders',        from: 'tenders' },
  { id: 'waffles',     label: "Chicken N' Waffles",   from: 'chicken-n-waffles' },
  { id: 'quesadillas', label: 'Quesadillas',          from: 'quesadillas' },
  { id: 'wraps',       label: 'Wraps',                from: 'wraps' },
  { id: 'sandwiches',  label: 'Burgers & Sandwiches', from: 'burgers-n-sandwiches' },
  { id: 'fries',       label: 'Fries N Munchies',     from: 'fries-n-munchies' },
  { id: 'desserts',    label: 'Desserts N Shakes',    from: 'desserts-n-shakes' },
  { id: 'drinks',      label: 'Beverages',            from: 'beverages' },
  { id: 'extras',      label: 'Extras',               from: 'extras' },
]
const CAT_BY_PACK = Object.fromEntries(CATEGORIES.map((c) => [c.from, c.id]))

/**
 * One entry per CARD.
 *
 *   from    : the pack indices this card represents. More than one means the
 *             pack split a single dish across portion sizes.
 *   img     : which of those indices supplies the photo (default: the first).
 *             For a group, the shot most of the variants already shared.
 *   name    : overrides the pack title. Groups need one, since no single
 *             portion's title can head the whole family.
 *   desc    : the pack's wording, copy-edited. For a group it must say which
 *             portions are available, because the card no longer does.
 *   noPhoto : the pack maps this listing to a photograph of something else.
 *             The card renders an empty state instead. Showing a picture of a
 *             different dish is worse than showing none, and substituting a
 *             lookalike would be inventing product identity.
 */
const CARDS = [
  // ---- starters ----
  { from: [1], desc: 'Bite-sized golden treats with a crispy exterior and a creamy, cheesy mac and cheese center.' },
  { from: [2], name: 'Cajun Fried Corn',
    desc: 'Our fan-favorite Cajun fried corn. Juicy ears of corn on the cob fried till golden and tossed in our famous Cajun rub. Served with ranch.' },
  { from: [3], desc: 'Crispy coconut shrimp, served with Thai chili sauce.' },
  { from: [4], desc: 'Six mozzarella sticks, served with marinara sauce.' },

  // ---- quesadillas ----
  { from: [5], desc: 'Crispy boneless chicken topped with our housemade chipotle sauce, cheddar cheese and ranch.' },
  { from: [6], desc: 'Melted cheddar cheese in a pressed tortilla. Served with sour cream.' },
  { from: [7], desc: 'Grilled chicken, cheddar cheese, green peppers and onions. Served with sour cream.' },
  { from: [8], desc: 'Crispy buffalo chicken and cheddar cheese topped with ranch. Served with ranch on the side.' },

  // ---- wings: two cards, not eight ----
  { from: [9, 10], name: 'Bone-In Wings Combo',
    desc: 'Our classic bone-in wings, always fresh, never frozen. Choose from a wide selection of flavors. Served with your choice of side, beverage and dip. Comes as a 6-piece or a 10-piece.' },
  { from: [11, 12, 13, 14, 15, 16], name: 'Bone-In Wings',
    desc: 'Our classic bone-in wings, always fresh, never frozen. Choose from a wide selection of flavors. Served with celery and your choice of dip. Order 4, 6, 10, 20, 50 or 100 pieces.' },

  // ---- boneless: two cards, not eight ----
  { from: [17, 18], name: 'Boneless Wings Combo',
    desc: 'Our fan-favorite boneless wings, now in a combo. Fresh, never frozen white-meat chicken, hand breaded and fried till golden brown. Served with your choice of sauce, side, beverage and dip. Comes as a 6-piece or a 10-piece.' },
  { from: [19, 20, 21, 22, 23, 24], name: 'Boneless Wings',
    desc: 'Our fan-favorite boneless wings. Fresh, never frozen white-meat chicken, hand breaded and fried till golden brown. Choose your sauce and dip. Order 4, 6, 10, 20, 50 or 100 pieces.' },

  // ---- tenders: two cards, not eight ----
  { from: [25, 26, 27, 28, 29, 30], img: 27, name: 'Saucy Tenders',
    desc: 'Hand-breaded jumbo tenders. Pick your favorite sauce and have them tossed, or with the sauce on the side. Order 3, 5, 10, 20, 50 or 100 pieces.' },
  { from: [31, 32], name: 'Tender Combo',
    desc: 'Hand-breaded jumbo tenders, tossed or with the sauce on the side. Served with your choice of side and drink. Comes as a 3-piece or a 5-piece.' },

  // ---- chicken n' waffles: every one is a different dish ----
  { from: [33], desc: 'Three crispy chicken tenders served over a warm waffle topped with powdered sugar. Syrup on the side.' },
  { from: [34], desc: 'Three hand-breaded chicken tenders served with a crispy Oreo waffle topped with powdered sugar and chocolate syrup. Syrup on the side.' },
  { from: [35], desc: 'Three hand-breaded chicken tenders served with a crispy Fruity Pebbles waffle topped with powdered sugar and strawberry syrup. Syrup on the side.' },
  { from: [36], desc: 'Three hand-breaded chicken tenders served with a crispy Cinnamon Toast Crunch waffle topped with powdered sugar and caramel syrup. Syrup on the side.' },
  // ATL lists the four plain waffles under both Waffles and Desserts. One card
  // each, kept with the rest of the waffle family.
  // Mapped to the Cinnamon Toast Crunch Chicken N' Waffles shot, which has
  // both chicken and cereal on it. Not this dish.
  { from: [37], noPhoto: true, desc: 'The OG. Our original waffle topped with powdered sugar, no chicken. Served with syrup on the side.' },
  { from: [38, 56], desc: 'Crispy Oreo waffle topped with Hershey’s syrup, powdered sugar and more Oreos. No chicken.' },
  { from: [39, 55], desc: 'Crispy Fruity Pebbles waffle topped with strawberry syrup, powdered sugar and more Fruity Pebbles. No chicken.' },
  { from: [40, 54], desc: 'Crispy Cinnamon Toast Crunch waffle topped with caramel syrup, powdered sugar and more Cinnamon Toast Crunch. No chicken.' },

  // ---- wraps ----
  { from: [41], desc: 'Crispy boneless chicken topped with cheddar cheese, lettuce, tomatoes and honey mustard, wrapped to go.' },
  { from: [42], desc: 'Crispy buffalo chicken topped with lettuce, tomatoes and ranch dressing, wrapped to go.' },
  { from: [43], desc: 'Crispy chicken topped with chipotle sauce, lettuce, tomatoes and cheddar cheese, wrapped to go.' },

  // ---- burgers n sandwiches ----
  { from: [44], desc: 'Crispy chicken on a brioche bun topped with chipotle sauce, lettuce and tomato.' },
  { from: [45], desc: 'Fried chicken, American cheese, mayo, lettuce and tomato on a brioche bun.' },

  // ---- fries n munchies ----
  { from: [46], desc: 'Golden waffle fries. Order a small or a large.' },
  { from: [47], desc: 'Golden fries topped with melted cheddar cheese.' },
  { from: [48], desc: 'Crispy, golden-battered onion rings, perfectly seasoned for a delightful crunch.' },
  { from: [49], desc: 'Waffle fries loaded up with crispy chicken, buffalo sauce and ranch.' },
  // The pack maps this to the Cajun Fried Corn photograph. No shot of these
  // fries exists in the pack, so the card goes without one.
  { from: [50], noPhoto: true, desc: 'Waffle fries loaded up with crispy chicken, Nashville hot sauce and ranch.' },
  { from: [51], desc: 'Sweet potato fries. Order a small or a large.' },
  { from: [52], desc: 'Waffle fries loaded up with crispy chicken, pineapple BBQ sauce and ranch.' },

  // ---- desserts n shakes ----
  { from: [53],
    desc: 'Shake it up with one of our fan-favorite milkshakes. Choose from flavors like Reese’s, Fruity Pebbles, Oreo Blast and Cinnamon Toast Crunch, or keep it classic with Hershey’s Chocolate, Vanilla or Strawberry Shortcake.' },
  { from: [57], desc: 'Golden, crispy battered Oreos dusted with powdered sugar, offering a delightful blend of crunch and sweetness.' },
  { from: [58], desc: 'Twelve crispy funnel cake fries, lightly dusted with powdered sugar for a sweet, crunchy treat.' },

  // ---- beverages: fountain, can and bottle are one soda card ----
  { from: [59, 62, 63], name: 'Soda',
    desc: 'Fountain, can or bottle. The range covers Pepsi and Diet Pepsi, Orange Crush, Ginger Ale, Mountain Dew Baja Blast, Brisk Iced Tea, Country Time lemonade and Sunny D Fruit Punch, and varies by format.' },
  { from: [60], desc: 'A crisp, satisfying taste to quench thirst and energize without caffeine.' },
  // Mapped to the bottled soda line-up, which contains no water.
  { from: [61], noPhoto: true, desc: 'Pure and refreshing bottled water.' },

  // ---- extras ----
  { from: [64], desc: 'Every hero needs a sidekick. Our ATL Wing Spot ranch is the perfect addition to any wing or munchie order.' },
  { from: [65], desc: 'A cup of blue cheese dip.' },
  { from: [66], desc: 'Add a side cup of your favorite sauce, from right across the sauce board.' },
  { from: [67], desc: 'A cup of nacho cheese sauce.' },
  { from: [68], desc: 'Crisp celery stalks, freshly cut and ready as a refreshing side or snack.' },
]

const slug = (s) =>
  s.toLowerCase().replace(/[’'".,()]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const pack = JSON.parse(readFileSync(PACK, 'utf8'))
const byIndex = new Map(pack.items.map((i) => [i.index, i]))

// ---- every official listing must be represented exactly once ----------------
const covered = CARDS.flatMap((c) => c.from)
const dupes = covered.filter((n, k) => covered.indexOf(n) !== k)
if (dupes.length) throw new Error(`listing(s) claimed by more than one card: ${[...new Set(dupes)].join(', ')}`)
const missed = pack.items.map((i) => i.index).filter((n) => !covered.includes(n))
if (missed.length) throw new Error(`listing(s) not represented by any card: ${missed.join(', ')}`)
for (const c of CARDS) {
  const cats = new Set(c.from.map((n) => byIndex.get(n).category))
  // The plain waffles are the one deliberate cross-category grouping.
  if (cats.size > 1 && !c.from.includes(54) && !c.from.includes(55) && !c.from.includes(56)) {
    throw new Error(`card ${c.from.join('+')} spans categories: ${[...cats].join(', ')}`)
  }
}

// ---- build ------------------------------------------------------------------
rmSync(OUT_IMG, { recursive: true, force: true })
mkdirSync(OUT_IMG, { recursive: true })
const dims = new Map()
const seen = new Set()

const rows = CARDS.map((card) => {
  const lead = byIndex.get(card.from[0])
  const shot = byIndex.get(card.img ?? card.from[0])
  const cat = CAT_BY_PACK[lead.category]
  if (!cat) throw new Error(`unmapped category: ${lead.category}`)

  let image = null
  let width = 0
  let height = 0
  if (!card.noPhoto) {
    const src = resolve(ROOT, shot.web_image)
    if (!existsSync(src)) throw new Error(`missing image: ${shot.web_image}`)
    const file = basename(shot.web_image)
    if (!dims.has(file)) {
      copyFileSync(src, resolve(OUT_IMG, file))
      const d = sizeOf(readFileSync(src))
      dims.set(file, { width: d.width, height: d.height })
    }
    ;({ width, height } = dims.get(file))
    image = `assets/menu/${file}`
  }

  const name = card.name ?? lead.title
  const id = slug(name)
  if (seen.has(id)) throw new Error(`duplicate id: ${id}`)
  seen.add(id)

  return { id, cat, name, desc: card.desc, image, w: width, h: height, covers: card.from.length }
})

const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

const body = CATEGORIES.map((c) => {
  const set = rows.filter((r) => r.cat === c.id)
  const lines = set.map(
    (r) =>
      `  {\n` +
      `    id: ${q(r.id)}, cat: ${q(r.cat)},\n` +
      `    name: ${q(r.name)},\n` +
      `    desc:\n      ${q(r.desc)},\n` +
      (r.image
        ? `    image: ${q(r.image)}, w: ${r.w}, h: ${r.h},\n`
        : `    image: null,   // the pack maps this listing to a photo of a different dish\n`) +
      `  },`
  )
  return `  // ---------------- ${c.label.toUpperCase()} (${set.length}) ----------------\n${lines.join('\n')}`
}).join('\n\n')

const grouped = rows.filter((r) => r.covers > 1)
const unphotographed = rows.filter((r) => !r.image)
const out = `// ATL Wing Spot menu — generated from the official asset pack.
//
//   npm run menu:data      (app/scripts/build-menu-data.mjs)
//
// Source of truth: menu-items.json at the repo root, published by ATL. It lists
// ${pack.item_count} entries, one per portion size, which is why bone-in wings alone appear
// there as six near-identical rows sharing two photographs. Here those portion
// sizes are folded into a single card whose copy names the sizes on offer, so
// the menu reads as ${rows.length} dishes rather than ${pack.item_count} repetitions. Every one of the
// ${pack.item_count} official listings is still represented; the build fails if one is not.
//
// ${grouped.length} cards stand for more than one listing. Categories, names, the item-to-image
// mapping and the substance of every description come from the pack.
//
// ${unphotographed.length} cards carry image: null. The pack maps each of them to a photograph of a
// DIFFERENT dish, and it has no correct shot for them. They render an explicit
// "no photo" state; a lookalike would misrepresent the product.
//
// Descriptions are copy-edited only: typos fixed, shouting normalised, terminal
// punctuation added. Where the source disagreed with itself about how many
// sauces exist ("over 30" in some rows, "over 25" in others) the count is left
// out entirely rather than guessed at.
//
// There is NO price field, by design — the customer-facing menu shows the name,
// the description, the photo and the category, and nothing else.
//
// DO NOT EDIT BY HAND. Change the pack (or the CARDS table in the script) and
// regenerate, or the next run will overwrite you.

export const MENU_CATEGORIES = [
  { id: 'all', label: 'All' },
${CATEGORIES.map((c) => `  { id: ${q(c.id)}, label: ${q(c.label)} },`).join('\n')}
]

export const MENU_ITEMS = [
${body}
]
`

writeFileSync(OUT_DATA, out)

console.log(`official listings : ${pack.item_count} (all represented)`)
console.log(`cards             : ${rows.length}  (${grouped.length} of them cover a size range)`)
for (const g of grouped) console.log(`    ${g.name.padEnd(22)} <- ${g.covers} listings`)
console.log(`categories        : ${CATEGORIES.length}`)
console.log(`images            : ${dims.size} copied -> app/public/assets/menu/ (${readdirSync(OUT_IMG).length} on disk)`)
console.log(`no correct photo  : ${unphotographed.length}`)
for (const u of unphotographed) console.log(`    ${u.name}`)
console.log(`wrote             : app/src/data/menu.js`)
