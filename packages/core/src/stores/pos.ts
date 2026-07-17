import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getPosRepository } from '@pos/core/services/runtime'
import {
  calculateTax,
  defaultSettings,
  guestCustomerName,
  type AppEvent,
  type AppSettings,
  type Category,
  type CashMovementType,
  type CreateCategoryInput,
  type CreateCustomerInput,
  type CreateProductInput,
  type CreateTableInput,
  type Customer,
  type OrderStatus,
  type OrderSummary,
  type OrderType,
  type PaymentMethod,
  type Product,
  type RestaurantTable,
  type ShiftSummary,
} from '@pos/shared/index'

export const usePosStore = defineStore('pos', () => {
  const repository = getPosRepository()

  const products = ref<Product[]>([])
  const categories = ref<{ id: string; name: string }[]>([])
  const customers = ref<Customer[]>([])
  const tables = ref<RestaurantTable[]>([])
  const orders = ref<OrderSummary[]>([])
  // Orders placed through the public storefront, written directly to Firestore
  // by the createOnlineOrder Cloud Function — kept separate from `orders`
  // (this device's own locally-owned sales) so an unpaid online order can
  // never be double-counted in local shift/sales totals.
  const onlineOrders = ref<OrderSummary[]>([])
  const appEvents = ref<AppEvent[]>([])
  const settings = ref<AppSettings>(defaultSettings)
  const activeShift = ref<ShiftSummary | null>(null)
  const shiftHistory = ref<ShiftSummary[]>([])
  const search = ref('')
  const selectedCategoryId = ref('all')
  const paymentMethod = ref<PaymentMethod>('cash')
  const orderType = ref<OrderType>('takeaway')
  const tableNumber = ref('')
  const selectedCustomerId = ref<string | null>(null)
  const tenderedCents = ref(0)
  const tenderedInput = ref('')
  const cart = ref<Record<string, number>>({})
  const lastCompletedOrder = ref<OrderSummary | null>(null)
  const lowStockAlert = ref<Product[]>([])
  const shiftError = ref('')
  const isReady = ref(false)

  function syncTenderedFromInput() {
    if (!tenderedInput.value) {
      tenderedCents.value = 0
      return
    }

    const [wholePartRaw, fractionPartRaw = ''] = tenderedInput.value.split('.')
    const wholePart = wholePartRaw.replace(/\D/g, '') || '0'
    const fractionPart = fractionPartRaw.replace(/\D/g, '').slice(0, 2)
    const paddedFraction = fractionPart.padEnd(2, '0')

    tenderedCents.value = Number(wholePart) * 100 + Number(paddedFraction)
  }

  function formatTenderedInput(cents: number) {
    const wholePart = Math.floor(cents / 100)
    const fractionPart = cents % 100

    if (fractionPart === 0) {
      return String(wholePart)
    }

    return `${wholePart}.${String(fractionPart).padStart(2, '0')}`
  }

  const filteredProducts = computed(() => {
    const needle = search.value.trim().toLowerCase()
    return products.value.filter((product) => {
      const inMode = product.businessModes.includes(settings.value.businessMode)
      const inCategory = selectedCategoryId.value === 'all' || product.categoryId === selectedCategoryId.value
      const matches =
        !needle ||
        product.name.toLowerCase().includes(needle) ||
        product.sku.toLowerCase().includes(needle) ||
        product.barcode.includes(needle)

      return inMode && inCategory && matches
    })
  })

  const cartLines = computed(() =>
    Object.entries(cart.value)
      .map(([productId, quantity]) => {
        const product = products.value.find((entry) => entry.id === productId)
        if (!product || quantity <= 0) {
          return null
        }

        const subtotalCents = Math.round(product.priceCents * quantity)
        return { product, quantity, subtotalCents }
      })
      .filter((line): line is { product: Product; quantity: number; subtotalCents: number } => Boolean(line)),
  )

  const subtotalCents = computed(() => cartLines.value.reduce((sum, line) => sum + line.subtotalCents, 0))
  const taxCents = computed(() =>
    cartLines.value.reduce((sum, line) => sum + calculateTax(line.subtotalCents, line.product.taxRate), 0),
  )
  const totalCents = computed(() => subtotalCents.value + taxCents.value)
  const changeCents = computed(() => Math.max(tenderedCents.value - totalCents.value, 0))
  const itemCount = computed(() => cartLines.value.reduce((sum, line) => sum + line.quantity, 0))
  const canCheckout = computed(
    () => Boolean(
      activeShift.value
      && cartLines.value.length > 0
      && (paymentMethod.value !== 'cash' || tenderedCents.value >= totalCents.value),
    ),
  )
  const pendingAppEvents = computed(() => appEvents.value.filter((event) => !event.sentAt))
  const selectedCustomer = computed(() =>
    customers.value.find((customer) => customer.id === selectedCustomerId.value) ?? null,
  )
  const selectedCustomerName = computed(() => selectedCustomer.value?.name ?? guestCustomerName)
  const customerOptions = computed(() => [
    { value: '', label: guestCustomerName },
    ...customers.value.map((customer) => ({ value: customer.id, label: customer.name })),
  ])

  const lowStockProducts = computed(() =>
    products.value.filter((p) => {
      if (p.stockQty === undefined) return false
      const threshold = p.lowStockThreshold ?? 5
      return p.stockQty <= threshold
    }),
  )

  const outOfStockProducts = computed(() =>
    products.value.filter((p) => p.stockQty !== undefined && p.stockQty === 0),
  )

  function resetTransientState() {
    search.value = ''
    selectedCategoryId.value = 'all'
    paymentMethod.value = 'cash'
    orderType.value = 'takeaway'
    tableNumber.value = ''
    selectedCustomerId.value = null
    tenderedCents.value = 0
    tenderedInput.value = ''
    cart.value = {}
    lastCompletedOrder.value = null
    lowStockAlert.value = []
    shiftError.value = ''
  }

  async function initialize(force = false) {
    if (isReady.value && !force) {
      return
    }

    if (force) {
      resetTransientState()
    }

    const [catalog, savedCustomers, savedTables, savedOrders, savedSettings, savedEvents, savedShift, savedOnlineOrders] = await Promise.all([
      repository.loadCatalog(),
      repository.loadCustomers(),
      repository.loadTables(),
      repository.loadOrders(),
      repository.loadSettings(),
      repository.loadAppEvents(),
      repository.loadActiveShift(),
      repository.loadOnlineOrders(),
    ])

    products.value = catalog.products
    categories.value = catalog.categories
    customers.value = savedCustomers
    tables.value = savedTables
    orders.value = savedOrders
    settings.value = savedSettings
    appEvents.value = savedEvents
    activeShift.value = savedShift
    onlineOrders.value = savedOnlineOrders
    isReady.value = true
  }

  async function refreshOnlineOrders() {
    onlineOrders.value = await repository.loadOnlineOrders()
  }

  function clearShiftError() {
    shiftError.value = ''
  }

  async function trackEvent(
    eventType: AppEvent['eventType'],
    payload: Record<string, unknown>,
    force = false,
  ) {
    if (!force && !settings.value.telemetryEnabled) {
      return
    }

    const event = await repository.trackAppEvent({ eventType, payload })
    appEvents.value = [event, ...appEvents.value]
  }

  function addProduct(productId: string) {
    cart.value[productId] = (cart.value[productId] ?? 0) + 1
    const product = products.value.find((entry) => entry.id === productId)
    void trackEvent('product_added', {
      productId,
      businessMode: settings.value.businessMode,
      categoryId: product?.categoryId ?? null,
      cartSize: Object.values(cart.value).reduce((sum, quantity) => sum + quantity, 0),
    })
  }

  function increment(productId: string) {
    addProduct(productId)
  }

  function decrement(productId: string) {
    const next = (cart.value[productId] ?? 0) - 1
    if (next <= 0) {
      delete cart.value[productId]
      return
    }

    cart.value[productId] = next
  }

  function removeLine(productId: string) {
    delete cart.value[productId]
  }

  function clearCart() {
    cart.value = {}
    paymentMethod.value = 'cash'
    selectedCustomerId.value = null
    tenderedInput.value = ''
    tenderedCents.value = 0
    void trackEvent('cart_cleared', {
      businessMode: settings.value.businessMode,
    })
  }

  function appendTenderDigit(digit: number) {
    if (paymentMethod.value !== 'cash') {
      return
    }

    if (digit < 0 || digit > 9) {
      return
    }

    if (tenderedInput.value.includes('.')) {
      const [, fractionPart = ''] = tenderedInput.value.split('.')
      if (fractionPart.length >= 2) {
        return
      }

      tenderedInput.value = `${tenderedInput.value}${digit}`
      syncTenderedFromInput()
      return
    }

    tenderedInput.value = tenderedInput.value === '' || tenderedInput.value === '0'
      ? String(digit)
      : `${tenderedInput.value}${digit}`
    syncTenderedFromInput()
  }

  function appendTenderDecimal() {
    if (paymentMethod.value !== 'cash' || tenderedInput.value.includes('.')) {
      return
    }

    tenderedInput.value = tenderedInput.value === '' ? '0.' : `${tenderedInput.value}.`
    syncTenderedFromInput()
  }

  function setTendered(cents: number) {
    if (paymentMethod.value !== 'cash') return
    tenderedInput.value = formatTenderedInput(cents)
    tenderedCents.value = cents
  }

  function clearTendered() {
    tenderedInput.value = ''
    tenderedCents.value = 0
  }

  function backspaceTendered() {
    if (paymentMethod.value !== 'cash' || !tenderedInput.value) {
      clearTendered()
      return
    }

    tenderedInput.value = tenderedInput.value.slice(0, -1)
    syncTenderedFromInput()
  }

  function setSearch(value: string) {
    search.value = value
    if (value.trim().length >= 2) {
      void trackEvent('cart_search_used', {
        queryLength: value.trim().length,
        businessMode: settings.value.businessMode,
      })
    }
  }

  function setCategory(value: string) {
    selectedCategoryId.value = value
  }

  function setPaymentMethod(value: PaymentMethod) {
    paymentMethod.value = value
    tenderedInput.value = value === 'cash' ? '' : formatTenderedInput(totalCents.value)
    tenderedCents.value = value === 'cash' ? 0 : totalCents.value
    void trackEvent('payment_method_selected', {
      paymentMethod: value,
      totalCents: totalCents.value,
      businessMode: settings.value.businessMode,
    })
  }

  function setOrderType(value: OrderType) {
    orderType.value = value
  }

  function setTableNumber(value: string) {
    tableNumber.value = value
  }

  function setSelectedCustomer(value: string | null) {
    selectedCustomerId.value = value
  }

  async function notePaymentSheetOpened() {
    await trackEvent('payment_sheet_opened', {
      totalCents: totalCents.value,
      itemCount: itemCount.value,
      businessMode: settings.value.businessMode,
      customerName: selectedCustomerName.value,
    })
  }

  async function updateSettings(next: AppSettings) {
    settings.value = next
    selectedCategoryId.value = 'all'
    await repository.saveSettings(next)
    appEvents.value = await repository.loadAppEvents()
    const catalog = await repository.loadCatalog()
    products.value = catalog.products
    categories.value = catalog.categories
    await trackEvent(
      'settings_saved',
      {
        businessMode: next.businessMode,
        syncMode: next.syncMode,
        telemetryEnabled: next.telemetryEnabled,
      },
      true,
    )
  }

  async function createProduct(input: CreateProductInput) {
    const product = await repository.saveProduct(input)
    products.value = [product, ...products.value]
    return product
  }

  async function createCustomer(input: CreateCustomerInput) {
    const customer = await repository.saveCustomer(input)
    customers.value = [customer, ...customers.value]
    selectedCustomerId.value = customer.id
    return customer
  }

  async function editCustomer(customer: Customer) {
    const nextCustomer = await repository.updateCustomer(customer)
    const index = customers.value.findIndex((entry) => entry.id === nextCustomer.id)
    if (index !== -1) {
      customers.value[index] = nextCustomer
    }
    orders.value = orders.value.map((order) =>
      order.customerId === nextCustomer.id
        ? { ...order, customerName: nextCustomer.name }
        : order,
    )
    return nextCustomer
  }

  async function removeCustomer(id: string) {
    await repository.deleteCustomer(id)
    customers.value = customers.value.filter((customer) => customer.id !== id)
    if (selectedCustomerId.value === id) {
      selectedCustomerId.value = null
    }
  }

  async function createTable(input: CreateTableInput) {
    const table = await repository.saveTable(input)
    tables.value = [...tables.value, table]
    return table
  }

  async function editTable(table: RestaurantTable) {
    const nextTable = await repository.updateTable(table)
    const index = tables.value.findIndex((entry) => entry.id === nextTable.id)
    if (index !== -1) {
      tables.value[index] = nextTable
    }
    return nextTable
  }

  async function removeTable(id: string) {
    await repository.deleteTable(id)
    tables.value = tables.value.filter((table) => table.id !== id)
  }

  async function editProduct(product: Product) {
    await repository.updateProduct(product)
    const index = products.value.findIndex((p) => p.id === product.id)
    if (index !== -1) {
      products.value[index] = product
    }
  }

  async function removeProduct(id: string) {
    await repository.deleteProduct(id)
    products.value = products.value.filter((p) => p.id !== id)
    delete cart.value[id]
  }

  async function createCategory(name: string) {
    const category = await repository.saveCategory({ name } as CreateCategoryInput)
    categories.value = [...categories.value, category]
    return category
  }

  async function editCategory(category: Category) {
    await repository.updateCategory(category)
    const index = categories.value.findIndex((c) => c.id === category.id)
    if (index !== -1) {
      categories.value[index] = category
    }
  }

  async function removeCategory(id: string) {
    await repository.deleteCategory(id)
    if (selectedCategoryId.value === id) {
      selectedCategoryId.value = 'all'
    }
    categories.value = categories.value.filter((c) => c.id !== id)
    const fallbackId = categories.value[0]?.id ?? 'groceries'
    products.value = products.value.map((p) =>
      p.categoryId === id ? { ...p, categoryId: fallbackId } : p,
    )
  }

  async function completeOrder() {
    if (!canCheckout.value) {
      if (!activeShift.value) {
        shiftError.value = 'Open a shift before charging orders on this register.'
      }
      return
    }

    const order = await repository.saveOrder({
      businessMode: settings.value.businessMode,
      customerId: selectedCustomer.value?.id ?? null,
      customerName: selectedCustomerName.value,
      orderType: orderType.value,
      tableNumber: settings.value.businessMode === 'restaurant' ? tableNumber.value.trim() || null : null,
      paymentMethod: paymentMethod.value,
      tenderedCents: paymentMethod.value === 'cash' ? tenderedCents.value : totalCents.value,
      items: cartLines.value.map((line) => ({
        productId: line.product.id,
        name: line.product.name,
        quantity: line.quantity,
        unitPriceCents: line.product.priceCents,
        lineTotalCents: line.subtotalCents,
      })),
    })

    orders.value = [order, ...orders.value]
    lastCompletedOrder.value = order

    // saveOrder() updates the shift's cash/total-sales tallies in the repository layer,
    // but doesn't return the shift itself — re-pull it so the reactive activeShift here
    // (and anything bound to it, like the shift panel) reflects the new totals immediately.
    if (activeShift.value) {
      await refreshActiveShift()
    }

    await trackEvent('order_completed', {
      orderId: order.id,
      paymentMethod: order.paymentMethod,
      totalCents: order.totalCents,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      businessMode: order.businessMode,
    })

    const newlyLowStock: Product[] = []
    for (const line of cartLines.value) {
      const p = line.product
      if (p.stockQty === undefined) continue

      const threshold = p.lowStockThreshold ?? 5
      const wasAboveThreshold = p.stockQty > threshold
      const updated = await repository.adjustInventory({
        productId: p.id,
        quantityDelta: -line.quantity,
        adjustmentType: 'sale',
        orderId: order.id,
        reason: `order:${order.ticketNumber}`,
      })
      if (!updated) continue

      const idx = products.value.findIndex((x) => x.id === p.id)
      if (idx !== -1) products.value[idx] = updated

      if (wasAboveThreshold && (updated.stockQty ?? 0) <= threshold) {
        newlyLowStock.push(updated)
      }
    }

    if (newlyLowStock.length > 0) {
      lowStockAlert.value = newlyLowStock
      await trackEvent('low_stock_alert', {
        products: newlyLowStock.map((p) => ({ id: p.id, name: p.name, stockQty: p.stockQty })),
      })
    }

    cart.value = {}
    paymentMethod.value = 'cash'
    selectedCustomerId.value = null
    tenderedInput.value = ''
    tenderedCents.value = 0
    tableNumber.value = ''
    shiftError.value = ''
  }

  async function updateOrderStatus(orderId: string, status: OrderStatus) {
    const updated = await repository.updateOrderStatus(orderId, status)
    const index = orders.value.findIndex((order) => order.id === orderId)
    if (index !== -1) {
      orders.value[index] = updated
    }
    return updated
  }

  // Settles payment on an online order a customer already placed through the
  // storefront — distinct from completeOrder(), which creates a brand-new
  // (already-paid) order from the live cart.
  async function settleOnlineOrderPayment(
    orderId: string,
    payment: { paymentMethod: PaymentMethod; tenderedCents: number; changeCents: number },
  ) {
    const updated = await repository.settleOrderPayment(orderId, payment)
    const index = onlineOrders.value.findIndex((order) => order.id === orderId)
    if (index !== -1) {
      onlineOrders.value[index] = updated
    }
    return updated
  }

  function clearLowStockAlert() {
    lowStockAlert.value = []
  }

  async function restockProduct(productId: string, addQty: number) {
    const updated = await repository.adjustInventory({
      productId,
      quantityDelta: addQty,
      adjustmentType: 'restock',
      reason: 'restock',
    })
    if (!updated) return

    const idx = products.value.findIndex((p) => p.id === productId)
    if (idx !== -1) {
      products.value[idx] = updated
    }
  }

  async function refreshActiveShift() {
    activeShift.value = await repository.loadActiveShift()
    return activeShift.value
  }

  async function openShift(openingCashCents: number, userId?: string | null) {
    shiftError.value = ''
    activeShift.value = await repository.openShift({ openingCashCents, userId })
    return activeShift.value
  }

  async function addCashMovement(
    movementType: CashMovementType,
    amountCents: number,
    reason?: string,
    userId?: string | null,
  ) {
    shiftError.value = ''
    activeShift.value = await repository.addCashMovement({ movementType, amountCents, reason, userId })
    return activeShift.value
  }

  async function closeShift(countedCashCents: number, userId?: string | null) {
    shiftError.value = ''
    const closedShift = await repository.closeShift({ countedCashCents, userId })
    activeShift.value = null
    shiftHistory.value = [closedShift, ...shiftHistory.value]
    return closedShift
  }

  async function refreshShiftHistory() {
    shiftHistory.value = await repository.loadShiftHistory()
    return shiftHistory.value
  }

  return {
    isReady,
    products,
    categories,
    customers,
    tables,
    orders,
    onlineOrders,
    appEvents,
    pendingAppEvents,
    settings,
    activeShift,
    shiftHistory,
    search,
    selectedCategoryId,
    paymentMethod,
    orderType,
    tableNumber,
    selectedCustomerId,
    selectedCustomer,
    selectedCustomerName,
    customerOptions,
    tenderedCents,
    tenderedInput,
    lastCompletedOrder,
    lowStockAlert,
    shiftError,
    filteredProducts,
    cartLines,
    subtotalCents,
    taxCents,
    totalCents,
    changeCents,
    itemCount,
    canCheckout,
    lowStockProducts,
    outOfStockProducts,
    initialize,
    clearShiftError,
    trackEvent,
    addProduct,
    increment,
    decrement,
    removeLine,
    clearCart,
    appendTenderDigit,
    appendTenderDecimal,
    setTendered,
    clearTendered,
    backspaceTendered,
    setSearch,
    setCategory,
    setPaymentMethod,
    setOrderType,
    setTableNumber,
    setSelectedCustomer,
    notePaymentSheetOpened,
    updateSettings,
    completeOrder,
    updateOrderStatus,
    refreshOnlineOrders,
    settleOnlineOrderPayment,
    clearLowStockAlert,
    restockProduct,
    refreshActiveShift,
    refreshShiftHistory,
    openShift,
    addCashMovement,
    closeShift,
    createProduct,
    editProduct,
    removeProduct,
    createCustomer,
    editCustomer,
    removeCustomer,
    createTable,
    editTable,
    removeTable,
    createCategory,
    editCategory,
    removeCategory,
  }
})
