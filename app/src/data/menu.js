// ATL Wing Spot menu — generated from the official asset pack.
//
//   npm run menu:data      (app/scripts/build-menu-data.mjs)
//
// Source of truth: menu-items.json at the repo root, published by ATL. It holds
// 68 listings mapped onto 51 official photographs; several sizes and
// variations intentionally share one photo. Categories, names, the item-to-image
// mapping and the substance of every description come from there.
//
// Descriptions are copy-edited only: typos fixed, shouting normalised, terminal
// punctuation added, and sibling sizes made distinguishable from one another.
// Where the source disagreed with itself about how many sauces exist ("over 30"
// in some rows, "over 25" in others) the count is left out entirely rather than
// guessed at.
//
// There is NO price field, by design — the customer-facing menu shows the name,
// the description, the photo and the category, and nothing else.
//
// DO NOT EDIT BY HAND. Change the pack (or the copy table in the script) and
// regenerate, or the next run will overwrite you.

export const MENU_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'starters', label: 'Starters' },
  { id: 'wings', label: 'Wings' },
  { id: 'boneless', label: 'Boneless Wings' },
  { id: 'tenders', label: 'Saucy Tenders' },
  { id: 'waffles', label: 'Chicken N\' Waffles' },
  { id: 'quesadillas', label: 'Quesadillas' },
  { id: 'wraps', label: 'Wraps' },
  { id: 'sandwiches', label: 'Burgers & Sandwiches' },
  { id: 'fries', label: 'Fries N Munchies' },
  { id: 'desserts', label: 'Desserts N Shakes' },
  { id: 'drinks', label: 'Beverages' },
  { id: 'extras', label: 'Extras' },
]

export const MENU_ITEMS = [
  // ---------------- STARTERS (4) ----------------
  {
    id: 'mac-n-cheese-bites', cat: 'starters',
    name: 'Mac N Cheese Bites',
    desc:
      'Bite-sized golden treats with a crispy exterior and a creamy, cheesy mac and cheese center.',
    image: 'assets/menu/mac-n-cheese-bites-e1746183930370.jpg', w: 1888, h: 1080,
  },
  {
    id: 'cajun-fried-corn', cat: 'starters',
    name: 'Cajun Fried Corn',
    desc:
      'Our fan-favorite Cajun fried corn. Juicy ears of corn on the cob fried till golden and tossed in our famous Cajun rub. Served with ranch.',
    image: 'assets/menu/cajun-fried-corn.jpg', w: 1920, h: 1080,
  },
  {
    id: 'crispy-coconut-shrimp', cat: 'starters',
    name: 'Crispy Coconut Shrimp',
    desc:
      'Crispy coconut shrimp, served with Thai chili sauce.',
    image: 'assets/menu/7fa67d84-4eb6-44ee-b868-fd74d7cbf451-retina-large.webp', w: 1920, h: 1080,
  },
  {
    id: 'mozzarella-sticks-6', cat: 'starters',
    name: 'Mozzarella Sticks (6)',
    desc:
      'Six mozzarella sticks, served with marinara sauce.',
    image: 'assets/menu/mozzarella-sticks.jpg', w: 1920, h: 1079,
  },

  // ---------------- WINGS (8) ----------------
  {
    id: '6pc-bone-in-wings-combo-meal', cat: 'wings',
    name: '6pc Bone In Wings Combo Meal',
    desc:
      'Six of our classic bone-in wings, always fresh, never frozen. Choose from a wide selection of flavors. Served with your choice of side, beverage and dip.',
    image: 'assets/menu/6pc-bone-in-wings-combo-meal.jpg', w: 1920, h: 1080,
  },
  {
    id: '10pc-bone-in-wings-combo', cat: 'wings',
    name: '10pc Bone In Wings Combo',
    desc:
      'Ten of our classic bone-in wings, always fresh, never frozen. Choose from a wide selection of flavors. Served with your choice of side, beverage and dip.',
    image: 'assets/menu/6pc-bone-in-wings-combo-meal.jpg', w: 1920, h: 1080,
  },
  {
    id: '4-bone-in-wings', cat: 'wings',
    name: '4 Bone In Wings',
    desc:
      'Four of our classic bone-in wings, always fresh, never frozen. Choose from a wide selection of flavors. Served with celery and your choice of dip.',
    image: 'assets/menu/wings-e1746184196401.jpg', w: 1894, h: 1078,
  },
  {
    id: '6-bone-in-wings', cat: 'wings',
    name: '6 Bone In Wings',
    desc:
      'Six of our classic bone-in wings, always fresh, never frozen. Choose from a wide selection of flavors. Served with celery and your choice of dip.',
    image: 'assets/menu/wings-e1746184196401.jpg', w: 1894, h: 1078,
  },
  {
    id: '10-bone-in-wings', cat: 'wings',
    name: '10 Bone In Wings',
    desc:
      'Ten of our classic bone-in wings, always fresh, never frozen. Choose from a wide selection of flavors. Served with celery and your choice of dip.',
    image: 'assets/menu/wings-e1746184196401.jpg', w: 1894, h: 1078,
  },
  {
    id: '20-bone-in-wings', cat: 'wings',
    name: '20 Bone In Wings',
    desc:
      'Twenty of our classic bone-in wings, always fresh, never frozen. Choose from a wide selection of flavors. Served with celery and your choice of dip.',
    image: 'assets/menu/wings-e1746184196401.jpg', w: 1894, h: 1078,
  },
  {
    id: '50-bone-in-wings', cat: 'wings',
    name: '50 Bone In Wings',
    desc:
      'Fifty of our classic bone-in wings, always fresh, never frozen. Choose from a wide selection of flavors. Served with celery and your choice of dip.',
    image: 'assets/menu/50-bone-in-wings.webp', w: 1920, h: 1080,
  },
  {
    id: '100-bone-in-wings', cat: 'wings',
    name: '100 Bone In Wings',
    desc:
      'One hundred of our classic bone-in wings, always fresh, never frozen. Choose from a wide selection of flavors. Served with celery and your choice of dip.',
    image: 'assets/menu/50-bone-in-wings.webp', w: 1920, h: 1080,
  },

  // ---------------- BONELESS WINGS (8) ----------------
  {
    id: '6pc-boneless-wings-combo', cat: 'boneless',
    name: '6pc Boneless Wings Combo',
    desc:
      'Six of our fan-favorite boneless wings, now in a combo. Fresh, never frozen white-meat chicken, hand breaded and fried till golden brown. Served with your choice of sauce, side, beverage and dip.',
    image: 'assets/menu/6pc-boneless-wings-combo.jpg', w: 1920, h: 1080,
  },
  {
    id: '10pc-boneless-wings-combo', cat: 'boneless',
    name: '10pc Boneless Wings Combo',
    desc:
      'Ten of our fan-favorite boneless wings, now in a combo. Fresh, never frozen white-meat chicken, hand breaded and fried till golden brown. Served with your choice of sauce, side, beverage and dip.',
    image: 'assets/menu/6pc-boneless-wings-combo.jpg', w: 1920, h: 1080,
  },
  {
    id: '4-boneless-wings', cat: 'boneless',
    name: '4 Boneless Wings',
    desc:
      'Four of our fan-favorite boneless wings. Fresh, never frozen white-meat chicken, hand breaded and fried till golden brown. Choose your sauce and dip.',
    image: 'assets/menu/4-boneless-wings.jpg', w: 1920, h: 1079,
  },
  {
    id: '6-boneless-wings', cat: 'boneless',
    name: '6 Boneless Wings',
    desc:
      'Six of our fan-favorite boneless wings. Fresh, never frozen white-meat chicken, hand breaded and fried till golden brown. Choose your sauce and dip.',
    image: 'assets/menu/4-boneless-wings.jpg', w: 1920, h: 1079,
  },
  {
    id: '10-boneless-wings', cat: 'boneless',
    name: '10 Boneless Wings',
    desc:
      'Ten of our fan-favorite boneless wings. Fresh, never frozen white-meat chicken, hand breaded and fried till golden brown. Choose your sauce and dip.',
    image: 'assets/menu/4-boneless-wings.jpg', w: 1920, h: 1079,
  },
  {
    id: '20-boneless-wings', cat: 'boneless',
    name: '20 Boneless Wings',
    desc:
      'Twenty of our fan-favorite boneless wings. Fresh, never frozen white-meat chicken, hand breaded and fried till golden brown. Choose your sauce and dip.',
    image: 'assets/menu/4-boneless-wings.jpg', w: 1920, h: 1079,
  },
  {
    id: '50-boneless-wings', cat: 'boneless',
    name: '50 Boneless Wings',
    desc:
      'Fifty of our fan-favorite boneless wings. Fresh, never frozen white-meat chicken, hand breaded and fried till golden brown. Choose your sauce and dip.',
    image: 'assets/menu/50-boneless-wings.jpg', w: 1920, h: 1080,
  },
  {
    id: '100-boneless-wings', cat: 'boneless',
    name: '100 Boneless Wings',
    desc:
      'One hundred of our fan-favorite boneless wings. Fresh, never frozen white-meat chicken, hand breaded and fried till golden brown. Choose your sauce and dip.',
    image: 'assets/menu/50-boneless-wings.jpg', w: 1920, h: 1080,
  },

  // ---------------- SAUCY TENDERS (8) ----------------
  {
    id: '3-saucy-tenders', cat: 'tenders',
    name: '3 Saucy Tenders',
    desc:
      'Three hand-breaded jumbo tenders. Pick your favorite sauce and have them tossed, or with the sauce on the side.',
    image: 'assets/menu/3-jumbo-tenders.jpg', w: 1920, h: 1079,
  },
  {
    id: '5-saucy-tenders', cat: 'tenders',
    name: '5 Saucy Tenders',
    desc:
      'Five hand-breaded jumbo tenders. Pick your favorite sauce and have them tossed, or with the sauce on the side.',
    image: 'assets/menu/5-jumbo-tenders.jpg', w: 1920, h: 1080,
  },
  {
    id: '10-saucy-tenders', cat: 'tenders',
    name: '10 Saucy Tenders',
    desc:
      'Ten hand-breaded jumbo tenders. Pick your favorite sauces and have them tossed, or with the sauce on the side.',
    image: 'assets/menu/10-jumbo-tenders.webp', w: 1920, h: 1080,
  },
  {
    id: '20-saucy-tenders', cat: 'tenders',
    name: '20 Saucy Tenders',
    desc:
      'Twenty hand-breaded jumbo tenders. Pick your favorite sauces and have them tossed, or with the sauce on the side.',
    image: 'assets/menu/20-jumbo-tenders.webp', w: 1920, h: 1080,
  },
  {
    id: '50-saucy-tenders', cat: 'tenders',
    name: '50 Saucy Tenders',
    desc:
      'Fifty hand-breaded jumbo tenders. Pick your favorite sauces and have them tossed, or with the sauce on the side.',
    image: 'assets/menu/50-jumbo-tenders.webp', w: 1920, h: 1080,
  },
  {
    id: '100-saucy-tenders', cat: 'tenders',
    name: '100 Saucy Tenders',
    desc:
      'One hundred hand-breaded jumbo tenders. Pick your favorite sauces and have them tossed, or with the sauce on the side.',
    image: 'assets/menu/50-jumbo-tenders.webp', w: 1920, h: 1080,
  },
  {
    id: '3pc-tender-combo', cat: 'tenders',
    name: '3pc Tender Combo',
    desc:
      'Three hand-breaded jumbo tenders, tossed or with the sauce on the side. Served with your choice of side and drink.',
    image: 'assets/menu/3pc-tender-combo.webp', w: 1920, h: 1370,
  },
  {
    id: '5pc-tender-combo', cat: 'tenders',
    name: '5pc Tender Combo',
    desc:
      'Five hand-breaded jumbo tenders, tossed or with the sauce on the side. Served with your choice of side and drink.',
    image: 'assets/menu/3pc-tender-combo.webp', w: 1920, h: 1370,
  },

  // ---------------- CHICKEN N' WAFFLES (8) ----------------
  {
    id: 'chicken-n-waffles', cat: 'waffles',
    name: 'Chicken N’ Waffles',
    desc:
      'Three crispy chicken tenders served over a warm waffle topped with powdered sugar. Syrup on the side.',
    image: 'assets/menu/chicken-n-waffles.webp', w: 1920, h: 1079,
  },
  {
    id: 'oreo-chicken-n-waffles', cat: 'waffles',
    name: 'Oreo Chicken N’ Waffles',
    desc:
      'Three hand-breaded chicken tenders served with a crispy Oreo waffle topped with powdered sugar and chocolate syrup. Syrup on the side.',
    image: 'assets/menu/oreo-chicken-n-waffles.png', w: 1920, h: 1534,
  },
  {
    id: 'fruity-pebbles-chicken-n-waffles', cat: 'waffles',
    name: 'Fruity Pebbles Chicken N’ Waffles',
    desc:
      'Three hand-breaded chicken tenders served with a crispy Fruity Pebbles waffle topped with powdered sugar and strawberry syrup. Syrup on the side.',
    image: 'assets/menu/fruity-pebbles-chicken-n-waffles.jpg', w: 1920, h: 1608,
  },
  {
    id: 'cinnamon-toast-crunch-chicken-n-waffles', cat: 'waffles',
    name: 'Cinnamon Toast Crunch Chicken N’ Waffles',
    desc:
      'Three hand-breaded chicken tenders served with a crispy Cinnamon Toast Crunch waffle topped with powdered sugar and caramel syrup. Syrup on the side.',
    image: 'assets/menu/cinnamon-toast-crunch-chicken-n-waffles.webp', w: 1920, h: 1534,
  },
  {
    id: 'waffle', cat: 'waffles',
    name: 'Waffle',
    desc:
      'The OG. Our original waffle topped with powdered sugar, no chicken. Served with syrup on the side.',
    image: 'assets/menu/cinnamon-toast-crunch-chicken-n-waffles.webp', w: 1920, h: 1534,
  },
  {
    id: 'oreo-waffle', cat: 'waffles',
    name: 'Oreo Waffle',
    desc:
      'Crispy Oreo waffle topped with Hershey’s syrup, powdered sugar and more Oreos.',
    image: 'assets/menu/oreo-waffle.png', w: 1920, h: 1762,
  },
  {
    id: 'fruity-pebbles-waffle', cat: 'waffles',
    name: 'Fruity Pebbles Waffle',
    desc:
      'Crispy Fruity Pebbles waffle topped with strawberry syrup, powdered sugar and more Fruity Pebbles.',
    image: 'assets/menu/fruity-pebbles-waffle.png', w: 1920, h: 1534,
  },
  {
    id: 'cinnamon-toast-crunch-waffle', cat: 'waffles',
    name: 'Cinnamon Toast Crunch Waffle',
    desc:
      'Crispy Cinnamon Toast Crunch waffle topped with caramel syrup, powdered sugar and more Cinnamon Toast Crunch.',
    image: 'assets/menu/cinnamon-toast-crunch-waffle.png', w: 1920, h: 1534,
  },

  // ---------------- QUESADILLAS (4) ----------------
  {
    id: 'chipotle-chicken-quesadilla', cat: 'quesadillas',
    name: 'Chipotle Chicken Quesadilla',
    desc:
      'Crispy boneless chicken topped with our housemade chipotle sauce, cheddar cheese and ranch.',
    image: 'assets/menu/chipotle-chicken-quesadilla-scaled.webp', w: 2560, h: 2048,
  },
  {
    id: 'cheddar-cheese-quesadilla', cat: 'quesadillas',
    name: 'Cheddar Cheese Quesadilla',
    desc:
      'Melted cheddar cheese in a pressed tortilla. Served with sour cream.',
    image: 'assets/menu/cheddar-cheese-quesadilla.png', w: 1920, h: 1420,
  },
  {
    id: 'loaded-chicken-quesadilla', cat: 'quesadillas',
    name: 'Loaded Chicken Quesadilla',
    desc:
      'Grilled chicken, cheddar cheese, green peppers and onions. Served with sour cream.',
    image: 'assets/menu/loaded-chicken-quesadilla-e1746184121941.png', w: 1920, h: 1475,
  },
  {
    id: 'crispy-buffalo-chicken-quesadilla', cat: 'quesadillas',
    name: 'Crispy Buffalo Chicken Quesadilla',
    desc:
      'Crispy buffalo chicken and cheddar cheese topped with ranch. Served with ranch on the side.',
    image: 'assets/menu/crispy-buffalo-chicken-quesadilla.png', w: 1920, h: 1472,
  },

  // ---------------- WRAPS (3) ----------------
  {
    id: 'honey-mustard-wrap', cat: 'wraps',
    name: 'Honey Mustard Wrap',
    desc:
      'Crispy boneless chicken topped with cheddar cheese, lettuce, tomatoes and honey mustard, wrapped to go.',
    image: 'assets/menu/honey-mustard-wrap-scaled.webp', w: 2560, h: 1829,
  },
  {
    id: 'buffalo-ranch-chicken-wrap', cat: 'wraps',
    name: 'Buffalo Ranch Chicken Wrap',
    desc:
      'Crispy buffalo chicken topped with lettuce, tomatoes and ranch dressing, wrapped to go.',
    image: 'assets/menu/buffalo-ranch-chicken-wrap.jpg', w: 1920, h: 1080,
  },
  {
    id: 'chipotle-chicken-wrap', cat: 'wraps',
    name: 'Chipotle Chicken Wrap',
    desc:
      'Crispy chicken topped with chipotle sauce, lettuce, tomatoes and cheddar cheese, wrapped to go.',
    image: 'assets/menu/chipotle-chicken-wrap.jpg', w: 1920, h: 1080,
  },

  // ---------------- BURGERS & SANDWICHES (2) ----------------
  {
    id: 'chipotle-chicken-sandwich', cat: 'sandwiches',
    name: 'Chipotle Chicken Sandwich',
    desc:
      'Crispy chicken on a brioche bun topped with chipotle sauce, lettuce and tomato.',
    image: 'assets/menu/chipotle-chicken-sandwich.jpg', w: 1920, h: 1536,
  },
  {
    id: 'chicken-deluxe', cat: 'sandwiches',
    name: 'Chicken Deluxe',
    desc:
      'Fried chicken, American cheese, mayo, lettuce and tomato on a brioche bun.',
    image: 'assets/menu/chicken-deluxe.png', w: 1920, h: 1441,
  },

  // ---------------- FRIES N MUNCHIES (7) ----------------
  {
    id: 'waffle-fries', cat: 'fries',
    name: 'Waffle Fries',
    desc:
      'Golden waffle fries, available in small or large servings.',
    image: 'assets/menu/waffle-fries.webp', w: 1920, h: 1621,
  },
  {
    id: 'cheese-fries', cat: 'fries',
    name: 'Cheese Fries',
    desc:
      'Golden fries topped with melted cheddar cheese.',
    image: 'assets/menu/cheese-fries.webp', w: 1920, h: 1578,
  },
  {
    id: 'battered-onion-rings', cat: 'fries',
    name: 'Battered Onion Rings',
    desc:
      'Crispy, golden-battered onion rings, perfectly seasoned for a delightful crunch.',
    image: 'assets/menu/battered-onion-rings.webp', w: 1920, h: 1079,
  },
  {
    id: 'buffalo-ranch-loaded-waffle-fries', cat: 'fries',
    name: 'Buffalo Ranch Loaded Waffle Fries',
    desc:
      'Waffle fries loaded up with crispy chicken, buffalo sauce and ranch.',
    image: 'assets/menu/buffalo-ranch-loaded-waffle-fries.webp', w: 1920, h: 1079,
  },
  {
    id: 'nashville-hot-loaded-waffle-fries', cat: 'fries',
    name: 'Nashville Hot Loaded Waffle Fries',
    desc:
      'Waffle fries loaded up with crispy chicken, Nashville hot sauce and ranch.',
    image: 'assets/menu/cajun-fried-corn.jpg', w: 1920, h: 1080,
  },
  {
    id: 'sweet-potato-fries', cat: 'fries',
    name: 'Sweet Potato Fries',
    desc:
      'Sweet potato fries, available in small or large servings.',
    image: 'assets/menu/sweet-potato-fries.webp', w: 1920, h: 1576,
  },
  {
    id: 'bbq-loaded-waffle-fries', cat: 'fries',
    name: 'BBQ Loaded Waffle Fries',
    desc:
      'Waffle fries loaded up with crispy chicken, pineapple BBQ sauce and ranch.',
    image: 'assets/menu/bbq-loaded-waffle-fries.webp', w: 1920, h: 1079,
  },

  // ---------------- DESSERTS N SHAKES (6) ----------------
  {
    id: 'milkshake', cat: 'desserts',
    name: 'Milkshake',
    desc:
      'Shake it up with one of our fan-favorite milkshakes. Choose from flavors like Reese’s, Fruity Pebbles, Oreo Blast and Cinnamon Toast Crunch, or keep it classic with Hershey’s Chocolate, Vanilla or Strawberry Shortcake.',
    image: 'assets/menu/milkshake.webp', w: 1024, h: 1255,
  },
  {
    id: 'cinnamon-toast-crunch-waffle-desserts', cat: 'desserts',
    name: 'Cinnamon Toast Crunch Waffle',
    desc:
      'Crispy Cinnamon Toast Crunch waffle topped with caramel syrup, powdered sugar and more Cinnamon Toast Crunch.',
    image: 'assets/menu/cinnamon-toast-crunch-waffle.png', w: 1920, h: 1534,
  },
  {
    id: 'fruity-pebbles-waffle-desserts', cat: 'desserts',
    name: 'Fruity Pebbles Waffle',
    desc:
      'Crispy Fruity Pebbles waffle topped with strawberry syrup, powdered sugar and more Fruity Pebbles.',
    image: 'assets/menu/fruity-pebbles-waffle.webp', w: 600, h: 300,
  },
  {
    id: 'oreo-waffle-desserts', cat: 'desserts',
    name: 'Oreo Waffle',
    desc:
      'Crispy Oreo waffle topped with Hershey’s syrup, powdered sugar and more Oreos.',
    image: 'assets/menu/oreo-waffle.webp', w: 1024, h: 939,
  },
  {
    id: 'fried-oreos', cat: 'desserts',
    name: 'Fried Oreos',
    desc:
      'Golden, crispy battered Oreos dusted with powdered sugar, offering a delightful blend of crunch and sweetness.',
    image: 'assets/menu/fried-oreos.webp', w: 1024, h: 576,
  },
  {
    id: 'funnel-cake-fries-12', cat: 'desserts',
    name: 'Funnel Cake Fries (12)',
    desc:
      'Twelve crispy funnel cake fries, lightly dusted with powdered sugar for a sweet, crunchy treat.',
    image: 'assets/menu/funnel-cake-fries.webp', w: 1024, h: 575,
  },

  // ---------------- BEVERAGES (5) ----------------
  {
    id: 'can-soda', cat: 'drinks',
    name: 'Can Soda',
    desc:
      'Canned soda, including Pepsi, Diet Pepsi, Orange Crush, Ginger Ale, Brisk Iced Tea and Lemonade.',
    image: 'assets/menu/bottled-soda.webp', w: 1024, h: 576,
  },
  {
    id: 'gatorade', cat: 'drinks',
    name: 'Gatorade',
    desc:
      'A crisp, satisfying taste to quench thirst and energize without caffeine.',
    image: 'assets/menu/gatorade.webp', w: 1024, h: 576,
  },
  {
    id: 'bottled-water', cat: 'drinks',
    name: 'Bottled Water',
    desc:
      'Pure and refreshing bottled water.',
    image: 'assets/menu/bottled-soda.webp', w: 1024, h: 576,
  },
  {
    id: 'large-soda', cat: 'drinks',
    name: 'Large Soda',
    desc:
      'Large fountain soda: Pepsi, Orange Crush or Ginger Ale.',
    image: 'assets/menu/large-soda.webp', w: 1024, h: 731,
  },
  {
    id: 'bottled-soda', cat: 'drinks',
    name: 'Bottled Soda',
    desc:
      'Bottled soda, including classic Pepsi variants, Crush flavors, Mountain Dew Baja Blast, Country Time lemonades, Sunny D Fruit Punch and Brisk Iced Tea.',
    image: 'assets/menu/bottled-soda.webp', w: 1024, h: 576,
  },

  // ---------------- EXTRAS (5) ----------------
  {
    id: 'ranch-cup', cat: 'extras',
    name: 'Ranch Cup',
    desc:
      'Every hero needs a sidekick. Our ATL Wing Spot ranch is the perfect addition to any wing or munchie order.',
    image: 'assets/menu/ranch-cup.webp', w: 1024, h: 1190,
  },
  {
    id: 'blue-cheese-cup', cat: 'extras',
    name: 'Blue Cheese Cup',
    desc:
      'A cup of blue cheese dip.',
    image: 'assets/menu/blue-cheese-cup.webp', w: 1024, h: 1182,
  },
  {
    id: 'extra-sauce-cup', cat: 'extras',
    name: 'Extra Sauce Cup',
    desc:
      'Add a side cup of your favorite sauce, from right across the sauce board.',
    image: 'assets/menu/extra-sauce-cup.webp', w: 1024, h: 1165,
  },
  {
    id: 'cheese-sauce-cup', cat: 'extras',
    name: 'Cheese Sauce Cup',
    desc:
      'A cup of nacho cheese sauce.',
    image: 'assets/menu/cheese-sauce-cup.webp', w: 1024, h: 1205,
  },
  {
    id: 'celery', cat: 'extras',
    name: 'Celery',
    desc:
      'Crisp celery stalks, freshly cut and ready as a refreshing side or snack.',
    image: 'assets/menu/celery.webp', w: 1024, h: 576,
  },
]
