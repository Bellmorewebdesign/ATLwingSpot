// Current / seeded locations. Hours are intentionally NOT hardcoded —
// they're location-specific and change. Directions links are generated
// from the address at render time.

export const LOCATIONS = [
  { id: 'east-meadow', name: 'East Meadow', street: '1860 Front St', city: 'East Meadow', state: 'NY', zip: '11554', region: 'Long Island' },
  { id: 'lynbrook', name: 'Lynbrook', street: '97 Broadway', city: 'Lynbrook', state: 'NY', zip: '11563', region: 'Long Island' },
  { id: 'garden-city-park', name: 'Garden City Park', street: '2441 Jericho Tpke', city: 'Garden City Park', state: 'NY', zip: '11040', region: 'Long Island' },
  { id: 'copiague', name: 'Copiague', street: '854 Montauk Hwy', city: 'Copiague', state: 'NY', zip: '11726', region: 'Long Island' },
  { id: 'north-babylon', name: 'North Babylon', street: '1290 Deer Park Ave', city: 'North Babylon', state: 'NY', zip: '11703', region: 'Long Island' },
  { id: 'babylon-village', name: 'Babylon Village', street: '14 Railroad Ave', city: 'Babylon', state: 'NY', zip: '11702', region: 'Long Island' },
  { id: 'richmond-hill', name: 'Richmond Hill', street: '87-17 Lefferts Blvd', city: 'Richmond Hill', state: 'NY', zip: '11418', region: 'Queens' },
  { id: 'east-harlem', name: 'East Harlem', street: '2128 2nd Ave', city: 'New York', state: 'NY', zip: '10029', region: 'Manhattan' },
  { id: 'south-orange', name: 'South Orange', street: '319 South Orange Ave', city: 'South Orange', state: 'NJ', zip: '07079', region: 'New Jersey' },
  { id: 'redlands', name: 'Redlands', street: '1755 E Lugonia Ave, Suite 210', city: 'Redlands', state: 'CA', zip: '92374', region: 'California' },
]

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
