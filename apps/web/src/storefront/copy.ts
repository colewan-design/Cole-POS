import type { BusinessMode } from '@pos/shared/index'

export interface StorefrontCopy {
  heroEyebrow: string
  heroTitle: string
  heroSub: string
  heroCta: string
  featuredLabel: string
  navFourthLabel: string
  promoCards: { title: string; body: string }[]
  mostSellingTitle: string
  picksTitle: string
  ctaTitle: string
  ctaBody: string
  ctaButton: string
}

// The storefront serves one fixed business mode per deployment (see
// BUSINESS_MODE in firebase.ts) — nail-salon has no online storefront, so
// this only needs to cover the other three.
const copyByMode: Record<Exclude<BusinessMode, 'nail-salon'>, StorefrontCopy> = {
  grocery: {
    heroEyebrow: 'Same-day pickup',
    heroTitle: 'Fresh groceries,\ndelivered daily.',
    heroSub: "Shop farm-fresh produce, pantry staples, and daily essentials — order ahead and pick up in store.",
    heroCta: 'Shop now',
    featuredLabel: 'Fresh pick',
    navFourthLabel: 'Fresh Produce',
    promoCards: [
      { title: 'New here? Enjoy 10% off your first order', body: 'Sign up today and get instant savings on your first grocery purchase.' },
      { title: 'Free pickup on orders over $50', body: 'Stock up on your weekly groceries and save more with zero delivery charges.' },
      { title: 'Fresh groceries for your family, without hassle', body: "We'll have everything ready and waiting when you arrive." },
    ],
    mostSellingTitle: 'Most Selling Products',
    picksTitle: "Today's Fresh Picks",
    ctaTitle: 'Ready to fill your cart with freshness?',
    ctaBody: 'Shop farm-fresh groceries and daily essentials, ready for pickup.',
    ctaButton: 'Start shopping',
  },
  'coffee-shop': {
    heroEyebrow: 'Ready in minutes',
    heroTitle: 'Fresh coffee,\nbrewed daily.',
    heroSub: 'Order ahead for pickup — pastries, roasts, and daily essentials, ready when you are.',
    heroCta: 'Order now',
    featuredLabel: 'Staff pick',
    navFourthLabel: 'Fresh Roasts',
    promoCards: [
      { title: 'New here? Enjoy 10% off your first order', body: 'Sign up today and get instant savings on your first order.' },
      { title: 'Free pickup on orders over $25', body: 'Stock up on beans and pastries and skip the delivery fee.' },
      { title: 'Fresh coffee & pastries, without the wait', body: "We'll have your order ready when you arrive." },
    ],
    mostSellingTitle: 'Most Ordered Drinks',
    picksTitle: "Today's Fresh Picks",
    ctaTitle: 'Ready for your next cup?',
    ctaBody: 'Order ahead and skip the line — ready for pickup in minutes.',
    ctaButton: 'Start your order',
  },
  restaurant: {
    heroEyebrow: 'Order ahead',
    heroTitle: 'Delicious meals,\nmade fresh.',
    heroSub: 'Order ahead for pickup — chef-made dishes ready when you arrive.',
    heroCta: 'Order now',
    featuredLabel: "Chef's pick",
    navFourthLabel: 'Our Menu',
    promoCards: [
      { title: 'New here? Enjoy 10% off your first order', body: 'Sign up today and get instant savings on your first order.' },
      { title: 'Free pickup on orders over $40', body: 'Order for the table and skip the delivery fee.' },
      { title: 'Fresh meals made to order, every time', body: "We'll have your table's order ready when you arrive." },
    ],
    mostSellingTitle: 'Most Ordered Dishes',
    picksTitle: "Today's Fresh Picks",
    ctaTitle: 'Ready for your next meal?',
    ctaBody: 'Order ahead and skip the wait — ready for pickup.',
    ctaButton: 'Start your order',
  },
}

export function storefrontCopy(mode: BusinessMode): StorefrontCopy {
  return copyByMode[mode as Exclude<BusinessMode, 'nail-salon'>] ?? copyByMode.grocery
}
