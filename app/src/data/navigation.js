import { PAGES } from './routes'

// Primary navigation. `to` values are the public paths in data/routes.js.
export const NAV_LINKS = [
  { label: 'Menu', to: PAGES.menu.path },
  { label: 'Flavors', to: PAGES.flavors.path },
  { label: 'Locations', to: PAGES.locations.path },
  { label: 'Catering', to: PAGES.catering.path },
  { label: 'Our Story', to: PAGES.story.path },
  { label: 'Franchise', to: PAGES.franchise.path },
]

export const FOOTER_LINKS = [
  ...NAV_LINKS,
  { label: 'Contact', to: PAGES.contact.path },
]
