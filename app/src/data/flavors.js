// FLAVOURS — real ATL sauce names only.
// ATL advertises 25+ sauces and rubs; this is a featured selection, and the
// UI says so. Heat tiers mirror ATL's own Mild / Medium / Hot grouping, with
// a fourth "No Fear" tier for 911. Descriptors stay playful and never claim
// an ingredient the flavour name doesn't already state.

export const HEAT_LEVELS = [
  { id: 1, label: 'Mild',    blurb: 'All flavor, no burn.',         color: '#22c1da' },
  { id: 2, label: 'Medium',  blurb: 'A little kick. Nothing scary.', color: '#f4a020' },
  { id: 3, label: 'Hot',     blurb: 'Now you feel it.',              color: '#f4601f' },
  { id: 4, label: 'No Fear', blurb: 'Ask for extra ranch.',          color: '#e0342a' },
]

export const STYLES = [
  { id: 'wet', label: 'Wet',     blurb: 'Tossed and dripping.' },
  { id: 'dry', label: 'Dry Rub', blurb: 'Seasoned, no sauce.' },
]

export const FLAVORS = [
  { id: 'garlic-parm',   name: 'Buttery Garlic Parmesan', heat: 1, style: 'wet', blurb: 'The one nobody argues about.' },
  { id: 'sweet-teriyaki',name: 'Sweet Teriyaki',          heat: 1, style: 'wet', blurb: 'Sticky and sweet.' },
  { id: 'lemon-pepper',  name: 'Lemon Pepper',            heat: 1, style: 'dry', blurb: 'Classic. Comes wet or dry.' },
  { id: 'honeycomb',     name: 'Honeycomb Garlic',        heat: 1, style: 'wet', blurb: 'Sweet garlic, no heat.' },
  { id: 'pineapple-bbq', name: 'Pineapple BBQ',           heat: 1, style: 'wet', blurb: 'BBQ that went on vacation.' },
  { id: 'chipotle-bbq',  name: 'Chipotle BBQ',            heat: 2, style: 'wet', blurb: 'Smoky with a slow build.' },
  { id: 'honey-sriracha',name: 'Honey Sriracha',          heat: 2, style: 'wet', blurb: 'Sweet first, heat second.' },
  { id: 'stingin-honey', name: "Stingin' Honey Garlic",   heat: 2, style: 'wet', blurb: 'Honey with a sting.' },
  { id: 'jerk',          name: 'Jamaican Jerk',           heat: 2, style: 'dry', blurb: 'Heavy on the seasoning.' },
  { id: 'coconut-heat',  name: 'Coconut Sweet Heat',      heat: 2, style: 'wet', blurb: 'A regular on the highlight reel.' },
  { id: 'cajun-buffalo', name: 'Cajun Buffalo',           heat: 3, style: 'wet', blurb: 'Buffalo with Cajun on top.' },
  { id: 'hot-honey-lp',  name: 'Hot Honey Lemon Pepper',  heat: 3, style: 'wet', blurb: 'Three good ideas at once.' },
  { id: 'nashville',     name: 'Nashville Hot',           heat: 3, style: 'dry', blurb: 'Cayenne, and plenty of it.' },
  { id: 'mango-hab',     name: 'Mango Habanero',          heat: 3, style: 'wet', blurb: 'Sweet up front. Habanero after.' },
  { id: '911',           name: '911 Sauce',               heat: 4, style: 'wet', blurb: 'You were warned.' },
]

export const FLAVOR_COUNT = '25+'
