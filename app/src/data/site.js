// Brand-level constants + external links. Facts only.

// We run Snackpass across our restaurants. Every ordering control on the site
// points here — there is no internal checkout, and no other ATL page to defer to.
export const ORDER_URL = 'https://order.snackpass.co/atlwingspot'

// One label for every ordering control, so the path reads the same everywhere.
export const ORDER_LABEL = 'Order Now'

// Online catering is not live yet, so nothing links to this. The catering page
// takes orders by phone and shows the DoorDash route as coming soon.
//
// TODO: replace with the direct DoorDash catering link when it launches, then
// enable the button in pages/Catering.jsx. What is here now is DoorDash's own
// store search for the brand, which finds the shops but cannot take a catering
// order, so it is a placeholder rather than something to ship.
export const CATERING_URL = 'https://www.doordash.com/search/store/atl%20wing%20spot/'

// The franchising form posts here. A public HTTPS endpoint, nothing secret:
// the recipient address, the SES identity and the rate-limit key all live in
// the Lambda's environment and never reach the browser. Handler and setup are
// in aws/franchise-form/.
export const FRANCHISE_ENDPOINT =
  'https://jva4k2azf7.execute-api.us-east-1.amazonaws.com/franchise'

// Cloudflare Turnstile. This is the PUBLIC site key: it is meant to be in the
// page, it identifies the widget and nothing else. The secret that verifies a
// token lives only in the Lambda's TURNSTILE_SECRET and must never appear here.
export const TURNSTILE_SITE_KEY = '0x4AAAAAAFTZFqFTROkQAzkF'

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
