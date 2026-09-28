/**
 * Generates app/src/data/zip-areas.js — the tables the ZIP lookup ranks against.
 *
 * WHY A GENERATED TABLE
 * The site is a static build on GitHub Pages: no server, no geocoder to call.
 * The lookup used to carry a hand-written list of the ZIP prefixes ATL trades
 * in, which meant anyone outside those few prefixes got "no shop near you"
 * even when there was obviously a nearest one. This script instead measures
 * real distance from a public ZIP coordinate set and bakes the answer in, so
 * every US ZIP resolves to the shops actually closest to it.
 *
 * TWO TABLES, BECAUSE PRECISION ONLY MATTERS NEARBY
 * Shipping 42,000 ZIP coordinates to the browser for a phone-number lookup is
 * not a trade worth making, but one coarse table is not good enough either:
 * grouping by the first three digits of the ZIP puts Redlands 92373 and a
 * patch of desert sixty miles out in the same bucket, and the answer for 92373
 * came out "about 55 miles" when the shop is down the road.
 *
 * So: ZIP_NEAR holds a row per exact ZIP within NEAR_RADIUS miles of a shop —
 * about 1,300 of them, which is everywhere anyone is realistically ordering
 * from — and ZIP_AREAS holds a row per three-digit prefix (the postal
 * sectional centre) for the rest of the country. Nearby answers are exact;
 * distant ones are a mean across the prefix, which is plenty when the reply is
 * "roughly seven hundred miles". Together they are about 28 KB.
 *
 * Prefix ranking is by the MEAN distance from every far ZIP in the prefix to
 * the shop, not by distance from the prefix centroid. Some sectional centres
 * are large and oddly shaped, and a mean over the member ZIPs is steadier than
 * a single midpoint that can land in the wrong part of the area. Members that
 * made it into ZIP_NEAR are left out of that mean, since they never fall
 * through to the prefix row.
 *
 * SOURCE DATA
 * midwire/free_zipcode_data (public domain), all_us_zipcodes.csv:
 *   https://raw.githubusercontent.com/midwire/free_zipcode_data/master/all_us_zipcodes.csv
 * It is a couple of megabytes and only needed to regenerate the table, so it
 * is not committed. Download it and pass the path:
 *
 *   node app/scripts/build-zip-areas.mjs /path/to/all_us_zipcodes.csv
 *
 * The shop coordinates are the coordinates of each shop's own ZIP. That is
 * accurate to roughly a mile, which is well inside the precision this lookup
 * claims — it reports distance rounded to ten miles and only over fifty.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const LOCATIONS_JS = resolve(HERE, '../src/data/locations.js')
const OUT = resolve(HERE, '../src/data/zip-areas.js')

const csvPath = process.argv[2]
if (!csvPath) {
  console.error('usage: node build-zip-areas.mjs <all_us_zipcodes.csv>')
  console.error('see the comment at the top of this file for where to get it')
  process.exit(1)
}

/* ---------- the shops, read straight out of locations.js ----------
   Parsed rather than imported so that locations.js is free to import the file
   this script writes without the two of them forming a cycle. */
const src = readFileSync(LOCATIONS_JS, 'utf8')
const block = src.slice(src.indexOf('export const LOCATIONS'), src.indexOf(']', src.indexOf('export const LOCATIONS')))
const shops = [...block.matchAll(/id:\s*'([^']+)'[\s\S]*?zip:\s*'(\d{5})'/g)].map((m) => ({ id: m[1], zip: m[2] }))
if (!shops.length) throw new Error('found no shops in locations.js')

/* ---------- every US ZIP, grouped by sectional centre ---------- */
const rows = readFileSync(csvPath, 'utf8').split('\n').slice(1)
const areas = new Map() // '115' -> [{zip, lat, lon}, ...]
const coords = new Map() // '11554' -> {lat, lon}
const rejected = []

/* A handful of rows in the source CSV have broken coordinates: a longitude
   that lost its minus sign, or a latitude and longitude the wrong way round.
   Montrose, Colorado comes through at +107.83 and lands in Kazakhstan, which
   is enough on its own to drag its prefix's mean thousands of miles. These
   bounds hold every ZIP in the fifty states — Hawaii is the southern edge,
   northern Alaska the top, the Aleutians the west, Maine the east — so
   anything outside them is a data fault, not a place. */
const inUS = (lat, lon) => lat >= 18 && lat <= 72 && lon >= -180 && lon <= -65

for (const line of rows) {
  const f = line.split(',')
  if (f.length < 7) continue
  const zip = f[0].trim()
  const lat = Number(f[5])
  const lon = Number(f[6])
  if (!/^\d{5}$/.test(zip) || !Number.isFinite(lat) || !Number.isFinite(lon)) continue
  if (!inUS(lat, lon)) { rejected.push(`${zip} ${f[1]}, ${f[2]} @ ${lat},${lon}`); continue }
  coords.set(zip, { lat, lon })
  const key = zip.slice(0, 3)
  if (!areas.has(key)) areas.set(key, [])
  areas.get(key).push({ zip, lat, lon })
}

for (const s of shops) {
  const c = coords.get(s.zip)
  if (!c) throw new Error(`no coordinates for ${s.id} (ZIP ${s.zip})`)
  s.lat = c.lat
  s.lon = c.lon
}

/* ---------- distance ---------- */
const R = 3958.8 // mean earth radius, miles
const rad = (d) => (d * Math.PI) / 180
function miles(a, b) {
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/* ---------- rank the shops ---------- */
const KEEP = 3
// Past this, one prefix row is as good an answer as an exact one.
const NEAR_RADIUS = 40

const nearest = (pt) =>
  shops
    .map((s, i) => ({ i, d: miles(pt, s) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, KEEP)

// Exact rows for everywhere close enough that the difference shows.
const near = []
const isNear = new Set()
for (const [zip, c] of [...coords].sort()) {
  const ranked = nearest(c)
  if (ranked[0].d > NEAR_RADIUS) continue
  isNear.add(zip)
  near.push(`${zip} ${Math.round(ranked[0].d)} ${ranked.map((r) => r.i).join('')}`)
}

// Prefix rows for the rest of the country.
const out = []
for (const key of [...areas.keys()].sort()) {
  // Only the members that will actually fall through to this row.
  const far = areas.get(key).filter((z) => !isNear.has(z.zip))
  const zips = far.length ? far : areas.get(key)
  const ranked = shops
    .map((s, i) => ({ i, mean: zips.reduce((sum, z) => sum + miles(z, s), 0) / zips.length }))
    .sort((a, b) => a.mean - b.mean)
    .slice(0, KEEP)

  /* Some western prefixes cover enormous ground — 935 runs from Bakersfield up
     the eastern Sierra — so a single mean would tell Lee Vining it is 130
     miles from Redlands when it is nearly 300. Rather than judge that by how
     wide the prefix looks, check the promise directly: quote the mean only if
     it is close enough to the truth for nearly everyone who will see it.
     Otherwise the row stores 0 and the UI names the nearest shop without
     putting a number on it. Better to say less than to say something wrong.

     "Close enough" is every member of the prefix, not most of them, which
     makes the number a guarantee: a quoted distance is never more than fifteen
     miles or a quarter out, whichever is larger, for anyone it is shown to. */
  const quoted = Math.round(ranked[0].mean)
  const tolerable = (d) => Math.abs(quoted - d) <= Math.max(15, d * 0.25)
  const own = zips.map((z) => Math.min(...shops.map((s) => miles(z, s))))
  const quote = own.every(tolerable) ? quoted : 0
  out.push(`${key} ${quote} ${ranked.map((r) => r.i).join('')}`)
}

/* Nothing is invented to fill the gaps. Every prefix in the source data gets a
   row, so the only inputs that fall through are ZIPs the data has never heard
   of — unassigned prefixes, military APO blocks, and the handful of rows
   rejected above. Those should say "we do not know that ZIP" rather than be
   handed a shop picked by counting to the nearest prefix that does exist. */

const file = `// GENERATED by app/scripts/build-zip-areas.mjs — do not edit by hand.
//
// Every row is: key, miles to the closest shop, then the ${KEEP} closest shops as
// indexes into SHOP_IDS. Ranked on real coordinates, so any US ZIP resolves to
// the shops actually nearest it rather than to a hand-picked trading area.
//
// ZIP_NEAR is keyed by exact ZIP and covers everything within ${NEAR_RADIUS} miles of a
// shop, where the distance is a real one. ZIP_AREAS is keyed by the first three
// digits of the ZIP and covers the rest of the country, where the distance is a
// mean across a prefix that can span tens of miles — read those as "which metro
// is this", not as a drive. See locations.js for how the lookup words them.

export const SHOP_IDS = ${JSON.stringify(shops.map((s) => s.id))}

export const ZIP_NEAR = \`
${near.join('\n')}
\`

export const ZIP_AREAS = \`
${out.join('\n')}
\`
`

writeFileSync(OUT, file)

/* ---------- report ---------- */
const bytes = Buffer.byteLength(file)
console.log(`${near.length} exact ZIPs + ${out.length} ZIP areas -> ${OUT}  (${(bytes / 1024).toFixed(1)} KB)`)
if (rejected.length) console.log(`dropped ${rejected.length} rows with impossible coordinates:\n  ${rejected.join('\n  ')}`)

// Spot-check the fallback: for the ZIPs that land on a prefix row, how often
// does it name the same nearest shop the ZIP's own coordinates would? Grouping
// is a compression, and this is what it costs.
const byPrefix = new Map(out.map((r) => [r.slice(0, 3), Number(r.split(' ')[2][0])]))
let checked = 0
let agree = 0
let worst = 0
let worstAt = 'nowhere'
for (const [zip, c] of coords) {
  if (isNear.has(zip)) continue
  const areaTop = byPrefix.get(zip.slice(0, 3))
  if (areaTop === undefined) continue
  const truth = nearest(c)[0]
  checked++
  if (areaTop === truth.i) agree++
  // Only worth measuring where the number means something. Past a few hundred
  // miles the reply is "not near you" whatever the digits say.
  if (truth.d > 300) continue
  const quoted = Number(out.find((r) => r.startsWith(zip.slice(0, 3))).split(' ')[1])
  if (!quoted) continue // row declines to quote a distance
  if (Math.abs(quoted - truth.d) > worst) {
    worst = Math.abs(quoted - truth.d)
    worstAt = `${zip} (quoted ${quoted}, actually ${truth.d.toFixed(0)})`
  }
}
console.log(`fallback names the right nearest shop for ${((agree / checked) * 100).toFixed(1)}% of the ${checked} ZIPs that use it`)
console.log(`worst quoted distance within 300 miles: off by ${worst.toFixed(0)} miles at ${worstAt}`)
console.log(`${out.filter((r) => r.split(' ')[1] === '0').length} of ${out.length} prefixes are too spread out to quote a distance`)
