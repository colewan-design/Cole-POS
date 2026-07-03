export type BusinessMode = 'coffee-shop' | 'grocery' | 'restaurant' | 'nail-salon'
export type ProductKind = 'standard' | 'weighted'
export type OrderType = 'dine_in' | 'takeaway'
export type PaymentMethod = 'cash' | 'card' | 'ewallet'
export type CashMovementType = 'pay_in' | 'pay_out'
export type Appearance = 'system' | 'light' | 'dark'
export type Theme =
  | 'default'
  | 'ember'
  | 'matcha'
  | 'nocturne'
  | 'casa'
  | 'bloom'
  | 'reserve'
  | 'grove'
  | 'harbor'
  | 'mono'
export const appPageKeys = [
  'dashboard',
  'sales',
  'orders',
  'products',
  'customers',
  'suppliers',
  'employees',
  'inventory',
  'reports',
  'integrations',
  'register',
  'settings',
  'diagnostics',
] as const
export type AppPageKey = (typeof appPageKeys)[number]
export type AppEventType =
  | 'cart_search_used'
  | 'product_added'
  | 'cart_cleared'
  | 'payment_sheet_opened'
  | 'payment_method_selected'
  | 'order_completed'
  | 'settings_saved'
  | 'low_stock_alert'

export interface Category {
  id: string
  name: string
}

export interface Product {
  id: string
  categoryId: string
  sku: string
  barcode: string
  name: string
  priceCents: number
  taxRate: number
  kind: ProductKind
  imageUrl?: string
  imageAttributionUrl?: string
  unitLabel?: string
  outOfStock?: boolean
  stockQty?: number
  lowStockThreshold?: number
  businessModes: BusinessMode[]
}

export interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface OrderItemSummary {
  productId: string
  name: string
  quantity: number
  unitPriceCents: number
  lineTotalCents: number
}

export interface OrderSummary {
  id: string
  ticketNumber: string
  businessMode: BusinessMode
  customerId: string | null
  customerName: string
  orderType: OrderType
  paymentMethod: PaymentMethod
  subtotalCents: number
  taxCents: number
  totalCents: number
  tenderedCents: number
  changeCents: number
  createdAt: string
  items: OrderItemSummary[]
}

export interface CashMovementSummary {
  id: string
  userId?: string | null
  movementType: CashMovementType
  amountCents: number
  reason?: string | null
  createdAt: string
}

export interface ShiftSummary {
  id: string
  openedByUserId?: string | null
  closedByUserId?: string | null
  openingCashCents: number
  closingCashCents?: number | null
  cashSalesCents: number
  totalSalesCents: number
  orderCount: number
  payInsCents: number
  payOutsCents: number
  expectedCashCents: number
  varianceCashCents?: number | null
  openedAt: string
  closedAt?: string | null
  movements: CashMovementSummary[]
}

export interface AppSettings {
  businessMode: BusinessMode
  businessName: string
  businessImageUrl: string
  syncMode: 'local-only' | 'online-sync'
  appearance: Appearance
  theme: Theme
  accentTotalAnimation: boolean
  telemetryEnabled: boolean
}

export interface RoleDefinition {
  id: string
  name: string
  permissions: Record<AppPageKey, boolean>
}

export interface UserAccount {
  id: string
  fullName: string
  username: string
  passwordHash: string
  roleId: string
  createdAt: string
}

export interface AuthSession {
  userId: string
  signedInAt: string
  authToken?: string | null
  authSource?: 'local' | 'remote'
}

export interface AppEvent {
  id: string
  eventType: AppEventType
  payload: Record<string, unknown>
  deviceId: string
  appVersion: string
  createdAt: string
  sentAt: string | null
}

export interface CatalogSnapshot {
  categories: Category[]
  products: Product[]
}

export type CreateProductInput = Omit<Product, 'id'>
export type CreateCategoryInput = { name: string }
export type CreateCustomerInput = Pick<Customer, 'name' | 'phone' | 'email' | 'notes'>

export interface CreateOrderInput {
  businessMode: BusinessMode
  customerId?: string | null
  customerName?: string | null
  orderType: OrderType
  paymentMethod: PaymentMethod
  tenderedCents: number
  items: OrderItemSummary[]
}

export const guestCustomerName = 'Guest'

export const defaultSettings: AppSettings = {
  businessMode: 'coffee-shop',
  businessName: '',
  businessImageUrl: '',
  syncMode: 'local-only',
  appearance: 'system',
  theme: 'default',
  accentTotalAnimation: true,
  telemetryEnabled: true,
}

function createPermissions(allowedPages: AppPageKey[]): Record<AppPageKey, boolean> {
  return Object.fromEntries(
    appPageKeys.map((page) => [page, allowedPages.includes(page)]),
  ) as Record<AppPageKey, boolean>
}

export const defaultRoles: RoleDefinition[] = [
  {
    id: 'admin',
    name: 'Admin',
    permissions: createPermissions([...appPageKeys]),
  },
  {
    id: 'manager',
    name: 'Manager',
    permissions: createPermissions(['dashboard', 'sales', 'orders', 'products', 'customers', 'suppliers', 'inventory', 'reports', 'register', 'settings']),
  },
  {
    id: 'cashier',
    name: 'Cashier',
    permissions: createPermissions(['dashboard', 'sales', 'orders', 'register']),
  },
  {
    id: 'guest',
    name: 'Guest',
    permissions: createPermissions(['dashboard', 'sales', 'orders', 'products', 'customers', 'suppliers', 'inventory', 'reports', 'register', 'settings']),
  },
]

export function businessModeLabel(mode: BusinessMode): string {
  switch (mode) {
    case 'coffee-shop':
      return 'Coffee shop'
    case 'grocery':
      return 'Grocery store'
    case 'restaurant':
      return 'Restaurant'
    case 'nail-salon':
      return 'Nail Salon'
  }
}

export function appPageLabel(page: AppPageKey): string {
  switch (page) {
    case 'dashboard':
      return 'Dashboard'
    case 'sales':
      return 'Sales'
    case 'register':
      return 'Register'
    case 'orders':
      return 'Orders'
    case 'products':
      return 'Products'
    case 'customers':
      return 'Customers'
    case 'suppliers':
      return 'Suppliers'
    case 'employees':
      return 'Employees'
    case 'inventory':
      return 'Inventory'
    case 'reports':
      return 'Reports'
    case 'integrations':
      return 'Integrations'
    case 'settings':
      return 'Settings'
    case 'diagnostics':
      return 'Diagnostics'
  }
}

export const demoCategories: Category[] = [
  { id: 'coffee', name: 'Coffee' },
  { id: 'tea', name: 'Tea' },
  { id: 'pastry', name: 'Pastry' },
  { id: 'cold-drinks', name: 'Cold Drinks' },
  { id: 'groceries', name: 'Groceries' },
  { id: 'produce', name: 'Produce' },
  { id: 'dairy', name: 'Dairy' },
  { id: 'snacks', name: 'Snacks' },
  { id: 'starters', name: 'Starters' },
  { id: 'mains', name: 'Mains' },
  { id: 'desserts', name: 'Desserts' },
  { id: 'beverages', name: 'Beverages' },
  { id: 'manicures', name: 'Manicures' },
  { id: 'pedicures', name: 'Pedicures' },
  { id: 'nail-enhancements', name: 'Enhancements' },
  { id: 'nail-addons', name: 'Add-ons' },
  { id: 'salon-retail', name: 'Retail' },
]

function standardProduct(
  index: number,
  categoryId: string,
  skuPrefix: string,
  id: string,
  name: string,
  priceCents: number,
  businessModes: BusinessMode[],
  extra: Partial<Product> = {},
): Product {
  return {
    id,
    categoryId,
    sku: `${skuPrefix}-${String(index).padStart(3, '0')}`,
    barcode: String(480000000000 + index + skuOffsets[skuPrefix]),
    name,
    priceCents,
    taxRate: 0.12,
    kind: 'standard',
    businessModes,
    ...extra,
  }
}

const skuOffsets: Record<string, number> = {
  COF: 0,
  TEA: 100,
  PAS: 200,
  CLD: 300,
  GRO: 400,
  PRO: 500,
  DAI: 600,
  SNK: 700,
  APP: 800,
  MAN: 900,
  DES: 1000,
  BEV: 1100,
  MNC: 1200,
  PED: 1300,
  ENH: 1400,
  ADO: 1500,
  RET: 1600,
}

export const demoProducts: Product[] = [
  // Coffee
  standardProduct(1, 'coffee', 'COF', 'espresso', 'Espresso', 12000, ['coffee-shop'], {
    imageUrl: '/products/espresso.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/BnrKDRn5sjg',
    stockQty: 48, lowStockThreshold: 10,
  }),
  standardProduct(2, 'coffee', 'COF', 'latte', 'Cafe Latte', 18000, ['coffee-shop'], {
    imageUrl: '/products/latte.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/coffee-latte-on-white-cup-tw-NE27qmpc',
    stockQty: 32, lowStockThreshold: 10,
  }),
  standardProduct(3, 'coffee', 'COF', 'americano', 'Americano', 15000, ['coffee-shop'], {
    imageUrl: '/products/americano.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/xKS-1DP4g7A',
    stockQty: 4, lowStockThreshold: 10,
  }),
  standardProduct(4, 'coffee', 'COF', 'cappuccino', 'Cappuccino', 17000, ['coffee-shop'], {
    imageUrl: '/products/cappuccino.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/cup-of-cappuccino-Xv0CHwbn6O8',
    stockQty: 2, lowStockThreshold: 10,
  }),
  standardProduct(5, 'coffee', 'COF', 'caramel-mocha', 'Caramel Mocha', 19500, ['coffee-shop'], {
    imageUrl: '/products/caramel-mocha.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/a-cup-of-hot-chocolate-with-whipped-cream-7IZORt5GiLI',
    stockQty: 0, outOfStock: true,
  }),
  standardProduct(6, 'coffee', 'COF', 'flat-white', 'Flat White', 18500, ['coffee-shop'], {
    imageUrl: '/products/flat-white.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/shallow-focus-photography-of-coffee-late-in-mug-on-table-zUNs99PGDg0',
    stockQty: 15, lowStockThreshold: 8,
  }),
  standardProduct(7, 'coffee', 'COF', 'caramel-macchiato', 'Caramel Macchiato', 19000, ['coffee-shop'], {
    imageUrl: '/products/caramel-macchiato.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/1EV6hDgDpFM',
    stockQty: 18, lowStockThreshold: 8,
  }),
  standardProduct(8, 'coffee', 'COF', 'affogato', 'Affogato', 21500, ['coffee-shop'], {
    imageUrl: '/products/affogato.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/person-pouring-brown-liquid-on-clear-drinking-glass-wKz7L5wchds',
    stockQty: 12, lowStockThreshold: 5,
  }),

  // Tea
  standardProduct(1, 'tea', 'TEA', 'matcha', 'Iced Matcha', 21000, ['coffee-shop'], {
    imageUrl: '/products/matcha.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/iced-matcha-latte-with-milk-and-straw-LKmqNL-E4fk',
    stockQty: 3, lowStockThreshold: 8,
  }),
  standardProduct(2, 'tea', 'TEA', 'black-tea', 'Black Tea', 11000, ['coffee-shop'], {
    imageUrl: '/products/black-tea.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/7hohUWqBqU4',
    stockQty: 22, lowStockThreshold: 8,
  }),
  standardProduct(3, 'tea', 'TEA', 'green-tea', 'Green Tea', 11000, ['coffee-shop'], {
    imageUrl: '/products/green-tea.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/a-cup-of-green-tea-on-a-wooden-table-AlJL7eN-4aY',
    stockQty: 20, lowStockThreshold: 8,
  }),
  standardProduct(4, 'tea', 'TEA', 'chai-latte', 'Chai Latte', 17500, ['coffee-shop'], {
    imageUrl: '/products/chai-latte.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/a-bottle-of-chai-next-to-a-cup-of-coffee-ikVVAJ2ajWM',
    stockQty: 14, lowStockThreshold: 8,
  }),
  standardProduct(5, 'tea', 'TEA', 'earl-grey', 'Earl Grey Tea', 11500, ['coffee-shop'], {
    stockQty: 25, lowStockThreshold: 10,
  }),

  // Pastry
  standardProduct(1, 'pastry', 'PAS', 'croissant', 'Butter Croissant', 9500, ['coffee-shop'], {
    imageUrl: '/products/croissant.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/a-croissant-on-a-plate-with-butter-and-a-knife-fc8y5qpBKWQ',
    stockQty: 24, lowStockThreshold: 8,
  }),
  standardProduct(2, 'pastry', 'PAS', 'blueberry-muffin', 'Blueberry Muffin', 10500, ['coffee-shop'], {
    imageUrl: '/products/blueberry-muffin.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/blueberry-muffins-in-a-muffin-tin-on-a-cutting-board-5p6pM1LlLk4',
    stockQty: 0, outOfStock: true,
  }),
  standardProduct(3, 'pastry', 'PAS', 'chocolate-muffin', 'Chocolate Muffin', 10500, ['coffee-shop'], {
    imageUrl: '/products/chocolate-muffin.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/a-plate-of-chocolate-muffins-on-a-table-mZPKGqoAhkA',
    stockQty: 18, lowStockThreshold: 6,
  }),
  standardProduct(4, 'pastry', 'PAS', 'cinnamon-roll', 'Cinnamon Roll', 12000, ['coffee-shop'], {
    imageUrl: '/products/cinnamon-roll.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/a-pan-filled-with-cinnamon-rolls-covered-in-icing-c07YNJmNfaE',
    stockQty: 12, lowStockThreshold: 5,
  }),
  standardProduct(5, 'pastry', 'PAS', 'banana-bread', 'Banana Bread Slice', 9800, ['coffee-shop'], {
    imageUrl: '/products/banana-bread.jpg',
    imageAttributionUrl:
      'https://unsplash.com/photos/a-loaf-of-banana-nut-bread-sitting-on-top-of-a-wooden-cutting-board-a0fBbS8RZAo',
    stockQty: 15, lowStockThreshold: 5,
  }),
  standardProduct(6, 'pastry', 'PAS', 'bagel', 'Plain Bagel', 8500, ['coffee-shop'], {
    imageUrl: '/products/bagel.jpg',
    imageAttributionUrl: 'https://unsplash.com/s/photos/bagel',
    stockQty: 10, lowStockThreshold: 4,
  }),
  standardProduct(7, 'pastry', 'PAS', 'apple-danish', 'Apple Danish', 11000, ['coffee-shop'], {
    imageUrl: '/products/apple-danish.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/brown-and-white-pastry-on-white-ceramic-plate-acw-W7oeFOk',
    stockQty: 8, lowStockThreshold: 4,
  }),
  standardProduct(8, 'pastry', 'PAS', 'glazed-donut', 'Glazed Donut', 7500, ['coffee-shop'], {
    imageUrl: '/products/glazed-donut.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/six-glazed-donuts-in-a-white-box-QjXUc8bSSGg',
    stockQty: 16, lowStockThreshold: 6,
  }),
  standardProduct(9, 'pastry', 'PAS', 'brownie', 'Chocolate Brownie', 9200, ['coffee-shop'], {
    imageUrl: '/products/chocolate-muffin.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/a-plate-of-chocolate-muffins-on-a-table-mZPKGqoAhkA',
    stockQty: 14, lowStockThreshold: 5,
  }),
  standardProduct(10, 'pastry', 'PAS', 'sandwich', 'Club Sandwich', 15500, ['coffee-shop'], {
    imageUrl: '/products/bread-loaf.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/a-loaf-of-bread-sitting-on-top-of-a-cutting-board-GK7v9dePZhY',
    stockQty: 8, lowStockThreshold: 3,
  }),

  // Cold drinks
  standardProduct(1, 'cold-drinks', 'CLD', 'iced-americano', 'Iced Americano', 16000, ['coffee-shop'], {
    imageUrl: '/products/iced-americano.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/glass-of-iced-coffee-placed-on-brown-stone-_Wm6mhXO9rk',
    stockQty: 20, lowStockThreshold: 8,
  }),
  standardProduct(2, 'cold-drinks', 'CLD', 'iced-latte', 'Iced Latte', 19500, ['coffee-shop'], {
    imageUrl: '/products/iced-latte.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/glass-cup-filled-with-ice-latte-on-tabletop-L-sm1B4L1Ns',
    stockQty: 18, lowStockThreshold: 8,
  }),
  standardProduct(3, 'cold-drinks', 'CLD', 'iced-mocha', 'Iced Mocha', 21000, ['coffee-shop'], {
    imageUrl: '/products/iced-mocha.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/clear-glass-filled-ice-coffee-vZOZJH_xkUk',
    stockQty: 15, lowStockThreshold: 6,
  }),
  standardProduct(4, 'cold-drinks', 'CLD', 'cold-brew', 'Cold Brew', 17500, ['coffee-shop'], {
    imageUrl: '/products/cold-brew.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/cold-brew-coffee-in-a-mason-jar-with-ice-WCmMU38zg1c',
    stockQty: 0, outOfStock: true,
  }),
  standardProduct(5, 'cold-drinks', 'CLD', 'lemonade', 'Fresh Lemonade', 13000, ['coffee-shop'], {
    imageUrl: '/products/lemonade.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/a-glass-of-lemonade-next-to-sliced-lemons-and-flowers-Z3z1O7hqyC4',
    stockQty: 12, lowStockThreshold: 5,
  }),
  standardProduct(6, 'cold-drinks', 'CLD', 'sparkling-water', 'Sparkling Water', 8000, ['coffee-shop'], {
    stockQty: 30, lowStockThreshold: 10,
  }),
  standardProduct(7, 'cold-drinks', 'CLD', 'water-bottle', 'Water Bottle', 6500, ['coffee-shop'], {
    imageUrl: '/products/still-water.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/white-and-blue-labeled-disposable-bottled-water-g016_NJoOUk',
    stockQty: 35, lowStockThreshold: 12,
  }),

  // Groceries
  standardProduct(1, 'groceries', 'GRO', 'milk', 'Fresh Milk 1L', 9800, ['grocery'], {
    imageUrl: '/products/milk.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/white-milk-in-clear-glass-bottle-8Pp9M13xuzs',
    stockQty: 60, lowStockThreshold: 15,
  }),
  standardProduct(2, 'groceries', 'GRO', 'rice', 'Premium Rice 5kg', 28500, ['grocery'], {
    imageUrl: '/products/rice.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/a-bunch-of-baskets-filled-with-white-rice-n2sy8zlngYo',
    stockQty: 5, lowStockThreshold: 15,
  }),
  standardProduct(3, 'groceries', 'GRO', 'cooking-oil', 'Cooking Oil 1L', 11500, ['grocery'], {
    imageUrl: '/products/cooking-oil.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/a-bottle-of-olive-oil-next-to-a-plate-of-food-c_xqdv4QIcU',
    stockQty: 0, outOfStock: true,
  }),
  standardProduct(4, 'groceries', 'GRO', 'white-sugar', 'White Sugar 1kg', 7200, ['grocery'], {
    imageUrl: '/products/white-sugar.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/u_Mwofs_zu0',
    stockQty: 40, lowStockThreshold: 12,
  }),
  standardProduct(5, 'groceries', 'GRO', 'iodized-salt', 'Iodized Salt 500g', 2500, ['grocery'], {
    stockQty: 55, lowStockThreshold: 15,
  }),
  standardProduct(6, 'groceries', 'GRO', 'soy-sauce', 'Soy Sauce 1L', 6800, ['grocery'], {
    stockQty: 28, lowStockThreshold: 10,
  }),
  standardProduct(7, 'groceries', 'GRO', 'instant-noodles', 'Instant Noodles', 1800, ['grocery'], {
    imageUrl: '/products/instant-noodles.jpg',
    imageAttributionUrl:
      'https://unsplash.com/photos/shelves-stocked-with-various-instant-noodle-cups-and-snacks-__M3lmGo4AY',
    stockQty: 80, lowStockThreshold: 20,
  }),
  standardProduct(8, 'groceries', 'GRO', 'canned-sardines', 'Canned Sardines', 3200, ['grocery'], {
    stockQty: 65, lowStockThreshold: 20,
  }),
  standardProduct(9, 'groceries', 'GRO', 'bread-loaf', 'White Bread Loaf', 6500, ['grocery'], {
    imageUrl: '/products/bread-loaf.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/a-loaf-of-bread-sitting-on-top-of-a-cutting-board-GK7v9dePZhY',
    stockQty: 22, lowStockThreshold: 8,
  }),

  // Produce (sold by weight)
  standardProduct(1, 'produce', 'PRO', 'bananas', 'Bananas', 7600, ['grocery'], {
    kind: 'weighted',
    unitLabel: '/ kg',
    imageUrl: '/products/bananas.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/a-bunch-of-bananas-TwkJKNMJpeM',
    stockQty: 25, lowStockThreshold: 8,
  }),
  standardProduct(2, 'produce', 'PRO', 'tomatoes', 'Tomatoes', 14500, ['grocery'], {
    kind: 'weighted',
    unitLabel: '/ kg',
    imageUrl: '/products/tomatoes.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/26LFdL8exMo',
    stockQty: 18, lowStockThreshold: 6,
  }),
  standardProduct(3, 'produce', 'PRO', 'red-onions', 'Red Onions', 13000, ['grocery'], {
    kind: 'weighted',
    unitLabel: '/ kg',
    imageUrl: '/products/red-onions.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/SPGtZ62qyyg',
    stockQty: 20, lowStockThreshold: 8,
  }),
  standardProduct(4, 'produce', 'PRO', 'garlic', 'Garlic', 22000, ['grocery'], {
    kind: 'weighted',
    unitLabel: '/ kg',
    imageUrl: '/products/garlic.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/gKt9wZp2ujU',
    stockQty: 12, lowStockThreshold: 5,
  }),
  standardProduct(5, 'produce', 'PRO', 'potatoes', 'Potatoes', 9500, ['grocery'], {
    kind: 'weighted',
    unitLabel: '/ kg',
    imageUrl: '/products/potatoes.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/a-pile-of-potatoes-gV6p1oxDMog',
    stockQty: 30, lowStockThreshold: 10,
  }),
  standardProduct(6, 'produce', 'PRO', 'carrots', 'Carrots', 11000, ['grocery'], {
    kind: 'weighted',
    unitLabel: '/ kg',
    imageUrl: '/products/carrots.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/a-pile-of-carrots-with-green-tops-and-leaves-IZq1FV87qpM',
    stockQty: 22, lowStockThreshold: 8,
  }),
  standardProduct(7, 'produce', 'PRO', 'cabbage', 'Cabbage', 6500, ['grocery'], {
    kind: 'weighted',
    unitLabel: '/ kg',
    imageUrl: '/products/cabbage.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/green-and-white-cabbage-vegetable-CLwHYy17rSA',
    stockQty: 15, lowStockThreshold: 5,
  }),
  standardProduct(8, 'produce', 'PRO', 'calamansi', 'Calamansi', 18000, ['grocery'], {
    kind: 'weighted',
    unitLabel: '/ kg',
    stockQty: 8, lowStockThreshold: 3,
  }),

  // Dairy
  standardProduct(1, 'dairy', 'DAI', 'cheddar-cheese', 'Cheddar Cheese 200g', 14500, ['grocery'], {
    imageUrl: '/products/cheddar-cheese.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/sliced-cheese-on-brown-wooden-chopping-board-c0O9Y-jrAFk',
    stockQty: 18, lowStockThreshold: 6,
  }),
  standardProduct(2, 'dairy', 'DAI', 'butter', 'Butter 200g', 13500, ['grocery'], {
    stockQty: 22, lowStockThreshold: 8,
  }),
  standardProduct(3, 'dairy', 'DAI', 'yogurt-cup', 'Yogurt Cup', 4500, ['grocery'], {
    imageUrl: '/products/yogurt-cup.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/a-cup-of-yogurt-with-sprinkles-and-a-spoon-wjra1cZIYJI',
    stockQty: 30, lowStockThreshold: 10,
  }),
  standardProduct(4, 'dairy', 'DAI', 'eggs-dozen', 'Eggs (dozen)', 9000, ['grocery'], {
    imageUrl: '/products/eggs-dozen.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/a-carton-of-eggs-jIfVrNrhbI8',
    stockQty: 25, lowStockThreshold: 8,
  }),
  standardProduct(5, 'dairy', 'DAI', 'condensed-milk', 'Condensed Milk 300ml', 5800, ['grocery'], {
    imageUrl: '/products/condensed-milk.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/uJ0GjG75Rsc',
    stockQty: 35, lowStockThreshold: 12,
  }),

  // Snacks
  standardProduct(1, 'snacks', 'SNK', 'potato-chips', 'Potato Chips', 5500, ['grocery'], {
    imageUrl: '/products/potato-chips.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/a-bag-of-lays-classic-potato-chips-UVHRlvXTt8Y',
    stockQty: 45, lowStockThreshold: 15,
  }),
  standardProduct(2, 'snacks', 'SNK', 'chocolate-bar', 'Chocolate Bar', 4800, ['grocery'], {
    imageUrl: '/products/chocolate-bar.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/brown-and-white-chocolate-bar-EwaJbJvS9io',
    stockQty: 50, lowStockThreshold: 15,
  }),
  standardProduct(3, 'snacks', 'SNK', 'crackers', 'Crackers Pack', 3800, ['grocery'], {
    imageUrl: '/products/crackers.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/a-plate-of-cheese-crackers-strawberries-and-a-glass-of-wine-DbQZVcNQWXo',
    stockQty: 38, lowStockThreshold: 12,
  }),
  standardProduct(4, 'snacks', 'SNK', 'roasted-peanuts', 'Roasted Peanuts 100g', 4200, ['grocery'], {
    imageUrl: '/products/roasted-peanuts.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/brown-peanuts-in-blue-ceramic-bowl-7zURkSonS70',
    stockQty: 42, lowStockThreshold: 12,
  }),
  standardProduct(5, 'snacks', 'SNK', 'assorted-biscuits', 'Assorted Biscuits', 5200, ['grocery'], {
    stockQty: 30, lowStockThreshold: 10,
  }),

  // Restaurant — Starters
  standardProduct(1, 'starters', 'APP', 'spring-rolls', 'Spring Rolls (6 pcs)', 12000, ['restaurant'], {
    imageUrl: '/products/spring-rolls.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/spring-rolls-on-plate-L7dVTV02afU',
    stockQty: 20, lowStockThreshold: 6,
  }),
  standardProduct(2, 'starters', 'APP', 'soup-of-the-day', 'Soup of the Day', 15000, ['restaurant'], {
    imageUrl: '/products/soup-of-the-day.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/bowl-of-thick-soup-on-plate-k5VGs9qQubc',
    stockQty: 15, lowStockThreshold: 5,
  }),
  standardProduct(3, 'starters', 'APP', 'calamari', 'Crispy Calamari', 18000, ['restaurant'], {
    imageUrl: '/products/calamari.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/pile-of-fried-calamari-served-on-a-dark-plate-K7S_ZeCl9SI',
    stockQty: 18, lowStockThreshold: 6,
  }),
  standardProduct(4, 'starters', 'APP', 'tokwat-baboy', "Tokwa't Baboy", 14500, ['restaurant'], {
    stockQty: 12, lowStockThreshold: 4,
  }),
  standardProduct(5, 'starters', 'APP', 'mixed-greens-salad', 'Mixed Greens Salad', 13000, ['restaurant', 'coffee-shop'], {
    imageUrl: '/products/mixed-greens-salad.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/green-salad-on-a-black-bowl-bBzjWthTqb8',
    stockQty: 14, lowStockThreshold: 5,
  }),

  // Restaurant — Mains
  standardProduct(1, 'mains', 'MAN', 'chicken-adobo', 'Chicken Adobo', 28000, ['restaurant'], {
    imageUrl: '/products/chicken-adobo.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/steamed-rice-with-adobong-pork-on-top-LCaBh7QSGr8',
    stockQty: 22, lowStockThreshold: 6,
  }),
  standardProduct(2, 'mains', 'MAN', 'pork-sinigang', 'Pork Sinigang', 32000, ['restaurant'], {
    stockQty: 15, lowStockThreshold: 5,
  }),
  standardProduct(3, 'mains', 'MAN', 'grilled-bangus', 'Grilled Bangus', 35000, ['restaurant'], {
    imageUrl: '/products/grilled-bangus.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/grilled-fish-A9LvHrHmiWo',
    stockQty: 12, lowStockThreshold: 4,
  }),
  standardProduct(4, 'mains', 'MAN', 'beef-caldereta', 'Beef Caldereta', 38000, ['restaurant'], {
    imageUrl: '/products/beef-caldereta.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/meat-with-sauce-in-black-bowl-xKSRpUH0VZo',
    stockQty: 10, lowStockThreshold: 4,
  }),
  standardProduct(5, 'mains', 'MAN', 'kare-kare', 'Kare-Kare', 42000, ['restaurant'], {
    imageUrl: '/products/kare-kare.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/pork-belly-with-vegetables-in-a-rich-orange-sauce-5y7wtGlqguI',
    stockQty: 8, lowStockThreshold: 3,
  }),
  standardProduct(6, 'mains', 'MAN', 'pork-bbq', 'Pork BBQ (3 sticks)', 18000, ['restaurant'], {
    imageUrl: '/products/pork-bbq.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/meat-skewers-grilling-over-hot-coals-oxOdyouOtQ4',
    stockQty: 25, lowStockThreshold: 8,
  }),
  standardProduct(7, 'mains', 'MAN', 'laing', 'Laing', 20000, ['restaurant'], {
    stockQty: 18, lowStockThreshold: 6,
  }),
  standardProduct(8, 'mains', 'MAN', 'steamed-rice', 'Steamed Rice', 5000, ['restaurant'], {
    imageUrl: '/products/steamed-rice.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/a-pile-of-cooked-white-rice-InXOWBFm33I',
    stockQty: 50, lowStockThreshold: 15,
  }),

  // Restaurant — Desserts
  standardProduct(1, 'desserts', 'DES', 'leche-flan', 'Leche Flan', 12000, ['restaurant'], {
    imageUrl: '/products/leche-flan.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/leche-flan-on-plate-zUIzKi96zJk',
    stockQty: 16, lowStockThreshold: 5,
  }),
  standardProduct(2, 'desserts', 'DES', 'halo-halo', 'Halo-Halo', 18500, ['restaurant'], {
    stockQty: 12, lowStockThreshold: 4,
  }),
  standardProduct(3, 'desserts', 'DES', 'ice-cream', 'Ice Cream (2 scoops)', 15000, ['restaurant'], {
    imageUrl: '/products/ice-cream.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/bowl-of-ice-cream-iT4qcNMhYTQ',
    stockQty: 20, lowStockThreshold: 6,
  }),
  standardProduct(4, 'desserts', 'DES', 'biko', 'Biko', 10000, ['restaurant'], {
    stockQty: 14, lowStockThreshold: 5,
  }),
  standardProduct(5, 'desserts', 'DES', 'turon', 'Turon (3 pcs)', 8000, ['restaurant'], {
    imageUrl: '/products/turon.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/fried-bananas-sprinkled-with-brown-sugar-on-a-plate-4oGKCdrBDzE',
    stockQty: 18, lowStockThreshold: 6,
  }),

  // Restaurant — Beverages
  standardProduct(1, 'beverages', 'BEV', 'still-water', 'Still Water', 5000, ['restaurant'], {
    imageUrl: '/products/still-water.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/white-and-blue-labeled-disposable-bottled-water-g016_NJoOUk',
    stockQty: 40, lowStockThreshold: 12,
  }),
  standardProduct(2, 'beverages', 'BEV', 'iced-tea', 'Iced Tea', 9000, ['restaurant'], {
    imageUrl: '/products/iced-tea.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/clear-drinking-glass-with-tea-kbch-i63YTg',
    stockQty: 35, lowStockThreshold: 12,
  }),
  standardProduct(3, 'beverages', 'BEV', 'calamansi-juice', 'Calamansi Juice', 8500, ['restaurant'], {
    imageUrl: '/products/calamansi-juice.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/clear-drinking-glass-with-lemon-juice-WDgN0XclV_w',
    stockQty: 28, lowStockThreshold: 10,
  }),
  standardProduct(4, 'beverages', 'BEV', 'soda-can', 'Soda (can)', 7500, ['restaurant'], {
    imageUrl: '/products/soda-can.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/a-can-of-soda-on-a-white-background-nZvTEtAc024',
    stockQty: 45, lowStockThreshold: 15,
  }),
  standardProduct(5, 'beverages', 'BEV', 'buko-juice', 'Fresh Buko Juice', 12000, ['restaurant'], {
    imageUrl: '/products/buko-juice.jpg',
    imageAttributionUrl: 'https://unsplash.com/photos/person-holding-coconut-juice-OwUGuWpC514',
    stockQty: 18, lowStockThreshold: 6,
  }),
  standardProduct(6, 'beverages', 'BEV', 'san-miguel', 'San Miguel Beer', 11000, ['restaurant'], {
    stockQty: 30, lowStockThreshold: 10,
  }),

  // Nail Salon — Manicures
  standardProduct(1, 'manicures', 'MNC', 'classic-manicure', 'Classic Manicure', 25000, ['nail-salon'], {
    imageUrl: '/products/classic-manicure.jpg',
  }),
  standardProduct(2, 'manicures', 'MNC', 'express-manicure', 'Express Manicure', 18000, ['nail-salon'], {
    imageUrl: '/products/express-manicure.jpg',
  }),
  standardProduct(3, 'manicures', 'MNC', 'gel-manicure', 'Gel Manicure', 45000, ['nail-salon'], {
    imageUrl: '/products/gel-manicure.jpg',
  }),
  standardProduct(4, 'manicures', 'MNC', 'spa-manicure', 'Spa Manicure', 55000, ['nail-salon'], {
    imageUrl: '/products/spa-manicure.jpg',
  }),

  // Nail Salon — Pedicures
  standardProduct(1, 'pedicures', 'PED', 'classic-pedicure', 'Classic Pedicure', 35000, ['nail-salon'], {
    imageUrl: '/products/classic-pedicure.jpg',
  }),
  standardProduct(2, 'pedicures', 'PED', 'express-pedicure', 'Express Pedicure', 25000, ['nail-salon'], {
    imageUrl: '/products/express-pedicure.jpg',
  }),
  standardProduct(3, 'pedicures', 'PED', 'gel-pedicure', 'Gel Pedicure', 55000, ['nail-salon'], {
    imageUrl: '/products/gel-pedicure.jpg',
  }),
  standardProduct(4, 'pedicures', 'PED', 'spa-pedicure', 'Spa Pedicure', 65000, ['nail-salon'], {
    imageUrl: '/products/spa-pedicure.jpg',
  }),

  // Nail Salon — Enhancements
  standardProduct(1, 'nail-enhancements', 'ENH', 'nail-refill', 'Nail Refill / Fill-in', 50000, ['nail-salon'], {
    imageUrl: '/products/nail-refill.jpg',
  }),
  standardProduct(2, 'nail-enhancements', 'ENH', 'acrylic-full-set', 'Acrylic Full Set', 80000, ['nail-salon'], {
    imageUrl: '/products/acrylic-full-set.jpg',
  }),
  standardProduct(3, 'nail-enhancements', 'ENH', 'dip-powder-full-set', 'Dip Powder Full Set', 85000, ['nail-salon'], {
    imageUrl: '/products/dip-powder-full-set.jpg',
  }),
  standardProduct(4, 'nail-enhancements', 'ENH', 'gel-extension-full-set', 'Gel Extension Full Set', 90000, ['nail-salon'], {
    imageUrl: '/products/gel-extension-full-set.jpg',
  }),

  // Nail Salon — Add-ons
  standardProduct(1, 'nail-addons', 'ADO', 'nail-art-per-nail', 'Nail Art (per nail)', 5000, ['nail-salon'], {
    imageUrl: '/products/nail-art-per-nail.jpg',
  }),
  standardProduct(2, 'nail-addons', 'ADO', 'rhinestone-accent', 'Rhinestone Accent', 8000, ['nail-salon'], {
    imageUrl: '/products/rhinestone-accent.jpg',
  }),
  standardProduct(3, 'nail-addons', 'ADO', 'french-tip', 'French Tip', 10000, ['nail-salon'], {
    imageUrl: '/products/french-tip.jpg',
  }),
  standardProduct(4, 'nail-addons', 'ADO', 'paraffin-wax-treatment', 'Paraffin Wax Treatment', 20000, ['nail-salon'], {
    imageUrl: '/products/paraffin-wax-treatment.jpg',
  }),
  standardProduct(5, 'nail-addons', 'ADO', 'chrome-cat-eye-finish', 'Chrome / Cat Eye Finish', 15000, ['nail-salon'], {
    imageUrl: '/products/chrome-cat-eye-finish.jpg',
  }),

  // Nail Salon — Retail
  standardProduct(1, 'salon-retail', 'RET', 'nail-polish-bottle', 'Nail Polish Bottle', 15000, ['nail-salon'], {
    imageUrl: '/products/nail-polish-bottle.jpg',
    stockQty: 40, lowStockThreshold: 10,
  }),
  standardProduct(2, 'salon-retail', 'RET', 'cuticle-oil', 'Cuticle Oil', 18000, ['nail-salon'], {
    imageUrl: '/products/cuticle-oil.jpg',
    stockQty: 30, lowStockThreshold: 8,
  }),
  standardProduct(3, 'salon-retail', 'RET', 'hand-cream', 'Hand Cream', 22000, ['nail-salon'], {
    imageUrl: '/products/hand-cream.jpg',
    stockQty: 25, lowStockThreshold: 8,
  }),
  standardProduct(4, 'salon-retail', 'RET', 'nail-strengthener', 'Nail Strengthener', 25000, ['nail-salon'], {
    imageUrl: '/products/nail-strengthener.jpg',
    stockQty: 20, lowStockThreshold: 6,
  }),
]

export function formatCurrency(amountCents: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amountCents / 100)
}

export function formatCompactDate(value: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function calculateTax(amountCents: number, rate: number): number {
  return Math.round(amountCents * rate)
}

export function slugTicket(id: string): string {
  return id.slice(0, 8).toUpperCase()
}
