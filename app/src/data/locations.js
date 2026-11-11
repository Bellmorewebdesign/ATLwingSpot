// Every ATL Wing Spot shop. Source of truth: our Snackpass ordering page
// (https://order.snackpass.co/atlwingspot). Names and addresses match the
// store list there as of November 2026.
//
// Fields
//   state     two-letter code. The locations page groups shops by state, in
//             STATES order below, so a new state needs a row there too.
//   area      extra words the search box matches (borough, neighborhood,
//             "Long Island"). Never shown, only searched.
//   phone     null hides the phone line on the card and in the ZIP lookup.
//   hours     null hides the hours line. A short string when set, e.g.
//             'Daily 11am–1am'. Copy it from a published listing, never
//             from an "Open now / Closed" badge, which only describes the
//             moment the page was looked at.
//   tempClosed  true shows a "Temporarily closed" label and hides the shop's
//             Order Now button (directions stay). Delete it when the shop
//             reopens.
//
// Phones and hours come from public listings (mostly each shop's Google
// listing), checked with the client in November 2026. Every Order Now button
// uses the one brand ordering link (ORDER_URL in site.js); guests pick their
// shop on Snackpass.
//
// Still open:
//   - Jersey City is temporarily closed and has no hours. Add them, and remove
//     tempClosed, when it reopens.
//   - Pittsburgh has no hours shown. Its Google listing says daily 11am to
//     10pm, but ATL reports Snackpass showing Sun to Thu 11am to 2am and Fri
//     to Sat 11am to 3am. Fill in whichever the shop confirms.
//
// Do not put a "]" inside any value: app/scripts/build-zip-areas.mjs reads
// this list as text. After adding, moving or closing a shop, re-run that script
// so the ZIP lookup knows about it (see the README).

import { SHOP_IDS, ZIP_NEAR, ZIP_AREAS } from './zip-areas'

export const LOCATIONS = [
  { id: 'east-meadow', name: 'East Meadow', street: '1860 Front St', city: 'East Meadow', state: 'NY', zip: '11554', area: 'Long Island, Nassau', phone: '(516) 833-9464', hours: 'Daily 11am–1am' },
  { id: 'lynbrook', name: 'Lynbrook', street: '97 Broadway', city: 'Lynbrook', state: 'NY', zip: '11563', area: 'Long Island, Nassau', phone: '(516) 218-2245', hours: 'Sun–Thu 10:30am–midnight · Fri–Sat 10:30am–1am' },
  { id: 'copiague', name: 'Copiague', street: '854 Montauk Hwy', city: 'Copiague', state: 'NY', zip: '11726', area: 'Long Island, Suffolk', phone: '(631) 531-5538', hours: 'Daily 11am–10pm' },
  { id: 'garden-city-park', name: 'Garden City Park', street: '2441 Jericho Tpke', city: 'Garden City Park', state: 'NY', zip: '11040', area: 'Long Island, Nassau', phone: '(516) 916-4199', hours: 'Sun–Thu 10:30am–midnight · Fri–Sat 10:30am–1am' },
  { id: 'babylon', name: 'Babylon', street: '14B Railroad Ave', city: 'Babylon', state: 'NY', zip: '11702', area: 'Long Island, Suffolk, Babylon Village', phone: '(631) 314-4161', hours: 'Daily 10am–4am' },
  { id: 'north-babylon', name: 'North Babylon', street: '1290 Deer Park Ave', city: 'North Babylon', state: 'NY', zip: '11703', area: 'Long Island, Suffolk', phone: '(631) 940-8916', hours: 'Daily 11am–midnight' },
  { id: 'jamaica', name: 'Jamaica', street: '87-17 Lefferts Blvd', city: 'Jamaica', state: 'NY', zip: '11418', area: 'Queens, Richmond Hill', phone: '(718) 674-6034', hours: 'Sun–Thu 11am–midnight · Fri–Sat 11am–2am' },
  { id: 'manhattan', name: 'Manhattan', street: '2128 2nd Ave, Front A', city: 'New York', state: 'NY', zip: '10029', area: 'Manhattan, East Harlem, NYC', phone: '(646) 454-9162', hours: 'Daily 11am–4am' },
  { id: 'jersey-city', name: 'Jersey City', street: '588 West Side Ave', city: 'Jersey City', state: 'NJ', zip: '07304', area: 'Hudson County', phone: '(201) 356-9139', hours: null, tempClosed: true },
  { id: 'linden', name: 'Linden', street: '1600 E St Georges Ave', city: 'Linden', state: 'NJ', zip: '07036', area: 'Union County', phone: '(609) 689-5201', hours: 'Daily 11am–midnight' },
  { id: 'south-orange', name: 'South Orange', street: '319 S Orange Ave', city: 'South Orange Village', state: 'NJ', zip: '07079', area: 'Essex County, South Orange Avenue', phone: '(973) 275-1234', hours: 'Daily 11am–1am' },
  { id: 'pittsburgh', name: 'Pittsburgh', street: '412 Semple St', city: 'Pittsburgh', state: 'PA', zip: '15213', area: 'Oakland, Allegheny County', phone: '(412) 282-8268', hours: null },
  { id: 'frisco', name: 'Frisco', street: '6363 Dallas Pkwy, Suite 107', city: 'Frisco', state: 'TX', zip: '75034', area: 'Dallas, DFW, Collin County', phone: '(214) 308-9704', hours: 'Sun–Thu 10:30am–10:30pm · Fri–Sat 10:30am–midnight' },
  { id: 'redlands', name: 'Redlands', street: '1755 E Lugonia Ave, Suite 210', city: 'Redlands', state: 'CA', zip: '92374', area: 'Inland Empire, San Bernardino County', phone: '(909) 321-4746', hours: 'Sun–Thu 11am–midnight · Fri–Sat 11am–1am' },
]

// Shops ATL has announced but not opened (Wally, by email, 8 Nov 2026). City
// and state only: no address, phone or hours until a shop opens, at which point
// it moves into LOCATIONS above (and the ZIP table is rebuilt). They are listed
// on the locations page and are not part of the ZIP lookup or the shop count.
export const COMING_SOON = [
  { city: 'Brooklyn', state: 'NY' },
  { city: 'Centereach', state: 'NY' },
  { city: 'Farmingdale', state: 'NY' },
  { city: 'Nutley', state: 'NJ' },
  { city: 'Sewell', state: 'NJ' },
  { city: 'Towson', state: 'MD' },
  { city: 'Greenfield', state: 'WI' },
  { city: 'Milwaukee', state: 'WI' },
]

// The state categories on the locations page and the home page band, in the
// order they are shown. A state with no shops is skipped.
export const STATES = [
  { id: 'NY', label: 'New York' },
  { id: 'NJ', label: 'New Jersey' },
  { id: 'PA', label: 'Pennsylvania' },
  { id: 'TX', label: 'Texas' },
  { id: 'CA', label: 'California' },
]

export const stateName = (code) => STATES.find((s) => s.id === code)?.label || code

// STATES that actually have a shop, each with its shops.
export const STATE_GROUPS = STATES
  .map((s) => ({ ...s, shops: LOCATIONS.filter((l) => l.state === s.id) }))
  .filter((s) => s.shops.length)

/**
 * ZIP lookup.
 *
 * Nobody should have to type a ZIP we happen to be in. Any US ZIP resolves to
 * the shops actually closest to it, and the answer says how far away that is
 * rather than implying it is around the corner.
 *
 * The site is a static build on GitHub Pages, so there is no geocoder to call
 * and no sensible way to ship 42,000 ZIP coordinates for a phone-number
 * lookup. The tables below are generated from real coordinates by
 * app/scripts/build-zip-areas.mjs, which explains the trade in full and prints
 * what the compression costs: the prefix fallback names the same nearest shop
 * the ZIP's own coordinates would for 99% of the ZIPs that use it, and a
 * quoted distance is never more than fifteen miles or a quarter out.
 */

const byId = Object.fromEntries(LOCATIONS.map((l) => [l.id, l]))

/* Two tables, because precision only matters nearby: ZIP_NEAR is keyed by
   exact ZIP and covers everything within about forty miles of a shop, and
   ZIP_AREAS is keyed by the first three digits for the rest of the country.
   A prefix row carries 0 for the distance when its area is too spread out for
   one number to be true of all of it, and the copy then names the shop without
   claiming a distance. */
const parse = (table, floor) =>
  new Map(
    table.trim().split('\n').map((row) => {
      const [key, miles, picks] = row.split(' ')
      return [key, { miles: Math.max(floor, Number(miles)), ids: [...picks].map((i) => SHOP_IDS[parseInt(i, 36)]) }]
    })
  )

// A real ZIP a few hundred yards from a shop rounds to 0; floor it at 1 so it
// reads as near rather than as a row with no distance.
const NEAR = parse(ZIP_NEAR, 1)
const AREAS = parse(ZIP_AREAS, 0)

// Anything under this reads as "your area"; past it the answer says how far.
const NEAR_MILES = 25

/**
 * Rounded so the number never claims more precision than it has: nearest five
 * under a hundred miles, nearest ten above. The UI always words it "about".
 */
export function approxMiles(n) {
  const step = n < 100 ? 5 : 10
  return Math.max(step, Math.round(n / step) * step)
}

/**
 * @returns {{status: 'empty'|'invalid'|'exact'|'near'|'far'|'none', zip: string, miles: number, shops: object[]}}
 */
export function findByZip(input) {
  const zip = String(input || '').trim().slice(0, 5)
  if (!zip) return { status: 'empty', zip, miles: 0, shops: [] }
  if (!/^\d{5}$/.test(zip)) return { status: 'invalid', zip, miles: 0, shops: [] }

  const hit = NEAR.get(zip) || AREAS.get(zip.slice(0, 3))
  // Unassigned prefixes, military blocks and typos land here. Nothing is
  // guessed for them: they get told we do not know the ZIP.
  if (!hit) return { status: 'none', zip, miles: 0, shops: [] }

  const close = hit.ids.map((id) => byId[id]).filter(Boolean)
  const exact = LOCATIONS.filter((l) => l.zip === zip)

  if (exact.length) {
    const rest = close.filter((l) => !exact.includes(l))
    return { status: 'exact', zip, miles: 0, shops: [...exact, ...rest].slice(0, 3) }
  }
  if (hit.miles && hit.miles <= NEAR_MILES) {
    return { status: 'near', zip, miles: hit.miles, shops: close.slice(0, 3) }
  }
  // Far enough that a list of three is just noise: name the closest couple.
  return { status: 'far', zip, miles: hit.miles, shops: close.slice(0, 2) }
}

// Digits only, formatted for display; null stays null.
export function formatPhone(phone) {
  if (!phone) return null
  const d = String(phone).replace(/\D/g, '').replace(/^1/, '')
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : String(phone)
}

// Build a Google Maps directions/search URL from an address.
export function mapsUrl(loc) {
  const q = encodeURIComponent(`ATL Wing Spot, ${loc.street}, ${loc.city}, ${loc.state} ${loc.zip}`)
  return `https://www.google.com/maps/search/?api=1&query=${q}`
}
