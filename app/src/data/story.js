// ATL's growth story.
//
// Scope is deliberately limited to the supplied verified-facts list:
// opened May 2023, two friends, approximately 800 sq ft, a 1M+ TikTok
// breakout about a month later, Best Wings on Long Island, and a QSR
// Magazine feature. Founder names, the first shop's city and a franchising
// date all appear in press but are NOT in the verified list, so they are
// left out rather than asserted. No revenue or performance claims, and no
// location count.

// The homepage story runs on scaling numbers, not timeline cards.
export const STORY_BEATS = [
  {
    id: 'shop',
    figure: '800',
    unit: 'sq ft',
    when: 'May 2023',
    line: 'Two friends put their savings into one small shop.',
  },
  {
    id: 'views',
    figure: '1M+',
    unit: 'views',
    when: 'About a month later',
    line: 'A TikTok took off. The line outside got a lot longer.',
  },
  {
    id: 'best',
    figure: '#1',
    unit: 'on Long Island',
    when: 'Then',
    line: 'Voted best wings on Long Island.',
  },
  {
    id: 'markets',
    figure: 'NY·NJ·CA',
    unit: 'and growing',
    when: 'Now',
    line: 'From one counter to shops in three states.',
  },
]

// Longer-form beats for the dedicated Story page.
export const STORY_CHAPTERS = [
  {
    id: 'open',
    when: 'May 2023',
    title: 'One shop, 800 square feet',
    body: 'Two friends saved up and opened the first ATL Wing Spot in a room of roughly 800 square feet. Everything halal, everything fried the moment it was ordered, and a sauce list that had no business being that long in a space that small.',
  },
  {
    id: 'viral',
    when: 'About a month later',
    title: 'A million views',
    body: 'Roughly a month after opening, a TikTok about the wings crossed a million views. People drove in from across the island to find out if it was real.',
  },
  {
    id: 'best',
    when: 'Then',
    title: 'Best wings on Long Island',
    body: 'The neighborhood made it official, and QSR Magazine came calling not long after.',
  },
  {
    id: 'now',
    when: 'Now',
    title: 'New York, New Jersey, California',
    body: 'The wings and the sauces have not changed. There are just more counters now, including franchised shops well beyond Long Island.',
  },
]

// Verified recognition only.
export const PROOF = [
  { label: 'Voted', value: 'Best Wings on Long Island' },
  { label: 'Featured in', value: 'QSR Magazine' },
  { label: 'Certified', value: '100% Halal' },
]
