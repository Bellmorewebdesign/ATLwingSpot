// Primary navigation. `to` values are HashRouter routes.
export const NAV_LINKS = [
  { label: 'Menu', to: '/menu' },
  { label: 'Flavors', to: '/flavors' },
  { label: 'Locations', to: '/locations' },
  { label: 'Catering', to: '/catering' },
  { label: 'Our Story', to: '/story' },
  { label: 'Franchise', to: '/franchise' },
]

export const FOOTER_LINKS = [
  ...NAV_LINKS,
  { label: 'Contact', to: '/contact' },
]
