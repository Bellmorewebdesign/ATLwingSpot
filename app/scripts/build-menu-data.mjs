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
  { id: 'starters',    label: 'Starters',            from: 'starters' },
  { id: 'wings',       label: 'Wings',               from: 'traditional' },
  { id: 'boneless',    label: 'Boneless Wings',      from: 'boneless' },
  { id: 'tenders',     label: 'Saucy Tenders',       from: 'tenders' },
  { id: 'waffles',     label: "Chicken N' Waffles",  from: 'chicken-n-waffles' },
  { id: 'quesadillas', label: 'Quesadillas',         from: 'quesadillas' },
  { id: 'wraps',       label: 'Wraps',               from: 'wraps' },
  { id: 'sandwiches',  label: 'Burgers & Sandwiches', from: 'burgers-n-sandwiches' },
  { id: 'fries',       label: 'Fries N Munchies',    from: 'fries-n-munchies' },
  { id: 'desserts',    label: 'Desserts N Shakes',   from: 'desserts-n-shakes' },
  { id: 'drinks',      label: 'Beverages',           from: 'beverages' },
  { id: 'extras',      label: 'Extras',              from: 'extras' },
]
const CAT_BY_PACK = Object.fromEntries(CATEGORIES.map((c) => [c.from, c.id]))

/* Titles: the pack's wording, with US spelling and a consistent piece count. */
const TITLE = {
  'Cajun Fried Corn (Fan Favourite)': 'Cajun Fried Corn',
  '6 Pieces Wings': '6 Bone In Wings',
  '10 Pieces Wings': '10 Bone In Wings',
  '20 Pieces Wings': '20 Bone In Wings',
  '50 Bone in Wings': '50 Bone In Wings',
  '100 Bone in Wings': '100 Bone In Wings',
}

/* One rewritten description per official listing, keyed by the pack's index so
   the mapping is unambiguous. Every fact below appears in the source text or
   the source title; nothing else has been added. Sibling sizes lead with their
   piece count so a 4-piece and a 100-piece never read identically. */
const DESC = {
  1: 'Bite-sized golden treats with a crispy exterior and a creamy, cheesy mac and cheese center.',
  2: 'Our fan-favorite Cajun fried corn. Juicy ears of corn on the cob fried till golden and tossed in our famous Cajun rub. Served with ranch.',
  3: 'Crispy coconut shrimp, served with Thai chili sauce.',
  4: 'Six mozzarella sticks, served with marinara sauce.',

  5: 'Crispy boneless chicken topped with our housemade chipotle sauce, cheddar cheese and ranch.',
  6: 'Melted cheddar cheese in a pressed tortilla. Served with sour cream.',
  7: 'Grilled chicken, cheddar cheese, green peppers and onions. Served with sour cream.',
  8: 'Crispy buffalo chicken and cheddar cheese topped with ranch. Served with ranch on the side.',

  9:  'Six of our classic bone-in wings, always fresh, never frozen. Choose from a wide selection of flavors. Served with your choice of side, beverage and dip.',
  10: 'Ten of our classic bone-in wings, always fresh, never frozen. Choose from a wide selection of flavors. Served with your choice of side, beverage and dip.',
  11: 'Four of our classic bone-in wings, always fresh, never frozen. Choose from a wide selection of flavors. Served with celery and your choice of dip.',
  12: 'Six of our classic bone-in wings, always fresh, never frozen. Choose from a wide selection of flavors. Served with celery and your choice of dip.',
  13: 'Ten of our classic bone-in wings, always fresh, never frozen. Choose from a wide selection of flavors. Served with celery and your choice of dip.',
  14: 'Twenty of our classic bone-in wings, always fresh, never frozen. Choose from a wide selection of flavors. Served with celery and your choice of dip.',
  15: 'Fifty of our classic bone-in wings, always fresh, never frozen. Choose from a wide selection of flavors. Served with celery and your choice of dip.',
  16: 'One hundred of our classic bone-in wings, always fresh, never frozen. Choose from a wide selection of flavors. Served with celery and your choice of dip.',

  17: 'Six of our fan-favorite boneless wings, now in a combo. Fresh, never frozen white-meat chicken, hand breaded and fried till golden brown. Served with your choice of sauce, side, beverage and dip.',
  18: 'Ten of our fan-favorite boneless wings, now in a combo. Fresh, never frozen white-meat chicken, hand breaded and fried till golden brown. Served with your choice of sauce, side, beverage and dip.',
  19: 'Four of our fan-favorite boneless wings. Fresh, never frozen white-meat chicken, hand breaded and fried till golden brown. Choose your sauce and dip.',
  20: 'Six of our fan-favorite boneless wings. Fresh, never frozen white-meat chicken, hand breaded and fried till golden brown. Choose your sauce and dip.',
  21: 'Ten of our fan-favorite boneless wings. Fresh, never frozen white-meat chicken, hand breaded and fried till golden brown. Choose your sauce and dip.',
  22: 'Twenty of our fan-favorite boneless wings. Fresh, never frozen white-meat chicken, hand breaded and fried till golden brown. Choose your sauce and dip.',
  23: 'Fifty of our fan-favorite boneless wings. Fresh, never frozen white-meat chicken, hand breaded and fried till golden brown. Choose your sauce and dip.',
  24: 'One hundred of our fan-favorite boneless wings. Fresh, never frozen white-meat chicken, hand breaded and fried till golden brown. Choose your sauce and dip.',

  25: 'Three hand-breaded jumbo tenders. Pick your favorite sauce and have them tossed, or with the sauce on the side.',
  26: 'Five hand-breaded jumbo tenders. Pick your favorite sauce and have them tossed, or with the sauce on the side.',
  27: 'Ten hand-breaded jumbo tenders. Pick your favorite sauces and have them tossed, or with the sauce on the side.',
  28: 'Twenty hand-breaded jumbo tenders. Pick your favorite sauces and have them tossed, or with the sauce on the side.',
  29: 'Fifty hand-breaded jumbo tenders. Pick your favorite sauces and have them tossed, or with the sauce on the side.',
  30: 'One hundred hand-breaded jumbo tenders. Pick your favorite sauces and have them tossed, or with the sauce on the side.',
  31: 'Three hand-breaded jumbo tenders, tossed or with the sauce on the side. Served with your choice of side and drink.',
  32: 'Five hand-breaded jumbo tenders, tossed or with the sauce on the side. Served with your choice of side and drink.',

  33: 'Three crispy chicken tenders served over a warm waffle topped with powdered sugar. Syrup on the side.',
  34: 'Three hand-breaded chicken tenders served with a crispy Oreo waffle topped with powdered sugar and chocolate syrup. Syrup on the side.',
  35: 'Three hand-breaded chicken tenders served with a crispy Fruity Pebbles waffle topped with powdered sugar and strawberry syrup. Syrup on the side.',
  36: 'Three hand-breaded chicken tenders served with a crispy Cinnamon Toast Crunch waffle topped with powdered sugar and caramel syrup. Syrup on the side.',
  37: 'The OG. Our original waffle topped with powdered sugar, no chicken. Served with syrup on the side.',
  38: 'Crispy Oreo waffle topped with Hershey’s syrup, powdered sugar and more Oreos.',
  39: 'Crispy Fruity Pebbles waffle topped with strawberry syrup, powdered sugar and more Fruity Pebbles.',
  40: 'Crispy Cinnamon Toast Crunch waffle topped with caramel syrup, powdered sugar and more Cinnamon Toast Crunch.',

  41: 'Crispy boneless chicken topped with cheddar cheese, lettuce, tomatoes and honey mustard, wrapped to go.',
  42: 'Crispy buffalo chicken topped with lettuce, tomatoes and ranch dressing, wrapped to go.',
  43: 'Crispy chicken topped with chipotle sauce, lettuce, tomatoes and cheddar cheese, wrapped to go.',

  44: 'Crispy chicken on a brioche bun topped with chipotle sauce, lettuce and tomato.',
  45: 'Fried chicken, American cheese, mayo, lettuce and tomato on a brioche bun.',

  46: 'Golden waffle fries, available in small or large servings.',
  47: 'Golden fries topped with melted cheddar cheese.',
  48: 'Crispy, golden-battered onion rings, perfectly seasoned for a delightful crunch.',
  49: 'Waffle fries loaded up with crispy chicken, buffalo sauce and ranch.',
  50: 'Waffle fries loaded up with crispy chicken, Nashville hot sauce and ranch.',
  51: 'Sweet potato fries, available in small or large servings.',
  52: 'Waffle fries loaded up with crispy chicken, pineapple BBQ sauce and ranch.',

  53: 'Shake it up with one of our fan-favorite milkshakes. Choose from flavors like Reese’s, Fruity Pebbles, Oreo Blast and Cinnamon Toast Crunch, or keep it classic with Hershey’s Chocolate, Vanilla or Strawberry Shortcake.',
  54: 'Crispy Cinnamon Toast Crunch waffle topped with caramel syrup, powdered sugar and more Cinnamon Toast Crunch.',
  55: 'Crispy Fruity Pebbles waffle topped with strawberry syrup, powdered sugar and more Fruity Pebbles.',
  56: 'Crispy Oreo waffle topped with Hershey’s syrup, powdered sugar and more Oreos.',
  57: 'Golden, crispy battered Oreos dusted with powdered sugar, offering a delightful blend of crunch and sweetness.',
  58: 'Twelve crispy funnel cake fries, lightly dusted with powdered sugar for a sweet, crunchy treat.',

  59: 'Canned soda, including Pepsi, Diet Pepsi, Orange Crush, Ginger Ale, Brisk Iced Tea and Lemonade.',
  60: 'A crisp, satisfying taste to quench thirst and energize without caffeine.',
  61: 'Pure and refreshing bottled water.',
  62: 'Large fountain soda: Pepsi, Orange Crush or Ginger Ale.',
  63: 'Bottled soda, including classic Pepsi variants, Crush flavors, Mountain Dew Baja Blast, Country Time lemonades, Sunny D Fruit Punch and Brisk Iced Tea.',

  64: 'Every hero needs a sidekick. Our ATL Wing Spot ranch is the perfect addition to any wing or munchie order.',
  65: 'A cup of blue cheese dip.',
  66: 'Add a side cup of your favorite sauce, from right across the sauce board.',
  67: 'A cup of nacho cheese sauce.',
  68: 'Crisp celery stalks, freshly cut and ready as a refreshing side or snack.',
}

const slug = (s) =>
  s.toLowerCase().replace(/[’'".,()]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const pack = JSON.parse(readFileSync(PACK, 'utf8'))
const items = pack.items

// ---- images: copy only what the catalog actually maps -----------------------
rmSync(OUT_IMG, { recursive: true, force: true })
mkdirSync(OUT_IMG, { recursive: true })
const dims = new Map()
for (const src of new Set(items.map((i) => i.web_image))) {
  const abs = resolve(ROOT, src)
  if (!existsSync(abs)) throw new Error(`missing image: ${src}`)
  copyFileSync(abs, resolve(OUT_IMG, basename(src)))
  const { width, height } = sizeOf(readFileSync(abs))
  dims.set(basename(src), { width, height })
}

// ---- data -------------------------------------------------------------------
const seen = new Map()
const rows = items.map((it) => {
  const cat = CAT_BY_PACK[it.category]
  if (!cat) throw new Error(`unmapped category: ${it.category}`)
  const name = TITLE[it.title] ?? it.title
  const desc = DESC[it.index]
  if (!desc) throw new Error(`no description written for index ${it.index} (${it.title})`)

  // Three waffles are listed by ATL under both Waffles and Desserts. Both
  // listings are real, so both are kept — the category suffix keeps their ids
  // (and therefore their React keys) unique.
  let id = slug(name)
  if (seen.has(id)) id = `${id}-${cat}`
  seen.set(id, true)

  const file = basename(it.web_image)
  const { width, height } = dims.get(file)
  return { id, cat, name, desc, image: `assets/menu/${file}`, w: width, h: height }
})

const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
const byCat = (id) => rows.filter((r) => r.cat === id)

const body = CATEGORIES.map((c) => {
  const set = byCat(c.id)
  const lines = set.map(
    (r) =>
      `  {\n` +
      `    id: ${q(r.id)}, cat: ${q(r.cat)},\n` +
      `    name: ${q(r.name)},\n` +
      `    desc:\n      ${q(r.desc)},\n` +
      `    image: ${q(r.image)}, w: ${r.w}, h: ${r.h},\n` +
      `  },`
  )
  return `  // ---------------- ${c.label.toUpperCase()} (${set.length}) ----------------\n${lines.join('\n')}`
}).join('\n\n')

const out = `// ATL Wing Spot menu — generated from the official asset pack.
//
//   npm run menu:data      (app/scripts/build-menu-data.mjs)
//
// Source of truth: menu-items.json at the repo root, published by ATL. It holds
// ${pack.item_count} listings mapped onto ${dims.size} official photographs; several sizes and
// variations intentionally share one photo. Categories, names, the item-to-image
// mapping and the substance of every description come from there.
//
// Descriptions are copy-edited only: typos fixed, shouting normalised, terminal
// punctuation added, and sibling sizes made distinguishable from one another.
// Where the source disagreed with itself about how many sauces exist ("over 30"
// in some rows, "over 25" in others) the count is left out entirely rather than
// guessed at.
//
// There is NO price field, by design — the customer-facing menu shows the name,
// the description, the photo and the category, and nothing else.
//
// DO NOT EDIT BY HAND. Change the pack (or the copy table in the script) and
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

console.log(`listings   : ${rows.length} (pack says ${pack.item_count})`)
console.log(`categories : ${CATEGORIES.length}`)
console.log(`images     : ${dims.size} copied -> app/public/assets/menu/ (${readdirSync(OUT_IMG).length} on disk)`)
console.log(`wrote      : app/src/data/menu.js`)
