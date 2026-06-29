import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  Category,
  CashMovementSummary,
  CashMovementType,
  AuthSession,
  Product,
  RoleDefinition,
  ShiftSummary,
  UserAccount,
} from '@pos/shared/index'

// ── Config ────────────────────────────────────────────────────────────────────

export interface SupabaseSyncConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  organizationSlug: string
  storeCode: string
  deviceName: string
  platform: string
  appVersion: string
}

export interface SupabaseSyncSession {
  token: string
  deviceId: string
  storeId: string
  storeName: string
  organizationId: string
  organizationSlug: string
}

// ── Database row shapes ────────────────────────────────────────────────────────

interface DbCategory {
  id: string
  name: string
  sort_order: number
}

interface DbProduct {
  id: string
  category_id: string | null
  sku: string
  barcode: string
  name: string
  product_type: string
  tax_rate: number | string
  price_cents: number
  track_inventory: boolean
  is_active: boolean
  low_stock_threshold: number | null
  business_modes: string[]
  updated_at: string
  inventory_levels: Array<{ qty_on_hand: number | string; reorder_level: number | string | null }>
}

interface DbUser {
  id: string
  full_name: string
  username: string
  status: string
  created_at: string
  organization_memberships: Array<{ role_key: string }>
}

interface DbRole {
  role_key: string
  name: string
  permissions: Record<string, unknown>
}

interface DbCashMovement {
  id: string
  user_id: string | null
  movement_type: string
  amount_cents: number
  reason: string | null
  created_at: string
}

interface DbShift {
  id: string
  opened_by_user_id: string | null
  closed_by_user_id: string | null
  opening_cash_cents: number
  closing_cash_cents: number | null
  cash_sales_cents: number
  pay_ins_cents: number
  pay_outs_cents: number
  expected_cash_cents: number
  variance_cash_cents: number | null
  opened_at: string
  closed_at: string | null
  cash_movements: DbCashMovement[]
}

interface SyncOutboxEvent {
  id: string
  entityType: 'order' | 'category' | 'product' | 'inventory_adjustment'
  entityId: string
  operation: 'upsert'
  occurredAt: string
  payload: Record<string, unknown>
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapDbCategory(row: DbCategory): Category {
  return { id: row.id, name: row.name }
}

function mapDbProduct(row: DbProduct): Product {
  const level = row.inventory_levels?.[0]
  const stockQty = row.track_inventory && level != null ? Number(level.qty_on_hand) : undefined
  const lowStockThreshold = level?.reorder_level != null ? Number(level.reorder_level) : undefined

  return {
    id: row.id,
    categoryId: row.category_id ?? 'uncategorized',
    sku: row.sku,
    barcode: row.barcode ?? '',
    name: row.name,
    priceCents: row.price_cents,
    taxRate: Number(row.tax_rate),
    kind: row.product_type === 'weighted' ? 'weighted' : 'standard',
    businessModes: (row.business_modes ?? []) as Product['businessModes'],
    outOfStock: !row.is_active || stockQty === 0,
    stockQty,
    lowStockThreshold,
  }
}

function mapDbShift(row: DbShift): ShiftSummary {
  const movements: CashMovementSummary[] = (row.cash_movements ?? []).map((m) => ({
    id: m.id,
    userId: m.user_id ?? null,
    movementType: m.movement_type as CashMovementType,
    amountCents: m.amount_cents,
    reason: m.reason ?? null,
    createdAt: m.created_at,
  }))

  return {
    id: row.id,
    openedByUserId: row.opened_by_user_id ?? null,
    closedByUserId: row.closed_by_user_id ?? null,
    openingCashCents: row.opening_cash_cents,
    closingCashCents: row.closing_cash_cents ?? null,
    cashSalesCents: row.cash_sales_cents,
    payInsCents: row.pay_ins_cents,
    payOutsCents: row.pay_outs_cents,
    expectedCashCents: row.expected_cash_cents,
    varianceCashCents: row.variance_cash_cents ?? null,
    openedAt: row.opened_at,
    closedAt: row.closed_at ?? null,
    movements,
  }
}

function syntheticEmail(username: string, orgSlug: string): string {
  return `${username.trim().toLowerCase()}@${orgSlug}.pos`
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createSupabaseSync(config: SupabaseSyncConfig) {
  const supabase: SupabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey)

  async function resolveOrgStore() {
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', config.organizationSlug)
      .single<{ id: string }>()

    if (orgErr || !org) {
      throw new Error(`Organization '${config.organizationSlug}' not found in Supabase.`)
    }

    const { data: store, error: storeErr } = await supabase
      .from('stores')
      .select('id, name')
      .eq('organization_id', org.id)
      .eq('code', config.storeCode)
      .single<{ id: string; name: string }>()

    if (storeErr || !store) {
      throw new Error(`Store '${config.storeCode}' not found under organization '${config.organizationSlug}'.`)
    }

    return { organizationId: org.id, storeId: store.id, storeName: store.name }
  }

  async function pushOrderEvent(event: SyncOutboxEvent, orgId: string, storeId: string) {
    const p = event.payload as {
      order: Record<string, unknown>
      items: Array<Record<string, unknown>>
      payments: Array<Record<string, unknown>>
    }

    const order = p.order as {
      id: string
      ticketNumber: string
      orderType: string
      subtotalCents: number
      taxCents: number
      totalCents: number
      completedAt: string
      businessMode?: string
    }

    const { error: orderErr } = await supabase.from('orders').upsert({
      id: event.entityId,
      organization_id: orgId,
      store_id: storeId,
      ticket_number: order.ticketNumber,
      business_mode: order.businessMode ?? 'coffee-shop',
      order_type: order.orderType,
      payment_method: (p.payments[0] as Record<string, string>)?.paymentMethod ?? 'cash',
      subtotal_cents: order.subtotalCents,
      tax_cents: order.taxCents,
      total_cents: order.totalCents,
      tendered_cents: Number((p.payments[0] as Record<string, number>)?.tenderedCents ?? order.totalCents),
      change_cents: Number((p.payments[0] as Record<string, number>)?.changeCents ?? 0),
      completed_at: order.completedAt,
    }, { onConflict: 'id', ignoreDuplicates: true })

    if (orderErr) {
      throw orderErr
    }

    for (const item of p.items) {
      const i = item as {
        id: string
        productId: string
        productName: string
        quantity: number
        unitPriceCents: number
        lineTotalCents: number
      }

      await supabase.from('order_items').upsert({
        id: i.id,
        organization_id: orgId,
        store_id: storeId,
        order_id: event.entityId,
        product_id: i.productId || null,
        product_name: i.productName,
        quantity: i.quantity,
        unit_price_cents: i.unitPriceCents,
        line_total_cents: i.lineTotalCents,
      }, { onConflict: 'id', ignoreDuplicates: true })
    }
  }

  async function pushProductEvent(event: SyncOutboxEvent, orgId: string) {
    const p = event.payload as {
      categoryId: string
      sku: string
      barcode: string
      name: string
      productType: string
      taxRate: number
      priceCents: number
      trackInventory: boolean
      stockQty: number | null
      lowStockThreshold: number | null
      isActive: boolean
      deletedAt?: string
    }

    await supabase.from('products').upsert({
      id: event.entityId,
      organization_id: orgId,
      category_id: p.categoryId === 'uncategorized' ? null : p.categoryId,
      sku: p.sku,
      barcode: p.barcode ?? '',
      name: p.name,
      product_type: p.productType ?? 'standard',
      tax_rate: p.taxRate,
      price_cents: p.priceCents,
      track_inventory: p.trackInventory ?? false,
      low_stock_threshold: p.lowStockThreshold ?? null,
      is_active: p.isActive !== false && !p.deletedAt,
      business_modes: [],
    }, { onConflict: 'id' })
  }

  async function pushCategoryEvent(event: SyncOutboxEvent, orgId: string) {
    const p = event.payload as { name: string; sortOrder?: number }
    await supabase.from('categories').upsert({
      id: event.entityId,
      organization_id: orgId,
      name: p.name,
      sort_order: p.sortOrder ?? 0,
    }, { onConflict: 'id' })
  }

  async function pushInventoryAdjustmentEvent(event: SyncOutboxEvent, orgId: string, storeId: string) {
    const p = event.payload as {
      productId: string
      quantityDelta: number
      adjustmentType: string
      reason: string | null
      orderId: string | null
    }

    await supabase.from('inventory_adjustments').insert({
      organization_id: orgId,
      store_id: storeId,
      product_id: p.productId,
      order_id: p.orderId ?? null,
      adjustment_type: p.adjustmentType,
      quantity_delta: p.quantityDelta,
      reason: p.reason ?? null,
    })

    // Upsert inventory_levels directly (the trigger handles sales via order_items,
    // so this path is only reached for restocks and manual corrections)
    const { data: existing } = await supabase
      .from('inventory_levels')
      .select('qty_on_hand')
      .eq('store_id', storeId)
      .eq('product_id', p.productId)
      .maybeSingle<{ qty_on_hand: number }>()

    if (existing) {
      await supabase
        .from('inventory_levels')
        .update({ qty_on_hand: Number(existing.qty_on_hand) + p.quantityDelta })
        .eq('store_id', storeId)
        .eq('product_id', p.productId)
    } else {
      await supabase.from('inventory_levels').insert({
        organization_id: orgId,
        store_id: storeId,
        product_id: p.productId,
        qty_on_hand: Math.max(0, p.quantityDelta),
      })
    }
  }

  return {
    // Returns a live session derived from the Supabase auth state.
    async getCurrentSession(cached: SupabaseSyncSession | null): Promise<SupabaseSyncSession | null> {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        return null
      }

      // Re-use cached org/store metadata to avoid extra DB round-trips
      if (cached?.organizationId && cached?.storeId) {
        return { ...cached, token: session.access_token }
      }

      try {
        const { organizationId, storeId, storeName } = await resolveOrgStore()
        return {
          token: session.access_token,
          deviceId: '',
          storeId,
          storeName,
          organizationId,
          organizationSlug: config.organizationSlug,
        }
      } catch {
        return null
      }
    },

    async loginUser(
      username: string,
      password: string,
    ): Promise<{ user: UserAccount; session: AuthSession; syncSession: SupabaseSyncSession } | null> {
      const email = syntheticEmail(username, config.organizationSlug)
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error || !data.user || !data.session) {
        return null
      }

      const { data: userRow, error: userErr } = await supabase
        .from('users')
        .select('*, organization_memberships(role_key)')
        .eq('id', data.user.id)
        .single<DbUser>()

      if (userErr || !userRow) {
        return null
      }

      const { organizationId, storeId, storeName } = await resolveOrgStore()

      const user: UserAccount = {
        id: userRow.id,
        fullName: userRow.full_name,
        username: userRow.username,
        passwordHash: '',
        roleId: userRow.organization_memberships?.[0]?.role_key ?? 'cashier',
        createdAt: userRow.created_at,
      }

      const authSession: AuthSession = {
        userId: userRow.id,
        signedInAt: new Date().toISOString(),
        authSource: 'remote',
      }

      const syncSession: SupabaseSyncSession = {
        token: data.session.access_token,
        deviceId: '',
        storeId,
        storeName,
        organizationId,
        organizationSlug: config.organizationSlug,
      }

      return { user, session: authSession, syncSession }
    },

    async registerUser(input: {
      fullName: string
      username: string
      password: string
    }): Promise<{ user: UserAccount; session: AuthSession; syncSession: SupabaseSyncSession } | null> {
      const email = syntheticEmail(input.username, config.organizationSlug)
      const { data, error } = await supabase.auth.signUp({ email, password: input.password })

      if (error || !data.user) {
        return null
      }

      const { organizationId, storeId, storeName } = await resolveOrgStore()

      const { error: userErr } = await supabase.from('users').insert({
        id: data.user.id,
        organization_id: organizationId,
        full_name: input.fullName.trim(),
        username: input.username.trim().toLowerCase(),
      })

      if (userErr) {
        await supabase.auth.signOut()
        return null
      }

      // First member becomes admin; subsequent members are cashiers
      const { count } = await supabase
        .from('organization_memberships')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)

      const roleKey = (count ?? 0) === 0 ? 'admin' : 'cashier'

      await supabase.from('organization_memberships').insert({
        organization_id: organizationId,
        user_id: data.user.id,
        role_key: roleKey,
      })

      const user: UserAccount = {
        id: data.user.id,
        fullName: input.fullName.trim(),
        username: input.username.trim().toLowerCase(),
        passwordHash: '',
        roleId: roleKey,
        createdAt: new Date().toISOString(),
      }

      const authSession: AuthSession = {
        userId: data.user.id,
        signedInAt: new Date().toISOString(),
        authSource: 'remote',
      }

      const syncSession: SupabaseSyncSession = {
        token: data.session?.access_token ?? '',
        deviceId: '',
        storeId,
        storeName,
        organizationId,
        organizationSlug: config.organizationSlug,
      }

      return { user, session: authSession, syncSession }
    },

    async signOut(): Promise<void> {
      await supabase.auth.signOut()
    },

    async bootstrapCatalog(orgId: string): Promise<{ categories: Category[]; products: Product[]; cursor: string }> {
      const [catResult, prodResult] = await Promise.all([
        supabase
          .from('categories')
          .select('id, name, sort_order')
          .eq('organization_id', orgId)
          .order('sort_order', { ascending: true }),
        supabase
          .from('products')
          .select('*, inventory_levels(qty_on_hand, reorder_level)')
          .eq('organization_id', orgId)
          .eq('is_active', true),
      ])

      if (catResult.error) throw catResult.error
      if (prodResult.error) throw prodResult.error

      return {
        categories: (catResult.data as DbCategory[]).map(mapDbCategory),
        products: (prodResult.data as DbProduct[]).map(mapDbProduct),
        cursor: new Date().toISOString(),
      }
    },

    async pullChanges(orgId: string, cursor: string): Promise<{ categories: Category[]; products: Product[]; cursor: string }> {
      const [catResult, prodResult] = await Promise.all([
        supabase
          .from('categories')
          .select('id, name, sort_order')
          .eq('organization_id', orgId)
          .gt('updated_at', cursor),
        supabase
          .from('products')
          .select('*, inventory_levels(qty_on_hand, reorder_level)')
          .eq('organization_id', orgId)
          .gt('updated_at', cursor),
      ])

      if (catResult.error) throw catResult.error
      if (prodResult.error) throw prodResult.error

      return {
        categories: (catResult.data as DbCategory[]).map(mapDbCategory),
        products: (prodResult.data as DbProduct[]).map(mapDbProduct),
        cursor: new Date().toISOString(),
      }
    },

    async pushEvents(events: SyncOutboxEvent[], session: SupabaseSyncSession): Promise<Set<string>> {
      const applied = new Set<string>()
      const { organizationId, storeId } = session

      for (const event of events) {
        try {
          // Idempotency: insert into sync_events first
          const { error: idempotencyErr } = await supabase.from('sync_events').insert({
            organization_id: organizationId,
            store_id: storeId,
            entity_type: event.entityType,
            entity_id: event.entityId,
            operation: event.operation,
            payload: event.payload,
            idempotency_key: event.id,
          })

          if (idempotencyErr) {
            // Unique constraint violation → already applied
            if (idempotencyErr.code === '23505') {
              applied.add(event.id)
            }
            continue
          }

          if (event.entityType === 'order') {
            await pushOrderEvent(event, organizationId, storeId)
          } else if (event.entityType === 'product') {
            await pushProductEvent(event, organizationId)
          } else if (event.entityType === 'category') {
            await pushCategoryEvent(event, organizationId)
          } else if (event.entityType === 'inventory_adjustment') {
            await pushInventoryAdjustmentEvent(event, organizationId, storeId)
          }

          await supabase
            .from('sync_events')
            .update({ applied_at: new Date().toISOString() })
            .eq('idempotency_key', event.id)

          applied.add(event.id)
        } catch {
          // Leave event in outbox for next sync attempt
        }
      }

      return applied
    },

    async loadUsers(orgId: string): Promise<UserAccount[]> {
      const { data, error } = await supabase
        .from('users')
        .select('*, organization_memberships(role_key)')
        .eq('organization_id', orgId)

      if (error || !data) return []

      return (data as DbUser[]).map((row) => ({
        id: row.id,
        fullName: row.full_name,
        username: row.username,
        passwordHash: '',
        roleId: row.organization_memberships?.[0]?.role_key ?? 'cashier',
        createdAt: row.created_at,
      }))
    },

    async loadRoles(orgId: string): Promise<RoleDefinition[]> {
      const { data, error } = await supabase
        .from('pos_roles')
        .select('role_key, name, permissions')
        .eq('organization_id', orgId)
        .is('deleted_at', null)

      if (error || !data) return []

      return (data as DbRole[]).map((row) => ({
        id: row.role_key,
        name: row.name,
        permissions: row.permissions as RoleDefinition['permissions'],
      }))
    },

    async updateUserRole(userId: string, roleId: string, orgId: string): Promise<void> {
      await supabase
        .from('organization_memberships')
        .update({ role_key: roleId })
        .eq('user_id', userId)
        .eq('organization_id', orgId)
    },

    async saveRoles(roles: RoleDefinition[], orgId: string): Promise<RoleDefinition[]> {
      for (const role of roles) {
        await supabase.from('pos_roles').upsert({
          organization_id: orgId,
          role_key: role.id,
          name: role.name,
          permissions: role.permissions ?? {},
        }, { onConflict: 'organization_id,role_key' })
      }
      return roles
    },

    async getCurrentShift(storeId: string): Promise<ShiftSummary | null> {
      const { data, error } = await supabase
        .from('shifts')
        .select('*, cash_movements(*)')
        .eq('store_id', storeId)
        .is('closed_at', null)
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle<DbShift>()

      if (error || !data) return null
      return mapDbShift(data)
    },

    async openShift(input: {
      openingCashCents: number
      userId?: string | null
      storeId: string
      organizationId: string
    }): Promise<ShiftSummary> {
      const { data, error } = await supabase
        .from('shifts')
        .insert({
          organization_id: input.organizationId,
          store_id: input.storeId,
          opened_by_user_id: input.userId ?? null,
          opening_cash_cents: input.openingCashCents,
          expected_cash_cents: input.openingCashCents,
        })
        .select('*, cash_movements(*)')
        .single<DbShift>()

      if (error || !data) {
        throw new Error('Failed to open shift.')
      }
      return mapDbShift(data)
    },

    async closeShift(input: {
      shiftId: string
      countedCashCents: number
      expectedCashCents: number
      userId?: string | null
    }): Promise<ShiftSummary> {
      const variance = input.countedCashCents - input.expectedCashCents
      const { data, error } = await supabase
        .from('shifts')
        .update({
          closed_by_user_id: input.userId ?? null,
          closing_cash_cents: input.countedCashCents,
          variance_cash_cents: variance,
          closed_at: new Date().toISOString(),
        })
        .eq('id', input.shiftId)
        .select('*, cash_movements(*)')
        .single<DbShift>()

      if (error || !data) {
        throw new Error('Failed to close shift.')
      }
      return mapDbShift(data)
    },

    async addCashMovement(input: {
      shiftId: string
      storeId: string
      organizationId: string
      movementType: CashMovementType
      amountCents: number
      reason?: string
      userId?: string | null
    }): Promise<ShiftSummary> {
      await supabase.from('cash_movements').insert({
        organization_id: input.organizationId,
        store_id: input.storeId,
        shift_id: input.shiftId,
        user_id: input.userId ?? null,
        movement_type: input.movementType,
        amount_cents: input.amountCents,
        reason: input.reason ?? null,
      })

      const { data: shift, error: shiftErr } = await supabase
        .from('shifts')
        .select('*, cash_movements(*)')
        .eq('id', input.shiftId)
        .single<DbShift>()

      if (shiftErr || !shift) {
        throw new Error('Failed to reload shift after cash movement.')
      }

      // Recalculate totals from movements
      const payIns = shift.cash_movements
        .filter((m) => m.movement_type === 'pay_in')
        .reduce((sum, m) => sum + m.amount_cents, 0)
      const payOuts = shift.cash_movements
        .filter((m) => m.movement_type === 'pay_out')
        .reduce((sum, m) => sum + m.amount_cents, 0)
      const expected = shift.opening_cash_cents + shift.cash_sales_cents + payIns - payOuts

      await supabase
        .from('shifts')
        .update({ pay_ins_cents: payIns, pay_outs_cents: payOuts, expected_cash_cents: expected })
        .eq('id', input.shiftId)

      return mapDbShift({ ...shift, pay_ins_cents: payIns, pay_outs_cents: payOuts, expected_cash_cents: expected })
    },
  }
}

export type SupabaseSync = ReturnType<typeof createSupabaseSync>
