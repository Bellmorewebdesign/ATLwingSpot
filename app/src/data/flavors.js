// FLAVOURS — real ATL sauce names only.
// ATL advertises 25+ sauces and rubs; this is a featured selection, and the
// UI says so. Heat tiers mirror ATL's own Mild / Medium / Hot grouping, with
// a fourth "No Fear" tier for 911. Descriptors stay playful and never claim
// an ingredient the flavour name doesn't already state.

export const HEAT_LEVELS = [
  { id: 1, label: 'Mild',    blurb: 'All flavor, no burn.',         color: '#22c1da' },
  { id: 2, label: 'Medium',  blurb: 'A little kick. Nothing scary.', color: '#f4a020' },
  { id: 3, label: 'Hot',     blurb: 'Now you feel it.',              color: '#f4601f' },
  // deep red rather than the bright one: this tier carries cream type, and
  // neither cream nor ink clears AA for body text on the brighter shade
  { id: 4, label: 'No Fear', blurb: 'Ask for extra ranch.',          color: '#b52a1e' },
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

// SAUCE METER — the client's "SAUCE IT UP FLAVORS!" heat chart, hottest first.
// The order is the client's and is the source of truth for the meter.
//
// `group` picks the bar colour (SAUCE_HEAT_GROUPS, red through green).
// `len` is the bar's relative length, 100 = longest, 0 = shortest; the meter
// keeps even the shortest bar wide enough to hold its name.
// `isNew` adds the small "NEW" tag.
export const SAUCE_HEAT_GROUPS = {
  fire:   { color: '#e5242b', text: '#ffffff' },
  hot:    { color: '#f04e23', text: '#121012' },
  warm:   { color: '#f47c20', text: '#121012' },
  medium: { color: '#fbad18', text: '#121012' },
  mild:   { color: '#c4d72e', text: '#121012' },
  cool:   { color: '#4cb748', text: '#121012' },
}

export const SAUCE_METER = [
  { name: '911 Sauce',                 group: 'fire',   len: 100 },
  { name: 'Mango Habanero',            group: 'fire',   len: 96 },
  { name: 'Hot Buffalo 2.0',           group: 'fire',   len: 93 },
  { name: 'Jamaican Jerk',             group: 'fire',   len: 89 },
  { name: 'Nashville Hot',             group: 'hot',    len: 86 },
  { name: 'Lemon Pepper Hot',          group: 'hot',    len: 82 },
  { name: 'Cajun Buffalo',             group: 'hot',    len: 79 },
  { name: 'Hot Honey Garlic',          group: 'hot',    len: 75, isNew: true },
  { name: 'Coconut Sweet Heat',        group: 'hot',    len: 71 },
  { name: 'Hot Honey Lemon Pepper',    group: 'warm',   len: 68 },
  { name: 'Honey Sriracha',            group: 'warm',   len: 64 },
  { name: 'Buffalo',                   group: 'warm',   len: 61 },
  { name: 'Hot Honey',                 group: 'warm',   len: 57 },
  { name: 'Chipotle BBQ',              group: 'warm',   len: 54 },
  { name: 'Honey Garlic Lemon Pepper', group: 'medium', len: 50 },
  { name: 'Sweet Chilli',              group: 'medium', len: 46 },
  { name: 'Hawaiian Sweet N Sour',     group: 'medium', len: 43 },
  { name: 'Gold BBQ',                  group: 'medium', len: 39 },
  { name: 'Cajun (Rub)',               group: 'medium', len: 36 },
  { name: 'Pineapple BBQ',             group: 'mild',   len: 32 },
  { name: 'Sweet Teriyaki',            group: 'mild',   len: 29 },
  { name: 'Old Bay (Rub)',             group: 'mild',   len: 25 },
  { name: 'Buttery Garlic Parmesan',   group: 'mild',   len: 21 },
  { name: 'Hickory Smoked BBQ',        group: 'mild',   len: 18 },
  { name: 'Chipotle Honey (Rub)',      group: 'cool',   len: 14 },
  { name: 'Honeycomb Garlic',          group: 'cool',   len: 11 },
  { name: 'Honey BBQ',                 group: 'cool',   len: 7 },
  { name: 'Lemon Pepper (Rub)',        group: 'cool',   len: 4 },
  { name: 'Lemon Pepper (Wet)',        group: 'cool',   len: 0 },
]
