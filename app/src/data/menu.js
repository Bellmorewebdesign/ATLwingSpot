// Base menu dataset — mirrors ATL's current corporate menu.
// Obvious typos cleaned ("suqar"->"sugar", "sour scream"->"sour cream").
// Product claims are NOT materially altered.
// Prices vary by location/platform — surfaced in the UI, never presented as universal.

export const MENU_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'starters', label: 'Starters' },
  { id: 'wings', label: 'Wings' },
  { id: 'boneless', label: 'Boneless Wings' },
  { id: 'tenders', label: 'Saucy Tenders' },
  { id: 'waffles', label: "Chicken N' Waffles" },
  { id: 'wraps', label: 'Wraps' },
  { id: 'sandwiches', label: 'Burgers & Sandwiches' },
  { id: 'fries', label: 'Fries N Munchies' },
  { id: 'desserts', label: 'Desserts N Shakes' },
  { id: 'drinks', label: 'Beverages' },
  { id: 'extras', label: 'Extras' },
]

const img = {
  hero: 'assets/food/hero-wings.jpg',
  wings: 'assets/food/wings-basket-cutout.png',
  boneless: 'assets/food/boneless-combo.jpg',
  tenders: 'assets/food/saucy-tenders.jpg',
  tendersCut: 'assets/food/crispy-tenders-cutout.png',
  waffles: 'assets/food/fruity-pebbles-chicken-waffles.jpg',
  wafflesCut: 'assets/food/chicken-waffles-cutout.png',
  sandwich: 'assets/food/chipotle-chicken-sandwich.jpg',
  shakes: 'assets/food/shakes-lineup.png',
  oreos: 'assets/food/fried-oreos.png',
  corn: 'assets/food/cajun-corn-cutout.png',
}

export const MENU_ITEMS = [
  // ---------------- STARTERS ----------------
  {
    id: 'mac-bites', cat: 'starters', name: 'Mac N Cheese Bites', price: '$5.99 / $8.99',
    desc: 'Bite-sized golden treats with a crispy exterior and creamy mac and cheese center.',
  },
  {
    id: 'cajun-corn', cat: 'starters', name: 'Cajun Fried Corn', price: '$2.99 / $5.99',
    desc: "Fried corn tossed in ATL's Cajun rub. Served with ranch.", badge: 'Fan Favorite',
    image: img.corn, feature: true,
  },
  {
    id: 'coconut-shrimp', cat: 'starters', name: 'Crispy Coconut Shrimp', price: '$7.99',
    desc: 'Served with Thai chili sauce.',
  },
  {
    id: 'mozz-sticks', cat: 'starters', name: 'Mozzarella Sticks (6)', price: '$8.99',
    desc: 'Served with marinara.',
  },
  {
    id: 'chipotle-quesadilla', cat: 'starters', name: 'Chipotle Chicken Quesadilla', price: '$9.99',
    desc: 'Crispy boneless chicken, house chipotle sauce, cheddar cheese and ranch.',
  },
  {
    id: 'buffalo-quesadilla', cat: 'starters', name: 'Crispy Buffalo Chicken Quesadilla', price: '$9.99',
    desc: 'Crispy buffalo chicken and cheddar cheese with ranch.',
  },
  {
    id: 'cheddar-quesadilla', cat: 'starters', name: 'Cheddar Cheese Quesadilla', price: '$5.99',
    desc: 'Served with sour cream.',
  },
  {
    id: 'loaded-quesadilla', cat: 'starters', name: 'Loaded Chicken Quesadilla', price: '$9.99',
    desc: 'Grilled chicken, cheddar, green peppers and onions. Served with sour cream.',
  },

  // ---------------- BONE-IN WINGS ----------------
  {
    id: 'wings-6-combo', cat: 'wings', name: '6pc Bone-In Wings Combo Meal', price: '$13.99',
    desc: 'Six fresh, never frozen bone-in wings sauced in your pick of 25+ sauces, plus a side and a drink.',
    image: img.wings, feature: true, hero: true,
  },
  {
    id: 'wings-10-combo', cat: 'wings', name: '10pc Bone-In Wings Combo', price: '$17.99',
    desc: 'Ten bone-in wings, one flavor decision. Comes with a side and a drink.',
    image: img.hero, feature: true,
  },
  { id: 'wings-4', cat: 'wings', name: '4 Bone-In Wings', price: '$6.99', desc: 'Fresh, never frozen. Pick a flavor, pick a dip.' },
  { id: 'wings-6', cat: 'wings', name: '6 Bone-In Wings', price: '$9.99', desc: 'Fresh, never frozen. Sauced or dry-rubbed.' },
  { id: 'wings-10', cat: 'wings', name: '10 Bone-In Wings', price: '$14.99', desc: 'Two flavors, five wings each. Sorted.' },
  { id: 'wings-20', cat: 'wings', name: '20 Bone-In Wings', price: '$27.99', desc: 'Built to share. Or not.' },
  { id: 'wings-50', cat: 'wings', name: '50 Bone-In Wings', price: '$69.99', desc: 'Crew-sized. Mix up to a handful of flavors.', badge: 'Party Size' },
  { id: 'wings-100', cat: 'wings', name: '100 Bone-In Wings', price: '$134.99', desc: 'Enough wings for the whole game.', badge: 'Party Size' },

  // ---------------- BONELESS ----------------
  {
    id: 'boneless-6-combo', cat: 'boneless', name: '6pc Boneless Wings Combo', price: '$12.99',
    desc: 'Hand-breaded white-meat boneless wings, fresh never frozen, with a side and a drink.',
    image: img.boneless, feature: true,
  },
  {
    id: 'boneless-10-combo', cat: 'boneless', name: '10pc Boneless Wings Combo', price: '$16.99',
    desc: 'Ten boneless, sauced your way, with a side and a drink.',
    image: img.boneless,
  },
  { id: 'boneless-4', cat: 'boneless', name: '4 Boneless Wings', price: '$5.99', desc: 'Fresh, never frozen white-meat chicken, hand breaded and fried.' },
  { id: 'boneless-6', cat: 'boneless', name: '6 Boneless Wings', price: '$7.99', desc: 'Hand-breaded white meat. Any flavor.' },
  { id: 'boneless-10', cat: 'boneless', name: '10 Boneless Wings', price: '$12.99', desc: 'All white meat, all sauce.' },
  { id: 'boneless-20', cat: 'boneless', name: '20 Boneless Wings', price: '$24.99', desc: 'Feed a few. Mix your flavors.' },
  { id: 'boneless-50', cat: 'boneless', name: '50 Boneless Wings', price: '$59.99', desc: 'Crew-sized boneless.', badge: 'Party Size' },
  { id: 'boneless-100', cat: 'boneless', name: '100 Boneless Wings', price: '$114.99', desc: 'Enough boneless for the whole room.', badge: 'Party Size' },

  // ---------------- SAUCY TENDERS ----------------
  {
    id: 'tenders-3', cat: 'tenders', name: '3 Saucy Tenders', price: '$8.99',
    desc: 'Fresh, hand-breaded jumbo tenders. Sauced, or sauce on the side.',
    image: img.tenders, feature: true,
  },
  { id: 'tenders-5', cat: 'tenders', name: '5 Saucy Tenders', price: '$11.99', desc: 'Jumbo tenders, hand breaded, tossed to order.' },
  { id: 'tenders-10', cat: 'tenders', name: '10 Saucy Tenders', price: '$21.99', desc: 'Ten jumbo tenders. Sauced or on the side.' },
  { id: 'tenders-20', cat: 'tenders', name: '20 Saucy Tenders', price: '$39.99', desc: 'Share-ready jumbo tenders.', badge: 'Party Size' },
  { id: 'tenders-50', cat: 'tenders', name: '50 Saucy Tenders', price: '$94.99', desc: 'Catering-sized tenders.', badge: 'Party Size' },
  { id: 'tenders-100', cat: 'tenders', name: '100 Saucy Tenders', price: '$179.99', desc: 'Enough tenders for a full room.', badge: 'Party Size' },
  { id: 'tenders-3-combo', cat: 'tenders', name: '3pc Tender Combo', price: '$13.99', desc: 'Three jumbo tenders with a side and a drink.', image: img.tendersCut, feature: true },
  { id: 'tenders-5-combo', cat: 'tenders', name: '5pc Tender Combo', price: '$15.99', desc: 'Five jumbo tenders with a side and a drink.' },

  // ---------------- CHICKEN N' WAFFLES ----------------
  {
    id: 'waffles-classic', cat: 'waffles', name: "Chicken N' Waffles", price: '$11.99',
    desc: 'Golden waffle, crispy chicken, syrup on standby.',
    image: img.wafflesCut, feature: true,
  },
  {
    id: 'waffles-oreo', cat: 'waffles', name: "Oreo Chicken N' Waffles", price: '$14.99',
    desc: 'Waffle loaded with crushed Oreo, powdered sugar, crispy chicken.',
  },
  {
    id: 'waffles-pebbles', cat: 'waffles', name: "Fruity Pebbles Chicken N' Waffles", price: '$14.99',
    desc: 'Fruity Pebbles waffle, powdered sugar, crispy chicken. The one people film.',
    image: img.waffles, feature: true, hero: true, badge: 'Viral',
  },
  {
    id: 'waffles-ctc', cat: 'waffles', name: "Cinnamon Toast Crunch Chicken N' Waffles", price: '$14.99',
    desc: 'Cinnamon Toast Crunch waffle, powdered sugar, crispy chicken.',
  },
  { id: 'waffle-original', cat: 'waffles', name: 'Original Waffle', price: '$4.99', desc: 'Just the golden waffle. Syrup included.' },
  { id: 'waffle-oreo', cat: 'waffles', name: 'Oreo Waffle', price: '$7.99', desc: 'Waffle + crushed Oreo + powdered sugar.' },
  { id: 'waffle-pebbles', cat: 'waffles', name: 'Fruity Pebbles Waffle', price: '$7.99', desc: 'Waffle + Fruity Pebbles + powdered sugar.' },
  { id: 'waffle-ctc', cat: 'waffles', name: 'Cinnamon Toast Crunch Waffle', price: '$7.99', desc: 'Waffle + Cinnamon Toast Crunch + powdered sugar.' },

  // ---------------- WRAPS ----------------
  { id: 'wrap-honey', cat: 'wraps', name: 'Honey Mustard Wrap', price: '$9.99', desc: 'Crispy chicken, honey mustard, wrapped up to go.' },
  { id: 'wrap-buffalo', cat: 'wraps', name: 'Buffalo Ranch Chicken Wrap', price: '$9.99', desc: 'Buffalo chicken, ranch, all wrapped up.' },
  { id: 'wrap-chipotle', cat: 'wraps', name: 'Chipotle Chicken Wrap', price: '$9.99', desc: 'Crispy chicken, house chipotle sauce.' },

  // ---------------- SANDWICHES ----------------
  {
    id: 'sandwich-chipotle', cat: 'sandwiches', name: 'Chipotle Chicken Sandwich', price: '$7.99',
    desc: 'Crispy chicken, house chipotle sauce, on a toasted bun.',
    image: img.sandwich, feature: true, hero: true,
  },
  { id: 'sandwich-deluxe', cat: 'sandwiches', name: 'Chicken Deluxe', price: '$7.99', desc: 'The classic crispy chicken sandwich, done right.', image: img.sandwich },

  // ---------------- FRIES + MUNCHIES ----------------
  { id: 'fries-waffle', cat: 'fries', name: 'Waffle Fries', price: '$3.99', desc: 'Crispy waffle-cut fries.' },
  { id: 'fries-cheese', cat: 'fries', name: 'Cheese Fries', price: '$4.99', desc: 'Waffle fries under a blanket of cheese sauce.' },
  { id: 'onion-rings', cat: 'fries', name: 'Battered Onion Rings', price: '$4.99', desc: 'Thick-cut, battered, fried gold.' },
  { id: 'fries-buffalo', cat: 'fries', name: 'Buffalo Ranch Loaded Waffle Fries', price: '$9.99', desc: 'Waffle fries loaded with buffalo chicken + ranch.', feature: true },
  { id: 'fries-nashville', cat: 'fries', name: 'Nashville Hot Loaded Waffle Fries', price: '$9.99', desc: 'Waffle fries, Nashville hot chicken, the works.', feature: true },
  { id: 'fries-sweet', cat: 'fries', name: 'Sweet Potato Fries', price: '$4.99', desc: 'Sweet, crispy, addictive.' },
  { id: 'fries-bbq', cat: 'fries', name: 'BBQ Loaded Waffle Fries', price: '$9.99', desc: 'Waffle fries loaded with BBQ chicken.', feature: true },

  // ---------------- DESSERTS + SHAKES ----------------
  {
    id: 'milkshake', cat: 'desserts', name: 'Milkshake', price: '$6.99',
    desc: 'Reese’s, Fruity Pebbles, Oreo Blast, Cinnamon Toast Crunch, Chocolate, Vanilla, or Strawberry Shortcake.',
    image: img.shakes, feature: true, hero: true, badge: '7 Flavors',
  },
  { id: 'fried-oreos', cat: 'desserts', name: 'Fried Oreos', price: '$4.99', desc: 'Golden, powdered, dangerous. Served warm.', image: img.oreos, feature: true },
  { id: 'funnel-fries', cat: 'desserts', name: 'Funnel Cake Fries', price: '$4.99', desc: 'Funnel cake, fry-shaped, powdered sugar.' },

  // ---------------- BEVERAGES ----------------
  { id: 'can-soda', cat: 'drinks', name: 'Can Soda', price: '$0.99', desc: 'Ice cold.' },
  { id: 'gatorade', cat: 'drinks', name: 'Gatorade', price: '$2.50', desc: 'For after the hot ones.' },
  { id: 'water', cat: 'drinks', name: 'Bottled Water', price: '$2.00', desc: 'For after the 911 Sauce.' },
  { id: 'large-soda', cat: 'drinks', name: 'Large Soda', price: '$2.99', desc: 'Fountain, large.' },
  { id: 'bottled-soda', cat: 'drinks', name: 'Bottled Soda', price: '$2.50', desc: 'Grab and go.' },

  // ---------------- EXTRAS ----------------
  { id: 'ranch', cat: 'extras', name: 'Ranch Cup', price: '$0.49', desc: 'The cooling agent.' },
  { id: 'blue-cheese', cat: 'extras', name: 'Blue Cheese Cup', price: '$0.49', desc: 'Team blue cheese, this one’s for you.' },
  { id: 'extra-sauce', cat: 'extras', name: 'Extra Sauce Cup', price: '$0.49', desc: 'Because you will want more.' },
  { id: 'cheese-sauce', cat: 'extras', name: 'Cheese Sauce Cup', price: '$0.49', desc: 'Dip everything.' },
  { id: 'celery', cat: 'extras', name: 'Celery', price: '$1.99', desc: 'For balance. Allegedly.' },
]
