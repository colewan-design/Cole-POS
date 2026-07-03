import {
  defaultRoles,
  calculateTax,
  defaultSettings,
  demoCategories,
  demoProducts,
  guestCustomerName,
  slugTicket,
  type AppEvent,
  type AuthSession,
  type AppSettings,
  type BusinessMode,
  type CashMovementSummary,
  type Category,
  type CreateCategoryInput,
  type CreateCustomerInput,
  type CreateOrderInput,
  type CreateProductInput,
  type Customer,
  type OrderItemSummary,
  type OrderSummary,
  type PaymentMethod,
  type Product,
  type RoleDefinition,
  type ShiftSummary,
  type UserAccount,
} from '@pos/shared/index'
import type { PosRepository } from '@pos/data/index'

/**
 * A fully in-memory PosRepository for the marketing landing page.
 *
 * The landing page mounts the real register/analytics components so visitors
 * see the actual product, not a mockup — but it must never touch the
 * visitor's localStorage/IndexedDB (same origin as the real app), since that
 * would silently overwrite their real settings/orders if they later sign in
 * for real. Everything here lives in memory and disappears on reload.
 */

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomItem<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)]
}

function weightedBusinessMode(): BusinessMode {
  const roll = Math.random()
  if (roll < 0.5) return 'coffee-shop'
  if (roll < 0.8) return 'grocery'
  return 'restaurant'
}

function weightedPaymentMethod(): PaymentMethod {
  const roll = Math.random()
  if (roll < 0.55) return 'cash'
  if (roll < 0.85) return 'card'
  return 'ewallet'
}

function seedDemoCustomers(): Customer[] {
  const timestamp = new Date().toISOString()
  return [
    { name: 'Maria Santos', phone: '09171234567', email: 'maria@demo.cole', notes: 'Prefers iced drinks.' },
    { name: 'Paolo Reyes', phone: '09179876543', email: 'paolo@demo.cole', notes: 'Usually orders for pickup.' },
    { name: 'Anne Lim', phone: '09175554444', email: 'anne@demo.cole', notes: 'Loyal weekend shopper.' },
    { name: 'Miguel Garcia', phone: '09176667777', email: 'miguel@demo.cole', notes: 'Asks for printed receipts.' },
  ].map((customer) => ({
    id: crypto.randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    ...customer,
  }))
}

function buildDemoOrder(createdAt: Date, customers: Customer[]): OrderSummary {
  const businessMode = weightedBusinessMode()
  const pool = demoProducts.filter((p) => p.businessModes.includes(businessMode))
  const itemCount = randomInt(1, 4)
  const items: OrderItemSummary[] = []
  const used = new Set<string>()

  for (let i = 0; i < itemCount; i++) {
    const product = randomItem(pool)
    if (used.has(product.id)) continue
    used.add(product.id)
    const quantity = randomInt(1, 3)
    items.push({
      productId: product.id,
      name: product.name,
      quantity,
      unitPriceCents: product.priceCents,
      lineTotalCents: product.priceCents * quantity,
    })
  }

  const subtotalCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0)
  const taxCents = items.reduce((sum, item) => {
    const product = pool.find((p) => p.id === item.productId)
    return sum + calculateTax(item.lineTotalCents, product?.taxRate ?? 0.12)
  }, 0)
  const totalCents = subtotalCents + taxCents
  const paymentMethod = weightedPaymentMethod()
  const tenderedCents = paymentMethod === 'cash' ? totalCents + randomItem([0, 0, 0, 2000, 5000]) : totalCents
  const customer = Math.random() < 0.35 ? randomItem(customers) : null

  return {
    id: crypto.randomUUID(),
    ticketNumber: slugTicket(crypto.randomUUID()),
    businessMode,
    customerId: customer?.id ?? null,
    customerName: customer?.name ?? guestCustomerName,
    orderType: Math.random() < 0.7 ? 'takeaway' : 'dine_in',
    paymentMethod,
    subtotalCents,
    taxCents,
    totalCents,
    tenderedCents,
    changeCents: Math.max(tenderedCents - totalCents, 0),
    createdAt: createdAt.toISOString(),
    items,
  }
}

/** Seeds ~30 days of orders, busier on weekends and in the most recent week, so Analytics has a realistic story across every range filter. */
function seedDemoOrders(customers: Customer[]): OrderSummary[] {
  const orders: OrderSummary[] = []
  const now = new Date()

  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const day = new Date(now)
    day.setDate(now.getDate() - dayOffset)
    const isWeekend = day.getDay() === 0 || day.getDay() === 6
    const recencyBoost = dayOffset < 7 ? 1.3 : 1
    const base = isWeekend ? randomInt(14, 22) : randomInt(8, 16)
    const count = Math.round(base * recencyBoost)

    for (let i = 0; i < count; i++) {
      const createdAt = new Date(day)
      createdAt.setHours(randomInt(7, 20), randomInt(0, 59), randomInt(0, 59), 0)
      orders.push(buildDemoOrder(createdAt, customers))
    }
  }

  return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function generateSku(name: string): string {
  const prefix = name.slice(0, 3).toUpperCase().padEnd(3, 'X').replace(/[^A-Z]/g, 'X')
  return `${prefix}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`
}

export function createDemoPosRepository(): PosRepository {
  let products: Product[] = [...demoProducts]
  let categories: Category[] = [...demoCategories]
  let customers: Customer[] = seedDemoCustomers()
  let orders: OrderSummary[] = seedDemoOrders(customers)
  let settings: AppSettings = { ...defaultSettings, businessName: 'Cole POS Demo' }
  let appEvents: AppEvent[] = []
  let users: UserAccount[] = []
  let roles: RoleDefinition[] = [...defaultRoles]
  let session: AuthSession | null = null
  let activeShift: ShiftSummary | null = null
  let shiftHistory: ShiftSummary[] = []

  return {
    async loadCatalog() {
      return { products, categories }
    },

    async loadOrders() {
      return orders
    },

    async loadCustomers() {
      return customers
    },

    async loadActiveShift() {
      return activeShift
    },

    async loadShiftHistory() {
      return shiftHistory
    },

    async saveOrder(input: CreateOrderInput) {
      const subtotalCents = input.items.reduce((sum, item) => sum + item.lineTotalCents, 0)
      const taxCents = Math.round(subtotalCents * 0.12)
      const totalCents = subtotalCents + taxCents
      const order: OrderSummary = {
        id: crypto.randomUUID(),
        ticketNumber: slugTicket(crypto.randomUUID()),
        businessMode: input.businessMode,
        customerId: input.customerId ?? null,
        customerName: input.customerName?.trim() || guestCustomerName,
        orderType: input.orderType,
        paymentMethod: input.paymentMethod,
        subtotalCents,
        taxCents,
        totalCents,
        tenderedCents: input.tenderedCents,
        changeCents: Math.max(input.tenderedCents - totalCents, 0),
        createdAt: new Date().toISOString(),
        items: input.items,
      }
      orders = [order, ...orders]

      if (activeShift && !activeShift.closedAt) {
        const isCash = order.paymentMethod === 'cash'
        activeShift = {
          ...activeShift,
          cashSalesCents: activeShift.cashSalesCents + (isCash ? order.totalCents : 0),
          expectedCashCents: activeShift.expectedCashCents + (isCash ? order.totalCents : 0),
          totalSalesCents: activeShift.totalSalesCents + order.totalCents,
          orderCount: activeShift.orderCount + 1,
        }
      }

      return order
    },

    async saveCustomer(input: CreateCustomerInput) {
      const timestamp = new Date().toISOString()
      const customer: Customer = {
        id: crypto.randomUUID(),
        name: input.name.trim(),
        phone: input.phone?.trim() || undefined,
        email: input.email?.trim() || undefined,
        notes: input.notes?.trim() || undefined,
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      customers = [customer, ...customers]
      return customer
    },

    async updateCustomer(customer: Customer) {
      const nextCustomer: Customer = {
        ...customer,
        name: customer.name.trim(),
        phone: customer.phone?.trim() || undefined,
        email: customer.email?.trim() || undefined,
        notes: customer.notes?.trim() || undefined,
        updatedAt: new Date().toISOString(),
      }
      customers = customers.map((entry) => (entry.id === nextCustomer.id ? nextCustomer : entry))
      orders = orders.map((order) =>
        order.customerId === nextCustomer.id
          ? { ...order, customerName: nextCustomer.name }
          : order,
      )
      return nextCustomer
    },

    async deleteCustomer(id: string) {
      customers = customers.filter((customer) => customer.id !== id)
    },

    async openShift(input) {
      activeShift = {
        id: crypto.randomUUID(),
        openedByUserId: input.userId ?? null,
        closedByUserId: null,
        openingCashCents: input.openingCashCents,
        closingCashCents: null,
        cashSalesCents: 0,
        totalSalesCents: 0,
        orderCount: 0,
        payInsCents: 0,
        payOutsCents: 0,
        expectedCashCents: input.openingCashCents,
        varianceCashCents: null,
        openedAt: new Date().toISOString(),
        closedAt: null,
        movements: [],
      }

      return activeShift
    },

    async addCashMovement(input) {
      if (!activeShift || activeShift.closedAt) {
        throw new Error('No active shift is open for this register.')
      }

      const movement: CashMovementSummary = {
        id: crypto.randomUUID(),
        userId: input.userId ?? null,
        movementType: input.movementType,
        amountCents: input.amountCents,
        reason: input.reason ?? null,
        createdAt: new Date().toISOString(),
      }

      const payInsCents = activeShift.payInsCents + (input.movementType === 'pay_in' ? input.amountCents : 0)
      const payOutsCents = activeShift.payOutsCents + (input.movementType === 'pay_out' ? input.amountCents : 0)

      activeShift = {
        ...activeShift,
        payInsCents,
        payOutsCents,
        expectedCashCents: activeShift.openingCashCents + activeShift.cashSalesCents + payInsCents - payOutsCents,
        movements: [movement, ...activeShift.movements],
      }

      return activeShift
    },

    async closeShift(input) {
      if (!activeShift || activeShift.closedAt) {
        throw new Error('No active shift is open for this register.')
      }

      const closedShift: ShiftSummary = {
        ...activeShift,
        closedByUserId: input.userId ?? null,
        closingCashCents: input.countedCashCents,
        varianceCashCents: input.countedCashCents - activeShift.expectedCashCents,
        closedAt: new Date().toISOString(),
      }

      shiftHistory = [closedShift, ...shiftHistory]
      activeShift = null
      return closedShift
    },

    async adjustInventory(input) {
      const product = products.find((entry) => entry.id === input.productId)
      if (!product || product.stockQty === undefined) {
        return null
      }

      const updated: Product = {
        ...product,
        stockQty: Math.max(0, product.stockQty + input.quantityDelta),
        outOfStock: Math.max(0, product.stockQty + input.quantityDelta) === 0,
      }

      products = products.map((entry) => (entry.id === updated.id ? updated : entry))
      return updated
    },

    async loadSettings() {
      return settings
    },

    async saveSettings(next: AppSettings) {
      settings = next
    },

    async loadUsers() {
      return users
    },

    async saveUsers(nextUsers) {
      users = nextUsers
    },

    async loginUser(username: string, password: string) {
      const normalizedUsername = username.trim().toLowerCase()
      const user = users.find((entry) => entry.username === normalizedUsername)
      if (!user || user.passwordHash !== password.trim()) {
        return null
      }

      session = {
        userId: user.id,
        signedInAt: new Date().toISOString(),
        authSource: 'local',
      }

      return { user, session }
    },

    async registerUser(input) {
      const fullName = input.fullName.trim()
      const username = input.username.trim().toLowerCase()
      const password = input.password.trim()
      if (!fullName || !username || !password || users.some((user) => user.username === username)) {
        return null
      }

      const user: UserAccount = {
        id: crypto.randomUUID(),
        fullName,
        username,
        passwordHash: password,
        roleId: users.length > 0 ? 'cashier' : 'admin',
        createdAt: new Date().toISOString(),
      }

      users = [...users, user]
      session = {
        userId: user.id,
        signedInAt: new Date().toISOString(),
        authSource: 'local',
      }

      return { user, session }
    },

    async updateUserRole(userId, roleId) {
      users = users.map((user) => (user.id === userId ? { ...user, roleId } : user))
    },

    async loadRoles() {
      return roles
    },

    async saveRoles(nextRoles) {
      roles = nextRoles
    },

    async loadSession() {
      return session
    },

    async saveSession(nextSession) {
      session = nextSession
    },

    async loadAppEvents() {
      return appEvents
    },

    async trackAppEvent(input) {
      const event: AppEvent = {
        id: crypto.randomUUID(),
        eventType: input.eventType,
        payload: input.payload,
        deviceId: 'landing-demo',
        appVersion: '0.1.0',
        createdAt: new Date().toISOString(),
        sentAt: null,
      }
      appEvents = [event, ...appEvents]
      return event
    },

    async saveProduct(input: CreateProductInput) {
      const product: Product = {
        ...input,
        id: crypto.randomUUID(),
        sku: generateSku(input.name),
        barcode: String(Date.now()).slice(-12),
      }
      products = [product, ...products]
      return product
    },

    async updateProduct(product: Product) {
      products = products.map((p) => (p.id === product.id ? product : p))
      return product
    },

    async deleteProduct(id: string) {
      products = products.filter((p) => p.id !== id)
    },

    async saveCategory(input: CreateCategoryInput) {
      const category: Category = { id: crypto.randomUUID(), name: input.name }
      categories = [...categories, category]
      return category
    },

    async updateCategory(category: Category) {
      categories = categories.map((c) => (c.id === category.id ? category : c))
      return category
    },

    async deleteCategory(id: string) {
      const remaining = categories.filter((c) => c.id !== id)
      categories = remaining
      const fallbackId = remaining[0]?.id ?? 'groceries'
      products = products.map((p) => (p.categoryId === id ? { ...p, categoryId: fallbackId } : p))
    },
  }
}
