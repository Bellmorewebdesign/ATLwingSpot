// Structured data (schema.org JSON-LD) for search engines.
//
// Everything here is built from the same data the pages show, so it cannot say
// something the page does not: the shops come from locations.js, the dishes
// from menu.js, the page names and URLs from routes.js. Nothing is typed in by
// hand except the brand facts at the top, which are already on the site.
//
// Deliberately absent, because the site does not publish them: prices, price
// range, ratings, reviews and map coordinates.

import { PAGES, SITE_ORIGIN, SITE_NAME, canonicalUrl } from './routes'
import { ORDER_URL, SOCIAL } from './site'
import { LOCATIONS, mapsUrl } from './locations'
import { MENU_CATEGORIES, MENU_ITEMS } from './menu'
import { parseHours } from './hours'

const abs = (path) => `${SITE_ORIGIN}/${String(path).replace(/^\/+/, '')}`

const ORG_ID = `${SITE_ORIGIN}/#organization`
const SITE_ID = `${SITE_ORIGIN}/#website`
const CUISINE = ['Chicken Wings', 'American', 'Halal']
const HERO_IMAGE = abs('assets/food/hero-wings.jpg')

// The brand itself. A chain with many shops is an Organization; each shop is
// its own Restaurant (see locationsData) that points back here.
export function organizationData() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': ORG_ID,
        name: SITE_NAME,
        url: canonicalUrl(PAGES.home.path),
        logo: abs('assets/brand/atl-wing-spot-logo.png'),
        image: HERO_IMAGE,
        sameAs: [SOCIAL.instagram, SOCIAL.tiktok],
      },
      {
        '@type': 'WebSite',
        '@id': SITE_ID,
        name: SITE_NAME,
        url: canonicalUrl(PAGES.home.path),
        publisher: { '@id': ORG_ID },
      },
    ],
  }
}

// "(516) 218-2245" -> "+15162182245"
const e164 = (phone) => {
  const d = String(phone).replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '')
  return d.length === 10 ? `+1${d}` : null
}

function restaurant(loc) {
  const hours = parseHours(loc.hours)
  const phone = loc.phone && e164(loc.phone)
  return {
    '@type': 'Restaurant',
    '@id': `${canonicalUrl(PAGES.locations.path)}#${loc.id}`,
    name: `${SITE_NAME} ${loc.name}`,
    url: canonicalUrl(PAGES.locations.path),
    image: HERO_IMAGE,
    address: {
      '@type': 'PostalAddress',
      streetAddress: loc.street,
      addressLocality: loc.city,
      addressRegion: loc.state,
      postalCode: loc.zip,
      addressCountry: 'US',
    },
    ...(phone && { telephone: phone }),
    ...(hours.length && {
      openingHoursSpecification: hours.map((h) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: h.days,
        opens: h.opens,
        closes: h.closes,
      })),
    }),
    servesCuisine: CUISINE,
    hasMenu: canonicalUrl(PAGES.menu.path),
    hasMap: mapsUrl(loc),
    acceptsReservations: false,
    parentOrganization: { '@id': ORG_ID },
    potentialAction: { '@type': 'OrderAction', target: ORDER_URL },
  }
}

// One Restaurant per open shop. A temporarily closed shop is left out rather
// than advertised to search engines as open.
export function locationsData() {
  return {
    '@context': 'https://schema.org',
    '@graph': LOCATIONS.filter((l) => !l.tempClosed).map(restaurant),
  }
}

// The menu: sections and dishes, with photos where there is one. No prices,
// because the site shows none (they vary by shop).
export function menuData() {
  const sections = MENU_CATEGORIES.filter((c) => c.id !== 'all')
    .map((c) => ({
      '@type': 'MenuSection',
      name: c.label,
      hasMenuItem: MENU_ITEMS.filter((i) => i.cat === c.id).map((i) => ({
        '@type': 'MenuItem',
        name: i.name,
        description: i.desc,
        ...(i.image && { image: abs(i.image) }),
      })),
    }))
    .filter((s) => s.hasMenuItem.length)
  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    '@id': `${canonicalUrl(PAGES.menu.path)}#menu`,
    name: `${SITE_NAME} Menu`,
    url: canonicalUrl(PAGES.menu.path),
    inLanguage: 'en-US',
    hasMenuSection: sections,
  }
}

// Home > Catering > Book catering. Pass the pages from the top down, not
// including Home.
export function breadcrumbData(...pages) {
  const trail = [PAGES.home, ...pages]
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: p.name,
      item: canonicalUrl(p.path),
    })),
  }
}
