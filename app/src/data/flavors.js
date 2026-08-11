// FEATURED FLAVORS — a curated slice, NOT the full inventory.
// The live restaurant advertises 25+ flavors; these are known / promoted names.
// heat: 1 = Chill, 2 = Medium, 3 = Hot, 4 = No Fear
// style: 'wet' | 'dry'
// Descriptors are playful but claim no unverified ingredients.

export const HEAT_LEVELS = [
  { id: 1, label: 'Chill', tag: 'No heat, all flavor' },
  { id: 2, label: 'Medium', tag: 'A friendly kick' },
  { id: 3, label: 'Hot', tag: 'Now we’re talking' },
  { id: 4, label: 'No Fear', tag: 'Proceed accordingly' },
]

export const STYLES = [
  { id: 'wet', label: 'Wet', tag: 'Tossed & saucy' },
  { id: 'dry', label: 'Dry Rub', tag: 'Seasoned, no sauce' },
]

export const FLAVORS = [
  {
    id: 'garlic-butter', name: 'Roasted Garlic Butter', heat: 1, style: 'wet',
    descriptor: 'Buttery, garlicky, zero drama.',
  },
  {
    id: 'honey-bbq', name: 'Sweet Honey BBQ', heat: 1, style: 'wet',
    descriptor: 'Sticky, sweet, everybody’s pick.',
  },
  {
    id: 'old-bay', name: 'Old Bay', heat: 1, style: 'dry',
    descriptor: 'East coast, on a wing.',
  },
  {
    id: 'cajun-rub', name: 'Cajun Rub', heat: 2, style: 'dry',
    descriptor: 'All seasoning, a little kick.',
  },
  {
    id: 'chipotle-bbq', name: 'Chipotle BBQ', heat: 2, style: 'wet',
    descriptor: 'Smoky-sweet with a slow build.',
  },
  {
    id: 'nashville-hot', name: 'Nashville Hot', heat: 3, style: 'dry',
    descriptor: 'Cayenne-forward and unbothered.',
  },
  {
    id: 'buffalo-2', name: 'Hot Buffalo 2.0', heat: 3, style: 'wet',
    descriptor: 'The classic, turned all the way up.',
  },
  {
    id: '911', name: '911 Sauce', heat: 4, style: 'wet',
    descriptor: 'Proceed accordingly.',
  },
]
