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
 * ZIP lookup, three digits at a time.
 *
 * The site is a static build on GitHub Pages, so there is no geocoder to call
 * and no room to ship a full ZIP-to-coordinates table. What it does instead is
 * match the first three digits of the ZIP, which is the postal sectional centre
 * and is enough to say which corner of which metro someone is in. Each entry
 * below lists the shops in that area, nearest-first by road, and every prefix
 * here is one of ATL's own trading areas rather than a guess at the whole
 * country: type a ZIP outside them and the lookup says so rather than pointing
 * at a shop three states away.
 *
 * An exact ZIP match is reported differently from a prefix match, because one
 * of them means "this shop is in your ZIP" and the other only means "near".
 */
const ZIP_AREAS = {
  // Nassau County
  '110': ['garden-city-park', 'lynbrook', 'east-meadow'],
  '115': ['east-meadow', 'lynbrook', 'garden-city-park'],
  '116': ['lynbrook', 'garden-city-park', 'east-meadow'],
  // Suffolk County
  '117': ['babylon-village', 'north-babylon', 'copiague'],
  // Queens and Brooklyn
  '113': ['richmond-hill', 'garden-city-park'],
  '114': ['richmond-hill', 'garden-city-park'],
  '111': ['richmond-hill'],
  '112': ['richmond-hill'],
  // Manhattan and the Bronx
  '100': ['east-harlem'],
  '101': ['east-harlem'],
  '102': ['east-harlem'],
  '104': ['east-harlem'],
  // Essex County, New Jersey
  '070': ['south-orange'],
  '071': ['south-orange'],
  '072': ['south-orange'],
  '073': ['south-orange'],
  '074': ['south-orange'],
  // Inland Empire, California
  '923': ['redlands'],
  '924': ['redlands'],
  '925': ['redlands'],
}

const byId = Object.fromEntries(LOCATIONS.map((l) => [l.id, l]))

/**
 * @returns {{status: 'empty'|'invalid'|'exact'|'near'|'none', zip: string, shops: object[]}}
 */
export function findByZip(input) {
  const zip = String(input || '').trim().slice(0, 5)
  if (!zip) return { status: 'empty', zip, shops: [] }
  if (!/^\d{5}$/.test(zip)) return { status: 'invalid', zip, shops: [] }

  const exact = LOCATIONS.filter((l) => l.zip === zip)
  const area = (ZIP_AREAS[zip.slice(0, 3)] || []).map((id) => byId[id])
  if (exact.length) {
    const rest = area.filter((l) => !exact.includes(l))
    return { status: 'exact', zip, shops: [...exact, ...rest].slice(0, 3) }
  }
  if (area.length) return { status: 'near', zip, shops: area.slice(0, 3) }
  return { status: 'none', zip, shops: [] }
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
