// Brand-level constants + external links. Facts only.

// We run Snackpass across our restaurants. Every ordering control on the site
// points here — there is no internal checkout, and no other ATL page to defer to.
export const ORDER_URL = 'https://order.snackpass.co/atlwingspot'

// One label for every ordering control, so the path reads the same everywhere.
export const ORDER_LABEL = 'Order Now'

// Catering runs through DoorDash, separately from everyday ordering.
//
// TODO: replace with the direct DoorDash catering link once it is to hand. This
// is DoorDash's own store search for the brand, so it resolves to whichever ATL
// shops DoorDash lists near the visitor rather than pointing at one store, but
// it is a search rather than the catering storefront itself.
export const CATERING_URL = 'https://www.doordash.com/search/store/atl%20wing%20spot/'

export const SOCIAL = {
  instagram: 'https://www.instagram.com/atlwingspot/',
  tiktok: 'https://www.tiktok.com/@atlwingspot',
}

export const BRAND = {
  name: 'ATL Wing Spot',
  handle: '@atlwingspot',
  flavorCount: '25+',
}

// The repeating word-stripe is lifted from ATL's real cyan takeout box.
export const BOX_WORDS = ['Wings', 'Tenders', 'Munchies', 'Waffles', 'Shakes']

// Marquee content — brand truths only.
export const TICKER = [
  '100% Halal',
  'Fresh, never frozen',
  '25+ sauces',
  'Fried to order',
  'Pickup + delivery',
  'Best wings on Long Island',
]
