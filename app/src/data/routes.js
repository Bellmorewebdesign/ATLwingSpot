// Every page on the site, in one place.
//
// The app's router, the navigation, each page's <title>/description/canonical,
// the static HTML file the build writes for each page, sitemap.xml and the list
// of folders the publish step manages all read from this table. Add a page here
// and all of them pick it up.
//
// PATHS ARE PUBLIC URLS. They match the old WordPress site wherever that page
// still exists, because those are the URLs Google, Bing, Apple Maps and old
// shared links already point at:
//
//   old site               this site
//   /                      Home
//   /menu/                 Menu
//   /flavors/              Flavors
//   /locations/            Locations
//   /catering/             Catering
//   /about-us/             Our Story (the old "About Us" page)
//   /franchise/            Franchise
//
// /catering/book/ and /contact/ are new pages with no old equivalent found.
// Every path ends in "/": GitHub Pages serves <path>/index.html for it, and
// redirects the same path without the slash to this one.
//
// Each page has:
//   name         short label, used in breadcrumbs ("Menu")
//   title        the <title>, before " | ATL Wing Spot" is added. Written for
//                search results: say what the page is in words people search
//                for, and keep the whole title near 60 characters.
//   description  the search-result snippet, near 155 characters.
// Only say things here that the page itself backs up.
//
// This file is also imported by Node at build time (scripts/prerender-pages.mjs),
// so it must stay plain data: no JSX, no browser APIs, no imports.

export const SITE_ORIGIN = 'https://atlwingspot.com'
export const SITE_NAME = 'ATL Wing Spot'
export const HOME_TITLE = 'ATL Wing Spot | Fresh, Never Frozen Halal Wings. Stay Saucy.'

export const PAGES = {
  home: {
    path: '/',
    name: 'Home',
    title: null,
    description:
      'Fresh, never frozen wings fried to order in 25+ sauces. 100% halal. Voted best wings on Long Island. Order pickup or delivery across NY, NJ, PA, TX and CA.',
  },
  menu: {
    path: '/menu/',
    name: 'Menu',
    title: 'Menu: Wings, Tenders, Waffles & Loaded Fries',
    description:
      "The full ATL Wing Spot menu: halal bone-in wings, boneless wings, saucy tenders, chicken n' waffles, quesadillas, loaded waffle fries, shakes and more.",
  },
  flavors: {
    path: '/flavors/',
    name: 'Flavors',
    title: 'Wing Flavors: 25+ Sauces & Dry Rubs',
    description:
      '25+ wing sauces and dry rubs at ATL Wing Spot, from Buttery Garlic Parmesan and Lemon Pepper to Mango Habanero and 911 Sauce. Pick your heat, wet or dry.',
  },
  locations: {
    path: '/locations/',
    name: 'Locations',
    title: 'Locations in NY, NJ, PA, TX & CA',
    description:
      'Find your nearest ATL Wing Spot: addresses, phone numbers and hours for our halal wing shops in New York, New Jersey, Pennsylvania, Texas and California.',
  },
  catering: {
    path: '/catering/',
    name: 'Catering',
    title: 'Wing Catering: Trays of Wings & Tenders',
    description:
      'ATL Wing Spot catering. Trays of wings, tenders, mozzarella sticks and waffle fries for game day, the office or a party. Tell us the headcount.',
  },
  bookCatering: {
    path: '/catering/book/',
    parent: 'catering', // breadcrumb: Home > Catering > Book catering
    name: 'Book catering',
    title: 'Book Catering at Your Nearest Shop',
    description:
      'Find the ATL Wing Spot nearest your event and call them to book catering. Enter a ZIP code for the closest shops and their phone numbers.',
  },
  story: {
    path: '/about-us/',
    name: 'Our Story',
    title: 'About Us: Our Story',
    description:
      'ATL Wing Spot opened in May 2023 in a shop of about 800 square feet. A month later a TikTok crossed a million views. Here is what happened next.',
  },
  franchise: {
    path: '/franchise/',
    name: 'Franchise',
    title: 'Franchise Opportunities',
    description:
      'Open an ATL Wing Spot. Halal wings out of a compact kitchen with a digital-first customer base, proven on Long Island since 2023.',
  },
  contact: {
    path: '/contact/',
    name: 'Contact',
    title: 'Contact Us',
    description: 'Get in touch with ATL Wing Spot about an order, catering, franchising or one of our shops.',
  },
}

export const pageTitle = (page) => (page && page.title ? `${page.title} | ${SITE_NAME}` : HOME_TITLE)
export const canonicalUrl = (path) => SITE_ORIGIN + path

/*
 * Old links from when the site used "#/" URLs (HashRouter), e.g. a shared
 * https://atlwingspot.com/#/menu. Keyed by the old hash route. Anything not
 * listed falls through to "<route>/" and the router decides from there.
 */
export const LEGACY_HASH_ROUTES = {
  '/': PAGES.home.path,
  '/menu': PAGES.menu.path,
  '/flavors': PAGES.flavors.path,
  '/locations': PAGES.locations.path,
  '/catering': PAGES.catering.path,
  '/catering/book': PAGES.bookCatering.path,
  '/story': PAGES.story.path,
  '/franchise': PAGES.franchise.path,
  '/contact': PAGES.contact.path,
}

/**
 * Where a URL should really be, or null if it is already right.
 *
 *   /#/menu            -> /menu/
 *   /#/menu?cat=wings  -> /menu/?cat=wings
 *   /#/story           -> /about-us/
 *   /menu              -> /menu/   (known page missing its trailing slash)
 *
 * An ordinary in-page anchor (/catering/#request, /#main) is not a "#/" route
 * and is left exactly as it is.
 */
export function canonicalRedirect(pathname, search, hash) {
  if (hash && hash.startsWith('#/')) {
    const rest = hash.slice(1) // "/menu?cat=wings"
    const q = rest.indexOf('?')
    const route = (q === -1 ? rest : rest.slice(0, q)).replace(/\/+$/, '') || '/'
    const query = q === -1 ? '' : rest.slice(q)
    const target = LEGACY_HASH_ROUTES[route] || `${route}/`
    return target + (query || search || '')
  }
  if (!pathname.endsWith('/')) {
    const known = Object.values(PAGES).find((p) => p.path === `${pathname}/`)
    if (known) return known.path + (search || '') + (hash || '')
  }
  return null
}
