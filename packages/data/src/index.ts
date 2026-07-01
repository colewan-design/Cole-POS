import {
  defaultRoles,
  defaultSettings,
  demoCategories,
  demoProducts,
  slugTicket,
  type AppEvent,
  type AppEventType,
  type AppSettings,
  type AuthSession,
  type CashMovementSummary,
  type CashMovementType,
  type CatalogSnapshot,
  type Category,
  type CreateCategoryInput,
  type CreateOrderInput,
  type CreateProductInput,
  type OrderSummary,
  type Product,
  type RoleDefinition,
  type ShiftSummary,
  type UserAccount,
} from '@pos/shared/index'
import {
  createSupabaseSync,
  type SupabaseSyncConfig,
  type SupabaseSyncSession,
  type SupabaseSync,
} from './supabase-sync'

export type { SupabaseSyncConfig }

export interface DataStore {
  read<T>(key: string, fallback: T): Promise<T>
  write<T>(key: string, value: T): Promise<void>
}

export interface PosRepository {
  loadCatalog(): Promise<CatalogSnapshot>
  loadOrders(): Promise<OrderSummary[]>
  loadActiveShift(): Promise<ShiftSummary | null>
  saveOrder(input: CreateOrderInput): Promise<OrderSummary>
  openShift(input: {
    openingCashCents: number
    userId?: string | null
  }): Promise<ShiftSummary>
  addCashMovement(input: {
    movementType: CashMovementType
    amountCents: number
    reason?: string
    userId?: string | null
  }): Promise<ShiftSummary>
  closeShift(input: {
    countedCashCents: number
    userId?: string | null
  }): Promise<ShiftSummary>
  adjustInventory(input: {
    productId: string
    quantityDelta: number
    adjustmentType: 'sale' | 'restock' | 'manual_correction'
    reason?: string
    orderId?: string
  }): Promise<Product | null>
  loadSettings(): Promise<AppSettings>
  saveSettings(settings: AppSettings): Promise<void>
  loadUsers(): Promise<UserAccount[]>
  saveUsers(users: UserAccount[]): Promise<void>
  loginUser(username: string, password: string): Promise<{ user: UserAccount; session: AuthSession } | null>
  registerUser(input: {
    fullName: string
    username: string
    password: string
  }): Promise<{ user: UserAccount; session: AuthSession } | null>
  updateUserRole(userId: string, roleId: string): Promise<void>
  loadRoles(): Promise<RoleDefinition[]>
  saveRoles(roles: RoleDefinition[]): Promise<void>
  loadSession(): Promise<AuthSession | null>
  saveSession(session: AuthSession | null): Promise<void>
  loadAppEvents(): Promise<AppEvent[]>
  trackAppEvent(input: {
    eventType: AppEventType
    payload: Record<string, unknown>
  }): Promise<AppEvent>
  saveProduct(input: CreateProductInput): Promise<Product>
  updateProduct(product: Product): Promise<Product>
  deleteProduct(id: string): Promise<void>
  saveCategory(input: CreateCategoryInput): Promise<Category>
  updateCategory(category: Category): Promise<Category>
  deleteCategory(id: string): Promise<void>
}

export interface BrowserPosRepositoryOptions {
  store?: DataStore
  sync?: Partial<SyncConfig> | Partial<SupabaseSyncConfig>
}

interface SyncConfig {
  apiBaseUrl: string
  organizationSlug: string
  storeCode: string
  pairingCode: string
  deviceName: string
  platform: string
  appVersion: string
}

interface SyncSession {
  token: string
  deviceId: string
  storeId: string
  storeName: string
  organizationId: string
  organizationSlug: string
}

interface SyncOutboxEvent {
  id: string
  entityType: 'order' | 'category' | 'product' | 'inventory_adjustment'
  entityId: string
  operation: 'upsert'
  occurredAt: string
  payload: Record<string, unknown>
}

interface BackendCategory {
  id: string
  name: string
  sort_order?: number
}

interface BackendProduct {
  id: string
  category_id: string | null
  sku: string | null
  barcode: string | null
  name: string
  price_cents: number
  tax_rate: string | number
  product_type?: string
  track_inventory?: boolean
  is_active?: boolean
  deleted_at?: string | null
}

interface BackendInventoryLevel {
  product_id: string
  qty_on_hand: string | number
  reorder_level?: string | number | null
}

interface BackendProductOverride {
  product_id: string
  price_cents?: number | null
  is_available?: boolean | null
  display_name?: string | null
}

interface BackendShiftSummary {
  id: string
  openedByUserId?: string | null
  closedByUserId?: string | null
  openingCashCents: number
  closingCashCents?: number | null
  cashSalesCents: number
  payInsCents: number
  payOutsCents: number
  expectedCashCents: number
  varianceCashCents?: number | null
  openedAt: string
  closedAt?: string | null
  movements: CashMovementSummary[]
}

const storageKeys = {
  orders: 'pos.orders',
  settings: 'pos.settings',
  appEvents: 'pos.app-events',
  deviceId: 'pos.device-id',
  products: 'pos.products',
  categories: 'pos.categories',
  users: 'pos.users',
  roles: 'pos.roles',
  session: 'pos.session',
  activeShift: 'pos.shift.active',
  syncSession: 'pos.sync.session',
  syncCursor: 'pos.sync.cursor',
  syncOutbox: 'pos.sync.outbox',
} as const

class BrowserLocalStore implements DataStore {
  async read<T>(key: string, fallback: T): Promise<T> {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  }

  async write<T>(key: string, value: T): Promise<void> {
    window.localStorage.setItem(key, JSON.stringify(value))
  }
}

const indexedDbConfig = {
  databaseName: 'pos-offline-store',
  databaseVersion: 1,
  storeName: 'kv',
  migrationKey: 'pos.meta.local-storage-migrated',
} as const

interface KeyValueRecord<T = unknown> {
  key: string
  value: T
}

class BrowserIndexedDbStore implements DataStore {
  private readonly fallbackStore = new BrowserLocalStore()
  private readonly databasePromise: Promise<IDBDatabase> | null
  private migrationPromise: Promise<void> | null = null
  private failed = false

  constructor() {
    this.databasePromise = typeof window !== 'undefined' && 'indexedDB' in window
      ? this.openDatabase()
      : null
  }

  async read<T>(key: string, fallback: T): Promise<T> {
    try {
      await this.ensureReady()
      const value = await this.getValue<T>(key)
      return value ?? fallback
    } catch {
      this.failed = true
      return this.fallbackStore.read(key, fallback)
    }
  }

  async write<T>(key: string, value: T): Promise<void> {
    try {
      await this.ensureReady()
      await this.putValue(key, value)
    } catch {
      this.failed = true
      await this.fallbackStore.write(key, value)
    }
  }

  private async ensureReady() {
    if (this.failed || !this.databasePromise) {
      throw new Error('IndexedDB is unavailable.')
    }

    if (!this.migrationPromise) {
      this.migrationPromise = this.migrateFromLocalStorage()
    }

    await this.migrationPromise
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(indexedDbConfig.databaseName, indexedDbConfig.databaseVersion)

      request.onupgradeneeded = () => {
        const database = request.result
        if (!database.objectStoreNames.contains(indexedDbConfig.storeName)) {
          database.createObjectStore(indexedDbConfig.storeName, { keyPath: 'key' })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB.'))
    })
  }

  private createTransaction(mode: IDBTransactionMode) {
    if (!this.databasePromise) {
      throw new Error('IndexedDB is unavailable.')
    }

    return this.databasePromise.then((database) => database.transaction(indexedDbConfig.storeName, mode))
  }

  private async getValue<T>(key: string): Promise<T | undefined> {
    const transaction = await this.createTransaction('readonly')
    const store = transaction.objectStore(indexedDbConfig.storeName)

    return new Promise<T | undefined>((resolve, reject) => {
      const request = store.get(key)

      request.onsuccess = () => {
        const record = request.result as KeyValueRecord<T> | undefined
        resolve(record?.value)
      }
      request.onerror = () => reject(request.error ?? new Error(`Failed to read key "${key}".`))
    })
  }

  private async putValue<T>(key: string, value: T): Promise<void> {
    const transaction = await this.createTransaction('readwrite')
    const store = transaction.objectStore(indexedDbConfig.storeName)

    await new Promise<void>((resolve, reject) => {
      const request = store.put({ key, value } satisfies KeyValueRecord<T>)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error ?? new Error(`Failed to write key "${key}".`))
    })

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error(`Transaction failed for "${key}".`))
      transaction.onabort = () => reject(transaction.error ?? new Error(`Transaction aborted for "${key}".`))
    })
  }

  private async migrateFromLocalStorage() {
    const alreadyMigrated = await this.getValue<boolean>(indexedDbConfig.migrationKey)
    if (alreadyMigrated) {
      return
    }

    for (const key of Object.values(storageKeys)) {
      const existingValue = await this.getValue<unknown>(key)
      if (existingValue !== undefined) {
        continue
      }

      const raw = window.localStorage.getItem(key)
      if (raw === null) {
        continue
      }

      try {
        await this.putValue(key, JSON.parse(raw) as unknown)
      } catch {
        // Skip malformed legacy entries rather than blocking startup.
      }
    }

    await this.putValue(indexedDbConfig.migrationKey, true)
  }
}

function normalizeSyncConfig(input?: Partial<SyncConfig> | Partial<SupabaseSyncConfig>): SyncConfig | null {
  const cfg = input as Partial<SyncConfig>
  if (!cfg?.apiBaseUrl || !cfg.organizationSlug || !cfg.storeCode || !cfg.pairingCode) {
    return null
  }

  return {
    apiBaseUrl: cfg.apiBaseUrl.replace(/\/+$/, ''),
    organizationSlug: cfg.organizationSlug,
    storeCode: cfg.storeCode,
    pairingCode: cfg.pairingCode,
    deviceName: cfg.deviceName?.trim() || defaultDeviceName(),
    platform: cfg.platform?.trim() || 'web',
    appVersion: cfg.appVersion?.trim() || '0.1.0',
  }
}

function normalizeSupabaseSyncConfig(
  input?: Partial<SyncConfig> | Partial<SupabaseSyncConfig>,
): SupabaseSyncConfig | null {
  const cfg = input as Partial<SupabaseSyncConfig>
  if (!cfg?.supabaseUrl || !cfg.supabaseAnonKey || !cfg.organizationSlug || !cfg.storeCode) {
    return null
  }

  return {
    supabaseUrl: cfg.supabaseUrl,
    supabaseAnonKey: cfg.supabaseAnonKey,
    organizationSlug: cfg.organizationSlug,
    storeCode: cfg.storeCode,
    deviceName: cfg.deviceName?.trim() || defaultDeviceName(),
    platform: cfg.platform?.trim() || 'web',
    appVersion: cfg.appVersion?.trim() || '0.1.0',
  }
}

async function hashPassword(value: string): Promise<string> {
  const normalized = value.trim()

  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoded = new TextEncoder().encode(normalized)
    const digest = await window.crypto.subtle.digest('SHA-256', encoded)
    return Array.from(new Uint8Array(digest))
      .map((chunk) => chunk.toString(16).padStart(2, '0'))
      .join('')
  }

  return normalized
}

function defaultDeviceName() {
  if (typeof window === 'undefined') {
    return 'Web Register'
  }

  const host = window.location.hostname || 'localhost'
  return `Web Register (${host})`
}

function generateSku(name: string): string {
  const prefix = name.slice(0, 3).toUpperCase().padEnd(3, 'X').replace(/[^A-Z]/g, 'X')
  return `${prefix}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`
}

function toBusinessModes(categoryId: string): Product['businessModes'] {
  if (['groceries', 'produce', 'dairy', 'snacks'].includes(categoryId)) {
    return ['grocery']
  }

  if (['starters', 'mains', 'desserts', 'beverages'].includes(categoryId)) {
    return ['restaurant']
  }

  return ['coffee-shop']
}

function toProductKind(kind?: string): Product['kind'] {
  return kind === 'weighted' ? 'weighted' : 'standard'
}

function mapBackendCategory(category: BackendCategory): Category {
  return {
    id: category.id,
    name: category.name,
  }
}

function mapBackendProduct(
  product: BackendProduct,
  inventoryLevels: Map<string, BackendInventoryLevel>,
  overrides: Map<string, BackendProductOverride>,
): Product {
  const inventory = inventoryLevels.get(product.id)
  const override = overrides.get(product.id)
  const categoryId = product.category_id ?? 'uncategorized'
  const stockQty = inventory ? Number(inventory.qty_on_hand) : undefined
  const lowStockThreshold = inventory?.reorder_level != null ? Number(inventory.reorder_level) : undefined
  const isAvailable = override?.is_available ?? product.is_active ?? true

  return {
    id: product.id,
    categoryId,
    sku: product.sku ?? generateSku(product.name),
    barcode: product.barcode ?? '',
    name: override?.display_name || product.name,
    priceCents: override?.price_cents ?? product.price_cents,
    taxRate: Number(product.tax_rate),
    kind: toProductKind(product.product_type),
    businessModes: toBusinessModes(categoryId),
    outOfStock: isAvailable ? stockQty === 0 : true,
    stockQty,
    lowStockThreshold,
  }
}

function mapBackendShift(shift: BackendShiftSummary): ShiftSummary {
  return {
    id: shift.id,
    openedByUserId: shift.openedByUserId ?? null,
    closedByUserId: shift.closedByUserId ?? null,
    openingCashCents: shift.openingCashCents,
    closingCashCents: shift.closingCashCents ?? null,
    cashSalesCents: shift.cashSalesCents,
    payInsCents: shift.payInsCents,
    payOutsCents: shift.payOutsCents,
    expectedCashCents: shift.expectedCashCents,
    varianceCashCents: shift.varianceCashCents ?? null,
    openedAt: shift.openedAt,
    closedAt: shift.closedAt ?? null,
    movements: shift.movements ?? [],
  }
}

function mergeDemoCatalog(storedProducts: Product[], storedCategories: Category[]) {
  const demoProductMap = new Map(demoProducts.map((p) => [p.id, p]))

  let stockPatched = false
  let imagePatched = false
  const patchedProducts = storedProducts.map((p) => {
    const demo = demoProductMap.get(p.id)
    if (!demo) {
      return p
    }

    let patched = p
    if (p.stockQty === undefined && demo.stockQty !== undefined) {
      stockPatched = true
      patched = { ...patched, stockQty: demo.stockQty, lowStockThreshold: demo.lowStockThreshold }
    }
    if (!patched.imageUrl && demo.imageUrl) {
      imagePatched = true
      patched = { ...patched, imageUrl: demo.imageUrl, imageAttributionUrl: demo.imageAttributionUrl }
    }
    return patched
  })

  const storedProductIds = new Set(storedProducts.map((product) => product.id))
  const newDemoProducts = demoProducts.filter((product) => !storedProductIds.has(product.id))
  const productsChanged = newDemoProducts.length > 0 || stockPatched || imagePatched
  const mergedProducts = productsChanged
    ? [...patchedProducts, ...newDemoProducts]
    : storedProducts

  const storedCategoryIds = new Set(storedCategories.map((category) => category.id))
  const newDemoCategories = demoCategories.filter((category) => !storedCategoryIds.has(category.id))
  const mergedCategories = newDemoCategories.length > 0
    ? [...storedCategories, ...newDemoCategories]
    : storedCategories

  return {
    products: mergedProducts,
    categories: mergedCategories,
    addedDemoProducts: productsChanged,
    addedDemoCategories: newDemoCategories.length > 0,
  }
}

export function createBrowserPosRepository(options: BrowserPosRepositoryOptions = {}): PosRepository {
  const store = options.store ?? new BrowserIndexedDbStore()
  const supabaseConfig = normalizeSupabaseSyncConfig(options.sync)
  const syncConfig = supabaseConfig ? null : normalizeSyncConfig(options.sync)
  const supabaseSync: SupabaseSync | null = supabaseConfig ? createSupabaseSync(supabaseConfig) : null
  const appVersion = supabaseConfig?.appVersion ?? syncConfig?.appVersion ?? '0.1.0'

  async function isOnlineSyncEnabled() {
    if (!syncConfig && !supabaseSync) {
      return false
    }

    const settings = await store.read<Partial<AppSettings>>(storageKeys.settings, defaultSettings)
    return settings.syncMode === 'online-sync'
  }

  async function readSupabaseSession(): Promise<SupabaseSyncSession | null> {
    return store.read<SupabaseSyncSession | null>(storageKeys.syncSession, null)
  }

  async function writeSupabaseSession(session: SupabaseSyncSession | null): Promise<void> {
    await store.write(storageKeys.syncSession, session)
  }

  async function getSupabaseSession(): Promise<SupabaseSyncSession | null> {
    if (!supabaseSync) return null
    const cached = await readSupabaseSession()
    const live = await supabaseSync.getCurrentSession(cached)
    if (live && (!cached || live.organizationId !== cached.organizationId)) {
      await writeSupabaseSession(live)
    }
    return live
  }

  async function getDeviceId() {
    const existing = await store.read<string | null>(storageKeys.deviceId, null)
    if (existing) {
      return existing
    }

    const created = crypto.randomUUID()
    await store.write(storageKeys.deviceId, created)
    return created
  }

  async function readSyncSession() {
    return store.read<SyncSession | null>(storageKeys.syncSession, null)
  }

  async function writeSyncSession(session: SyncSession | null) {
    await store.write(storageKeys.syncSession, session)
  }

  async function readOutbox() {
    return store.read<SyncOutboxEvent[]>(storageKeys.syncOutbox, [])
  }

  async function writeOutbox(events: SyncOutboxEvent[]) {
    await store.write(storageKeys.syncOutbox, events)
  }

  async function appendOutboxEvent(event: SyncOutboxEvent) {
    const events = await readOutbox()
    await writeOutbox([...events, event])
  }

  async function readSyncCursor() {
    return store.read<string | null>(storageKeys.syncCursor, null)
  }

  async function writeSyncCursor(cursor: string | null) {
    await store.write(storageKeys.syncCursor, cursor)
  }

  async function readActiveShift() {
    return store.read<ShiftSummary | null>(storageKeys.activeShift, null)
  }

  async function writeActiveShift(shift: ShiftSummary | null) {
    await store.write(storageKeys.activeShift, shift)
  }

  async function refreshRemoteShift() {
    if (supabaseSync) {
      const session = await getSupabaseSession()
      if (!session) return null
      const shift = await supabaseSync.getCurrentShift(session.storeId)
      await writeActiveShift(shift)
      return shift
    }
    const response = await backendFetch<{ shift: BackendShiftSummary | null }>('/api/shifts/current')
    const shift = response.shift ? mapBackendShift(response.shift) : null
    await writeActiveShift(shift)
    return shift
  }

  async function updateCachedShift(
    updater: (current: ShiftSummary | null) => ShiftSummary | null,
  ) {
    const current = await readActiveShift()
    const next = updater(current)
    await writeActiveShift(next)
    return next
  }

  async function backendFetch<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
    if (!syncConfig) {
      throw new Error('Sync configuration is missing.')
    }

    const onlineSyncEnabled = await isOnlineSyncEnabled()
    if (!onlineSyncEnabled) {
      throw new Error('Online sync is disabled.')
    }

    const session = await ensureRemoteSession()
    const response = await fetch(`${syncConfig.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        'Accept': 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
        ...(init.headers ?? {}),
      },
    })

    if (response.status === 401 && retry) {
      await writeSyncSession(null)
      return backendFetch<T>(path, init, false)
    }

    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || `Request failed: ${response.status}`)
    }

    return response.json() as Promise<T>
  }

  async function ensureRemoteSession(): Promise<SyncSession | null> {
    if (!syncConfig) {
      return null
    }

    let session = await readSyncSession()
    if (session) {
      return session
    }

    const payload = {
      organizationSlug: syncConfig.organizationSlug,
      storeCode: syncConfig.storeCode,
      pairingCode: syncConfig.pairingCode,
      deviceName: syncConfig.deviceName,
      platform: syncConfig.platform,
      appVersion: syncConfig.appVersion,
    }

    const response = await fetch(`${syncConfig.apiBaseUrl}/api/device-sessions`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || `Device pairing failed: ${response.status}`)
    }

    const body = await response.json() as {
      token: string
      device: { id: string }
      store: { id: string; name: string }
      organization: { id: string; slug: string }
    }

    session = {
      token: body.token,
      deviceId: body.device.id,
      storeId: body.store.id,
      storeName: body.store.name,
      organizationId: body.organization.id,
      organizationSlug: body.organization.slug,
    }

    await writeSyncSession(session)
    await store.write(storageKeys.deviceId, body.device.id)
    return session
  }

  async function syncCatalogFromBootstrap() {
    if (supabaseSync) {
      const session = await getSupabaseSession()
      if (!session) throw new Error('No Supabase session for bootstrap.')
      const result = await supabaseSync.bootstrapCatalog(session.organizationId)
      await store.write(storageKeys.categories, result.categories)
      await store.write(storageKeys.products, result.products)
      await writeSyncCursor(result.cursor)
      return result
    }

    const response = await backendFetch<{
      catalog: {
        categories: BackendCategory[]
        products: BackendProduct[]
        overrides: BackendProductOverride[]
        inventoryLevels: BackendInventoryLevel[]
      }
      cursor: string
    }>('/api/sync/bootstrap')

    const overrides = new Map(response.catalog.overrides.map((entry) => [entry.product_id, entry]))
    const inventoryLevels = new Map(response.catalog.inventoryLevels.map((entry) => [entry.product_id, entry]))
    const categories = response.catalog.categories.map(mapBackendCategory)
    const products = response.catalog.products.map((entry) => mapBackendProduct(entry, inventoryLevels, overrides))

    await store.write(storageKeys.categories, categories)
    await store.write(storageKeys.products, products)
    await writeSyncCursor(response.cursor)

    return { categories, products }
  }

  async function pullCatalogChanges() {
    if (supabaseSync) {
      const session = await getSupabaseSession()
      if (!session) return
      const cursor = await readSyncCursor()
      if (!cursor) return
      const result = await supabaseSync.pullChanges(session.organizationId, cursor)

      const currentCategories = await store.read<Category[]>(storageKeys.categories, [])
      const currentProducts = await store.read<Product[]>(storageKeys.products, [])
      const nextCategories = new Map(currentCategories.map((entry) => [entry.id, entry]))
      const nextProducts = new Map(currentProducts.map((entry) => [entry.id, entry]))

      for (const cat of result.categories) nextCategories.set(cat.id, cat)
      for (const prod of result.products) nextProducts.set(prod.id, prod)

      await store.write(storageKeys.categories, Array.from(nextCategories.values()))
      await store.write(storageKeys.products, Array.from(nextProducts.values()))
      await writeSyncCursor(result.cursor)
      return
    }

    const cursor = await readSyncCursor()
    const response = await backendFetch<{
      cursor: string
      changes: {
        categories: BackendCategory[]
        products: BackendProduct[]
        overrides: BackendProductOverride[]
        inventoryLevels: BackendInventoryLevel[]
      }
    }>(`/api/sync/pull${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`)

    const currentCategories = await store.read<Category[]>(storageKeys.categories, [])
    const currentProducts = await store.read<Product[]>(storageKeys.products, [])
    const nextCategories = new Map(currentCategories.map((entry) => [entry.id, entry]))
    const nextProducts = new Map(currentProducts.map((entry) => [entry.id, entry]))

    for (const category of response.changes.categories) {
      nextCategories.set(category.id, mapBackendCategory(category))
    }

    const currentInventory = new Map<string, BackendInventoryLevel>()
    for (const product of currentProducts) {
      if (typeof product.stockQty === 'number') {
        currentInventory.set(product.id, {
          product_id: product.id,
          qty_on_hand: product.stockQty,
          reorder_level: product.lowStockThreshold ?? null,
        })
      }
    }

    for (const inventory of response.changes.inventoryLevels) {
      currentInventory.set(inventory.product_id, inventory)
    }

    const currentOverrides = new Map<string, BackendProductOverride>()
    for (const override of response.changes.overrides) {
      currentOverrides.set(override.product_id, override)
    }

    for (const product of response.changes.products) {
      nextProducts.set(product.id, mapBackendProduct(product, currentInventory, currentOverrides))
    }

    await store.write(storageKeys.categories, Array.from(nextCategories.values()))
    await store.write(storageKeys.products, Array.from(nextProducts.values()))
    await writeSyncCursor(response.cursor)
  }

  async function flushOutbox() {
    if (!await isOnlineSyncEnabled()) {
      return
    }

    const events = await readOutbox()
    if (events.length === 0) {
      return
    }

    if (supabaseSync) {
      const session = await getSupabaseSession()
      if (!session) return
      const appliedIds = await supabaseSync.pushEvents(events, session)
      if (appliedIds.size > 0) {
        await writeOutbox(events.filter((event) => !appliedIds.has(event.id)))
      }
      await pullCatalogChanges()
      return
    }

    const session = await ensureRemoteSession()
    if (!session) {
      return
    }

    const response = await backendFetch<{ results: Array<{ eventId: string; status: string }> }>('/api/sync/push', {
      method: 'POST',
      body: JSON.stringify({
        organizationId: session.organizationId,
        storeId: session.storeId,
        events: events.map((event) => ({
          id: event.id,
          entityType: event.entityType,
          entityId: event.entityId,
          operation: event.operation,
          occurredAt: event.occurredAt,
          payload: event.payload,
        })),
      }),
    })

    const successfulIds = new Set(
      response.results
        .filter((result) => result.status === 'applied' || result.status === 'duplicate')
        .map((result) => result.eventId),
    )

    if (successfulIds.size > 0) {
      await writeOutbox(events.filter((event) => !successfulIds.has(event.id)))
    }

    await pullCatalogChanges()
  }

  async function maybeSyncCatalog() {
    if (!await isOnlineSyncEnabled()) {
      return null
    }

    const cursor = await readSyncCursor()
    if (!cursor) {
      return syncCatalogFromBootstrap()
    }

    await pullCatalogChanges()
    return {
      categories: await store.read<Category[]>(storageKeys.categories, []),
      products: await store.read<Product[]>(storageKeys.products, []),
    }
  }

  async function loadCachedCatalog() {
    const storedProducts = await store.read<Product[] | null>(storageKeys.products, null)
    const storedCategories = await store.read<Category[] | null>(storageKeys.categories, null)

    if (storedProducts === null || storedCategories === null) {
      await store.write(storageKeys.products, demoProducts)
      await store.write(storageKeys.categories, demoCategories)
      return { products: demoProducts, categories: demoCategories }
    }

    const merged = mergeDemoCatalog(storedProducts, storedCategories)
    if (merged.addedDemoProducts) {
      await store.write(storageKeys.products, merged.products)
    }
    if (merged.addedDemoCategories) {
      await store.write(storageKeys.categories, merged.categories)
    }

    return {
      products: merged.products,
      categories: merged.categories,
    }
  }

  async function enqueueProductEvent(product: Product) {
    await appendOutboxEvent({
      id: crypto.randomUUID(),
      entityType: 'product',
      entityId: product.id,
      operation: 'upsert',
      occurredAt: new Date().toISOString(),
      payload: {
        categoryId: product.categoryId,
        sku: product.sku,
        barcode: product.barcode,
        name: product.name,
        productType: product.kind,
        taxRate: product.taxRate,
        priceCents: product.priceCents,
        trackInventory: product.stockQty !== undefined,
        stockQty: product.stockQty ?? null,
        lowStockThreshold: product.lowStockThreshold ?? null,
        isActive: !product.outOfStock,
      },
    })
  }

  async function enqueueInventoryAdjustmentEvent(input: {
    productId: string
    quantityDelta: number
    adjustmentType: 'sale' | 'restock' | 'manual_correction'
    reason?: string
    orderId?: string
  }) {
    await appendOutboxEvent({
      id: crypto.randomUUID(),
      entityType: 'inventory_adjustment',
      entityId: crypto.randomUUID(),
      operation: 'upsert',
      occurredAt: new Date().toISOString(),
      payload: {
        productId: input.productId,
        quantityDelta: input.quantityDelta,
        adjustmentType: input.adjustmentType,
        reason: input.reason ?? null,
        orderId: input.orderId ?? null,
      },
    })
  }

  async function enqueueCategoryEvent(category: Category, deletedAt?: string) {
    await appendOutboxEvent({
      id: crypto.randomUUID(),
      entityType: 'category',
      entityId: category.id,
      operation: 'upsert',
      occurredAt: new Date().toISOString(),
      payload: {
        name: category.name,
        sortOrder: 0,
        ...(deletedAt ? { deletedAt } : {}),
      },
    })
  }

  async function tryLoadRemoteUsers() {
    if (!await isOnlineSyncEnabled()) {
      return null
    }

    if (supabaseSync) {
      const session = await getSupabaseSession()
      if (!session) return null
      const users = await supabaseSync.loadUsers(session.organizationId)
      await store.write(storageKeys.users, users)
      return users
    }

    const response = await backendFetch<{ users: UserAccount[] }>('/api/staff-users')
    await store.write(storageKeys.users, response.users)
    return response.users
  }

  async function tryLoadRemoteRoles() {
    if (!await isOnlineSyncEnabled()) {
      return null
    }

    if (supabaseSync) {
      const session = await getSupabaseSession()
      if (!session) return null
      const roles = await supabaseSync.loadRoles(session.organizationId)
      await store.write(storageKeys.roles, roles)
      return roles
    }

    const response = await backendFetch<{ roles: RoleDefinition[] }>('/api/staff-roles')
    await store.write(storageKeys.roles, response.roles)
    return response.roles
  }

  return {
    async loadCatalog() {
      try {
        const synced = await maybeSyncCatalog()
        if (synced) {
          return synced
        }
      } catch {
        // Fall back to local cache when the backend is unavailable.
      }

      return loadCachedCatalog()
    },

    async loadOrders() {
      try {
        await flushOutbox()
      } catch {
        // Keep the POS usable even when sync fails.
      }

      const orders = await store.read<OrderSummary[]>(storageKeys.orders, [])
      return orders
        .map((order) => {
          if ('businessMode' in order && order.businessMode) {
            return order
          }

          return {
            ...order,
            businessMode: 'coffee-shop' as const,
          }
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },

    async loadActiveShift() {
      if (await isOnlineSyncEnabled()) {
        try {
          return await refreshRemoteShift()
        } catch {
          // Fall back to cached active shift if the backend is unavailable.
        }
      }

      return readActiveShift()
    },

    async saveOrder(input) {
      const subtotalCents = input.items.reduce((sum, item) => sum + item.lineTotalCents, 0)
      const taxCents = Math.round(subtotalCents * 0.12)
      const totalCents = subtotalCents + taxCents
      const orderId = crypto.randomUUID()
      const ticketSeed = crypto.randomUUID()
      const order: OrderSummary = {
        id: orderId,
        ticketNumber: slugTicket(ticketSeed),
        businessMode: input.businessMode,
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

      const orders = await store.read<OrderSummary[]>(storageKeys.orders, [])
      await store.write(storageKeys.orders, [order, ...orders])

      await appendOutboxEvent({
        id: crypto.randomUUID(),
        entityType: 'order',
        entityId: order.id,
        operation: 'upsert',
        occurredAt: order.createdAt,
        payload: {
          order: {
            id: order.id,
            ticketNumber: order.ticketNumber,
            orderType: order.orderType,
            paymentStatus: 'paid',
            subtotalCents: order.subtotalCents,
            taxCents: order.taxCents,
            totalCents: order.totalCents,
            businessDate: order.createdAt.slice(0, 10),
            completedAt: order.createdAt,
          },
          items: order.items.map((item) => ({
            id: crypto.randomUUID(),
            productId: item.productId,
            productName: item.name,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            lineTotalCents: item.lineTotalCents,
          })),
          payments: [{
            id: crypto.randomUUID(),
            paymentMethod: order.paymentMethod,
            amountCents: order.totalCents,
            tenderedCents: order.tenderedCents,
            changeCents: order.changeCents,
          }],
        },
      })

      try {
        await flushOutbox()
      } catch {
        // Order stays queued until the next sync attempt.
      }

      if (order.paymentMethod === 'cash') {
        await updateCachedShift((current) => {
          if (!current || current.closedAt) {
            return current
          }

          return {
            ...current,
            cashSalesCents: current.cashSalesCents + order.totalCents,
            expectedCashCents: current.expectedCashCents + order.totalCents,
          }
        })
      }

      return order
    },

    async openShift(input) {
      if (await isOnlineSyncEnabled()) {
        if (supabaseSync) {
          const session = await getSupabaseSession()
          if (session) {
            const shift = await supabaseSync.openShift({
              openingCashCents: input.openingCashCents,
              userId: input.userId ?? null,
              storeId: session.storeId,
              organizationId: session.organizationId,
            })
            await writeActiveShift(shift)
            return shift
          }
        } else {
          const response = await backendFetch<{ shift: BackendShiftSummary }>('/api/shifts/open', {
            method: 'POST',
            body: JSON.stringify({
              openingCashCents: input.openingCashCents,
              userId: input.userId ?? null,
            }),
          })
          const shift = mapBackendShift(response.shift)
          await writeActiveShift(shift)
          return shift
        }
      }

      const shift: ShiftSummary = {
        id: crypto.randomUUID(),
        openedByUserId: input.userId ?? null,
        closedByUserId: null,
        openingCashCents: input.openingCashCents,
        closingCashCents: null,
        cashSalesCents: 0,
        payInsCents: 0,
        payOutsCents: 0,
        expectedCashCents: input.openingCashCents,
        varianceCashCents: null,
        openedAt: new Date().toISOString(),
        closedAt: null,
        movements: [],
      }

      await writeActiveShift(shift)
      return shift
    },

    async addCashMovement(input) {
      if (await isOnlineSyncEnabled()) {
        if (supabaseSync) {
          const session = await getSupabaseSession()
          const current = await readActiveShift()
          if (session && current && !current.closedAt) {
            const shift = await supabaseSync.addCashMovement({
              shiftId: current.id,
              storeId: session.storeId,
              organizationId: session.organizationId,
              movementType: input.movementType,
              amountCents: input.amountCents,
              reason: input.reason,
              userId: input.userId ?? null,
            })
            await writeActiveShift(shift)
            return shift
          }
        } else {
          const response = await backendFetch<{ shift: BackendShiftSummary }>('/api/shifts/current/movements', {
            method: 'POST',
            body: JSON.stringify({
              movementType: input.movementType,
              amountCents: input.amountCents,
              reason: input.reason ?? null,
              userId: input.userId ?? null,
            }),
          })
          const shift = mapBackendShift(response.shift)
          await writeActiveShift(shift)
          return shift
        }
      }

      const shift = await updateCachedShift((current) => {
        if (!current || current.closedAt) {
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

        const payInsCents = current.payInsCents + (input.movementType === 'pay_in' ? input.amountCents : 0)
        const payOutsCents = current.payOutsCents + (input.movementType === 'pay_out' ? input.amountCents : 0)

        return {
          ...current,
          payInsCents,
          payOutsCents,
          expectedCashCents: current.openingCashCents + current.cashSalesCents + payInsCents - payOutsCents,
          movements: [movement, ...current.movements],
        }
      })

      if (!shift) {
        throw new Error('No active shift is open for this register.')
      }

      return shift
    },

    async closeShift(input) {
      if (await isOnlineSyncEnabled()) {
        if (supabaseSync) {
          const session = await getSupabaseSession()
          const current = await readActiveShift()
          if (session && current && !current.closedAt) {
            const shift = await supabaseSync.closeShift({
              shiftId: current.id,
              countedCashCents: input.countedCashCents,
              expectedCashCents: current.expectedCashCents,
              userId: input.userId ?? null,
            })
            await writeActiveShift(null)
            return shift
          }
        } else {
          const response = await backendFetch<{ shift: BackendShiftSummary }>('/api/shifts/current/close', {
            method: 'POST',
            body: JSON.stringify({
              countedCashCents: input.countedCashCents,
              userId: input.userId ?? null,
            }),
          })
          const shift = mapBackendShift(response.shift)
          await writeActiveShift(null)
          return shift
        }
      }

      const current = await readActiveShift()
      if (!current || current.closedAt) {
        throw new Error('No active shift is open for this register.')
      }

      const closedShift: ShiftSummary = {
        ...current,
        closedByUserId: input.userId ?? null,
        closingCashCents: input.countedCashCents,
        varianceCashCents: input.countedCashCents - current.expectedCashCents,
        closedAt: new Date().toISOString(),
      }

      await writeActiveShift(null)
      return closedShift
    },

    async adjustInventory(input) {
      const products = await store.read<Product[]>(storageKeys.products, [])
      const product = products.find((entry) => entry.id === input.productId)
      if (!product || product.stockQty === undefined) {
        return null
      }

      const updated: Product = {
        ...product,
        stockQty: Math.max(0, product.stockQty + input.quantityDelta),
        outOfStock: Math.max(0, product.stockQty + input.quantityDelta) === 0,
      }

      await store.write(
        storageKeys.products,
        products.map((entry) => (entry.id === updated.id ? updated : entry)),
      )

      await enqueueInventoryAdjustmentEvent(input)

      try {
        await flushOutbox()
      } catch {
        // Inventory adjustments stay queued until sync succeeds.
      }

      return updated
    },

    async loadSettings() {
      const saved = await store.read<Partial<AppSettings>>(storageKeys.settings, defaultSettings)
      return {
        ...defaultSettings,
        ...saved,
      }
    },

    async saveSettings(settings) {
      await store.write(storageKeys.settings, settings)

      if (settings.syncMode === 'online-sync') {
        try {
          if (!supabaseSync) {
            await ensureRemoteSession()
          }
          await syncCatalogFromBootstrap()
          await flushOutbox()
        } catch {
          // Leave the local state intact if pairing or sync is unavailable.
        }
      }
    },

    async loadUsers() {
      try {
        const remoteUsers = await tryLoadRemoteUsers()
        if (remoteUsers) {
          return remoteUsers
        }
      } catch {
        // Fall back to cached local users.
      }

      return store.read<UserAccount[]>(storageKeys.users, [])
    },

    async saveUsers(users) {
      await store.write(storageKeys.users, users)
    },

    async loginUser(username, password) {
      if (await isOnlineSyncEnabled()) {
        try {
          if (supabaseSync) {
            const result = await supabaseSync.loginUser(username, password)
            if (result) {
              const existingUsers = await store.read<UserAccount[]>(storageKeys.users, [])
              await store.write(storageKeys.users, [
                result.user,
                ...existingUsers.filter((u) => u.id !== result.user.id),
              ])
              await store.write(storageKeys.session, result.session)
              await writeSupabaseSession(result.syncSession)
              return { user: result.user, session: result.session }
            }
          } else {
            const response = await fetch(`${syncConfig?.apiBaseUrl}/api/staff-sessions`, {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                organizationSlug: syncConfig?.organizationSlug,
                storeCode: syncConfig?.storeCode,
                username,
                password,
              }),
            })

            if (response.ok) {
              const body = await response.json() as {
                user: UserAccount
                session: AuthSession
              }
              const existingUsers = await store.read<UserAccount[]>(storageKeys.users, [])
              await store.write(storageKeys.users, [
                body.user,
                ...existingUsers.filter((entry) => entry.id !== body.user.id),
              ])
              await store.write(storageKeys.session, body.session)
              return body
            }
          }
        } catch {
          // Fall back to local auth below.
        }
      }

      const users = await store.read<UserAccount[]>(storageKeys.users, [])
      const normalizedUsername = username.trim().toLowerCase()
      const passwordHash = await hashPassword(password)
      const user = users.find((entry) => entry.username === normalizedUsername)

      if (!user || user.passwordHash !== passwordHash) {
        return null
      }

      const session: AuthSession = {
        userId: user.id,
        signedInAt: new Date().toISOString(),
        authSource: 'local',
      }
      await store.write(storageKeys.session, session)

      return { user, session }
    },

    async registerUser(input) {
      if (await isOnlineSyncEnabled()) {
        try {
          if (supabaseSync) {
            const result = await supabaseSync.registerUser(input)
            if (result) {
              const existingUsers = await store.read<UserAccount[]>(storageKeys.users, [])
              await store.write(storageKeys.users, [
                result.user,
                ...existingUsers.filter((u) => u.id !== result.user.id),
              ])
              await store.write(storageKeys.session, result.session)
              await writeSupabaseSession(result.syncSession)
              return { user: result.user, session: result.session }
            }
          } else {
            const response = await fetch(`${syncConfig?.apiBaseUrl}/api/staff-register`, {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                organizationSlug: syncConfig?.organizationSlug,
                storeCode: syncConfig?.storeCode,
                fullName: input.fullName,
                username: input.username,
                password: input.password,
              }),
            })

            if (response.ok) {
              const body = await response.json() as {
                user: UserAccount
                session: AuthSession
              }
              const existingUsers = await store.read<UserAccount[]>(storageKeys.users, [])
              await store.write(storageKeys.users, [
                body.user,
                ...existingUsers.filter((entry) => entry.id !== body.user.id),
              ])
              await store.write(storageKeys.session, body.session)
              return body
            }
          }
        } catch {
          // Fall back to local registration below.
        }
      }

      const users = await store.read<UserAccount[]>(storageKeys.users, [])
      const fullName = input.fullName.trim()
      const username = input.username.trim().toLowerCase()
      const password = input.password.trim()

      if (!fullName || !username || !password) {
        return null
      }

      if (users.some((user) => user.username === username)) {
        return null
      }

      const defaultRoleId = users.length > 0 ? 'cashier' : 'admin'
      const user: UserAccount = {
        id: crypto.randomUUID(),
        fullName,
        username,
        passwordHash: await hashPassword(password),
        roleId: defaultRoleId,
        createdAt: new Date().toISOString(),
      }

      const nextUsers = [...users, user]
      await store.write(storageKeys.users, nextUsers)

      const session: AuthSession = {
        userId: user.id,
        signedInAt: new Date().toISOString(),
        authSource: 'local',
      }
      await store.write(storageKeys.session, session)

      return { user, session }
    },

    async updateUserRole(userId, roleId) {
      const users = await store.read<UserAccount[]>(storageKeys.users, [])
      const nextUsers = users.map((user) => (user.id === userId ? { ...user, roleId } : user))
      await store.write(storageKeys.users, nextUsers)

      if (await isOnlineSyncEnabled()) {
        try {
          if (supabaseSync) {
            const session = await getSupabaseSession()
            if (session) {
              await supabaseSync.updateUserRole(userId, roleId, session.organizationId)
              const refreshedUsers = await tryLoadRemoteUsers()
              if (refreshedUsers) return
            }
          } else {
            await backendFetch<{ user: UserAccount }>(`/api/staff-users/${userId}/role`, {
              method: 'PATCH',
              body: JSON.stringify({ roleId }),
            })
            const refreshedUsers = await tryLoadRemoteUsers()
            if (refreshedUsers) return
          }
        } catch {
          // Keep the local role update even if the backend call fails.
        }
      }
    },

    async loadRoles() {
      try {
        const remoteRoles = await tryLoadRemoteRoles()
        if (remoteRoles) {
          return remoteRoles
        }
      } catch {
        // Fall back to cached roles.
      }

      const roles = await store.read<RoleDefinition[]>(storageKeys.roles, [])
      return roles.length > 0 ? roles : defaultRoles
    },

    async saveRoles(roles) {
      await store.write(storageKeys.roles, roles)

      if (await isOnlineSyncEnabled()) {
        try {
          if (supabaseSync) {
            const session = await getSupabaseSession()
            if (session) {
              const saved = await supabaseSync.saveRoles(roles, session.organizationId)
              await store.write(storageKeys.roles, saved)
            }
          } else {
            const response = await backendFetch<{ roles: RoleDefinition[] }>('/api/staff-roles', {
              method: 'PUT',
              body: JSON.stringify({ roles }),
            })
            await store.write(storageKeys.roles, response.roles)
          }
        } catch {
          // Keep local roles cached if remote sync fails.
        }
      }
    },

    async loadSession() {
      return store.read<AuthSession | null>(storageKeys.session, null)
    },

    async saveSession(session) {
      await store.write(storageKeys.session, session)
    },

    async loadAppEvents() {
      const events = await store.read<AppEvent[]>(storageKeys.appEvents, [])
      return events.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },

    async trackAppEvent(input) {
      const event: AppEvent = {
        id: crypto.randomUUID(),
        eventType: input.eventType,
        payload: input.payload,
        deviceId: await getDeviceId(),
        appVersion,
        createdAt: new Date().toISOString(),
        sentAt: null,
      }

      const events = await store.read<AppEvent[]>(storageKeys.appEvents, [])
      await store.write(storageKeys.appEvents, [event, ...events])
      return event
    },

    async saveProduct(input) {
      const product: Product = {
        ...input,
        id: crypto.randomUUID(),
        sku: generateSku(input.name),
        barcode: String(Date.now()).slice(-12),
      }

      const products = await store.read<Product[]>(storageKeys.products, [])
      await store.write(storageKeys.products, [product, ...products])
      await enqueueProductEvent(product)

      try {
        await flushOutbox()
      } catch {
        // Product changes remain local until sync succeeds.
      }

      return product
    },

    async updateProduct(product) {
      const products = await store.read<Product[]>(storageKeys.products, [])
      const previous = products.find((p) => p.id === product.id) ?? null
      await store.write(
        storageKeys.products,
        products.map((p) => (p.id === product.id ? product : p)),
      )

      const metadataChanged = !previous
        || previous.categoryId !== product.categoryId
        || previous.sku !== product.sku
        || previous.barcode !== product.barcode
        || previous.name !== product.name
        || previous.priceCents !== product.priceCents
        || previous.taxRate !== product.taxRate
        || previous.kind !== product.kind
        || previous.lowStockThreshold !== product.lowStockThreshold
        || previous.outOfStock !== product.outOfStock
        || String(previous.stockQty ?? '') !== String(product.stockQty ?? '')

      if (metadataChanged) {
        await enqueueProductEvent(product)
      }

      const previousQty = previous?.stockQty
      const nextQty = product.stockQty
      if (
        previous
        && typeof previousQty === 'number'
        && typeof nextQty === 'number'
        && previousQty !== nextQty
      ) {
        await enqueueInventoryAdjustmentEvent({
          productId: product.id,
          quantityDelta: nextQty - previousQty,
          adjustmentType: 'manual_correction',
          reason: 'product_edit',
        })
      }

      try {
        await flushOutbox()
      } catch {
        // Product changes remain local until sync succeeds.
      }

      return product
    },

    async deleteProduct(id) {
      const products = await store.read<Product[]>(storageKeys.products, [])
      const target = products.find((product) => product.id === id)
      await store.write(
        storageKeys.products,
        products.filter((p) => p.id !== id),
      )

      if (target) {
        await appendOutboxEvent({
          id: crypto.randomUUID(),
          entityType: 'product',
          entityId: target.id,
          operation: 'upsert',
          occurredAt: new Date().toISOString(),
          payload: {
            categoryId: target.categoryId,
            sku: target.sku,
            barcode: target.barcode,
            name: target.name,
            productType: target.kind,
            taxRate: target.taxRate,
            priceCents: target.priceCents,
            trackInventory: target.stockQty !== undefined,
            isActive: false,
            deletedAt: new Date().toISOString(),
          },
        })
      }

      try {
        await flushOutbox()
      } catch {
        // Product deletion remains queued until sync succeeds.
      }
    },

    async saveCategory(input) {
      const category: Category = {
        id: crypto.randomUUID(),
        name: input.name,
      }

      const categories = await store.read<Category[]>(storageKeys.categories, [])
      await store.write(storageKeys.categories, [...categories, category])
      await enqueueCategoryEvent(category)

      try {
        await flushOutbox()
      } catch {
        // Category changes remain local until sync succeeds.
      }

      return category
    },

    async updateCategory(category) {
      const categories = await store.read<Category[]>(storageKeys.categories, [])
      await store.write(
        storageKeys.categories,
        categories.map((c) => (c.id === category.id ? category : c)),
      )

      await enqueueCategoryEvent(category)

      try {
        await flushOutbox()
      } catch {
        // Category changes remain local until sync succeeds.
      }

      return category
    },

    async deleteCategory(id) {
      const categories = await store.read<Category[]>(storageKeys.categories, [])
      const removed = categories.find((category) => category.id === id)
      const remaining = categories.filter((c) => c.id !== id)
      await store.write(storageKeys.categories, remaining)

      const products = await store.read<Product[]>(storageKeys.products, [])
      const fallbackId = remaining[0]?.id ?? products[0]?.categoryId ?? 'groceries'
      await store.write(
        storageKeys.products,
        products.map((p) => (p.categoryId === id ? { ...p, categoryId: fallbackId } : p)),
      )

      if (removed) {
        await enqueueCategoryEvent(removed, new Date().toISOString())
      }

      try {
        await flushOutbox()
      } catch {
        // Category deletion remains queued until sync succeeds.
      }
    },
  }
}
