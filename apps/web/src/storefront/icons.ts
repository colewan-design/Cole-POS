import {
  Beef,
  Cookie,
  CupSoda,
  Fish,
  type IconNode,
  Milk,
  Pizza,
  Popcorn,
  Salad,
  Sandwich,
  ShoppingBasket,
  Soup,
  Wheat,
  Wine,
} from '@lucide/vue'

// Best-effort icon for a category, keyed off its name — the storefront has
// no icon field on Category, and different orgs/business modes name their
// categories freely, so this matches on common keywords instead of fixed IDs
// (unlike GroceryProductGrid.vue's categoryIcons, which can key off the demo
// seed's known category ids).
const keywordIcons: [RegExp, typeof ShoppingBasket][] = [
  [/veg|produce|salad|greens/i, Salad],
  [/fruit/i, Wheat],
  [/dairy|milk|egg/i, Milk],
  [/bakery|bread|pastr/i, Cookie],
  [/meat|beef|poultry/i, Beef],
  [/fish|seafood/i, Fish],
  [/beverage|drink|soda|juice/i, CupSoda],
  [/wine|beer|alcohol/i, Wine],
  [/soup|broth/i, Soup],
  [/snack|chip|popcorn/i, Popcorn],
  [/sandwich|burger/i, Sandwich],
  [/pizza/i, Pizza],
]

export function iconForCategory(name: string): typeof ShoppingBasket {
  const match = keywordIcons.find(([pattern]) => pattern.test(name))
  return match ? match[1] : ShoppingBasket
}

export type { IconNode }
