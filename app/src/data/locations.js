// Current / seeded locations. Hours are intentionally NOT hardcoded —
// they're location-specific and change. Directions links are generated
// from the address at render time.
//
// Phone numbers as supplied by the client. Most came off atlwingspot.com;
// Copiague came from Restaurantji and Babylon Village from Apple Maps, so those
// two are the ones to re-check if a call ever bounces.
//
// The ZIP lookup and the location cards render the phone line only when a
// number is present, so a shop without one degrades to address + directions
// rather than breaking.

import { SHOP_IDS, ZIP_NEAR, ZIP_AREAS } from './zip-areas'

export const LOCATIONS = [
  { id: 'east-meadow', name: 'East Meadow', street: '1860 Front St', city: 'East Meadow', state: 'NY', zip: '11554', region: 'Long Island', phone: '(516) 833-9464' },
  { id: 'lynbrook', name: 'Lynbrook', street: '97 Broadway', city: 'Lynbrook', state: 'NY', zip: '11563', region: 'Long Island', phone: '(516) 218-2245' },
  { id: 'garden-city-park', name: 'Garden City Park', street: '2441 Jericho Tpke', city: 'Garden City Park', state: 'NY', zip: '11040', region: 'Long Island', phone: '(516) 916-4199' },
  { id: 'copiague', name: 'Copiague', street: '854 Montauk Hwy', city: 'Copiague', state: 'NY', zip: '11726', region: 'Long Island', phone: '(631) 531-5538' },
  { id: 'north-babylon', name: 'North Babylon', street: '1290 Deer Park Ave', city: 'North Babylon', state: 'NY', zip: '11703', region: 'Long Island', phone: '(631) 940-8916' },
  { id: 'babylon-village', name: 'Babylon Village', street: '14 Railroad Ave', city: 'Babylon', state: 'NY', zip: '11702', region: 'Long Island', phone: '(631) 314-4161' },
  { id: 'richmond-hill', name: 'Richmond Hill', street: '87-17 Lefferts Blvd', city: 'Richmond Hill', state: 'NY', zip: '11418', region: 'Queens', phone: '(718) 674-6034' },
  { id: 'east-harlem', name: 'East Harlem', street: '2128 2nd Ave', city: 'New York', state: 'NY', zip: '10029', region: 'Manhattan', phone: '(646) 454-9162' },
  { id: 'south-orange', name: 'South Orange', street: '319 South Orange Ave', city: 'South Orange', state: 'NJ', zip: '07079', region: 'New Jersey', phone: '(973) 275-1234' },
  { id: 'redlands', name: 'Redlands', street: '1755 E Lugonia Ave, Suite 210', city: 'Redlands', state: 'CA', zip: '92374', region: 'California', phone: '(909) 321-4746' },
]

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
      return [key, { miles: Math.max(floor, Number(miles)), ids: [...picks].map((i) => SHOP_IDS[Number(i)]) }]
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

export const STATE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'NY', label: 'New York' },
  { id: 'NJ', label: 'New Jersey' },
  { id: 'CA', label: 'California' },
]

// Homepage teaser regions (dramatic, not a full address dump).
export const FEATURED_REGIONS = [
  { id: 'long-island', name: 'Long Island', state: 'NY', count: 6, note: 'Where it started' },
  { id: 'queens', name: 'Queens', state: 'NY', count: 1, note: 'Richmond Hill' },
  { id: 'new-jersey', name: 'New Jersey', state: 'NJ', count: 1, note: 'South Orange' },
  { id: 'california', name: 'California', state: 'CA', count: 1, note: 'Redlands' },
]

// Build a Google Maps directions/search URL from an address.
export function mapsUrl(loc) {
  const q = encodeURIComponent(`ATL Wing Spot, ${loc.street}, ${loc.city}, ${loc.state} ${loc.zip}`)
  return `https://www.google.com/maps/search/?api=1&query=${q}`
}
