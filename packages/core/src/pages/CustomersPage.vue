<script setup lang="ts">
import { ChevronRight, Search, Users, Star } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import ChartCard from '@pos/core/components/ChartCard.vue'
import MetricCard from '@pos/core/components/MetricCard.vue'
import RangeSelector, { type Range } from '@pos/core/components/RangeSelector.vue'
import { usePosStore } from '@pos/core/stores/pos'
import { formatCompactDate, formatCurrency, type OrderSummary } from '@pos/shared/index'

const store = usePosStore()

onMounted(() => {
  if (!store.isReady) {
    void store.initialize()
  }
})

const range = ref<Range>('month')
const searchQuery = ref('')
const tierFilter = ref<'all' | CustomerTier>('all')
const now = new Date()

type CustomerTier = 'VIP' | 'Regular' | 'Occasional' | 'New'

interface Bounds {
  start: Date
  end: Date
  prevStart: Date
  prevEnd: Date
}

interface CustomerProfile {
  id: string
  name: string
  initials: string
  visits: number
  totalSpendCents: number
  averageSpendCents: number
  lastVisitAt: string
  favoriteItem: string
  preferredPaymentMethod: string
  tier: CustomerTier
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function getMonday(d: Date) {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return new Date(startOfDay(d).getTime() + diff * 86400000)
}

function getBounds(value: Range): Bounds {
  const today = startOfDay(now)
  switch (value) {
    case 'today': {
      const start = today
      const end = new Date(today.getTime() + 86400000)
      return { start, end, prevStart: new Date(start.getTime() - 86400000), prevEnd: start }
    }
    case 'week': {
      const start = getMonday(now)
      const end = new Date(start.getTime() + 7 * 86400000)
      return { start, end, prevStart: new Date(start.getTime() - 7 * 86400000), prevEnd: start }
    }
    case 'month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      const prevStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      return { start, end, prevStart, prevEnd: start }
    }
    case 'all': {
      const epoch = new Date(0)
      const far = new Date(8640000000000000)
      return { start: epoch, end: far, prevStart: epoch, prevEnd: epoch }
    }
  }
}

function inBounds(order: OrderSummary, start: Date, end: Date) {
  const createdAt = new Date(order.createdAt)
  return createdAt >= start && createdAt < end
}

function hashValue(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return hash
}

function inferCustomerKey(order: OrderSummary) {
  const leadItem = order.items[0]?.productId ?? 'walk-in'
  const totalBucket = Math.floor(order.totalCents / 50000)
  return `${leadItem}:${order.paymentMethod}:${order.orderType}:${totalBucket % 7}`
}

function inferCustomerName(key: string) {
  const firstNames = ['Maria', 'John', 'Angela', 'Mark', 'Bea', 'Paolo', 'Anne', 'Carlo', 'Lea', 'Miguel', 'Trisha', 'Nico']
  const lastNames = ['Santos', 'Reyes', 'Dela Cruz', 'Mendoza', 'Garcia', 'Lim', 'Torres', 'Castro', 'Aquino', 'Bautista']
  const hash = hashValue(key)
  const first = firstNames[hash % firstNames.length]
  const last = lastNames[Math.floor(hash / firstNames.length) % lastNames.length]
  return `${first} ${last}`
}

function initialsFor(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function tierFor(visits: number, totalSpendCents: number): CustomerTier {
  if (visits >= 8 || totalSpendCents >= 150000) return 'VIP'
  if (visits >= 4 || totalSpendCents >= 70000) return 'Regular'
  if (visits >= 2) return 'Occasional'
  return 'New'
}

function buildProfiles(orders: OrderSummary[]) {
  const customerMap = new Map<string, CustomerProfile>()
  const favoriteCounts = new Map<string, Map<string, number>>()
  const paymentCounts = new Map<string, Map<string, number>>()

  for (const order of orders) {
    const customerId = inferCustomerKey(order)
    const name = inferCustomerName(customerId)
    const existing = customerMap.get(customerId) ?? {
      id: customerId,
      name,
      initials: initialsFor(name),
      visits: 0,
      totalSpendCents: 0,
      averageSpendCents: 0,
      lastVisitAt: order.createdAt,
      favoriteItem: order.items[0]?.name ?? 'Mixed order',
      preferredPaymentMethod: order.paymentMethod,
      tier: 'New',
    }

    existing.visits += 1
    existing.totalSpendCents += order.totalCents
    if (order.createdAt > existing.lastVisitAt) {
      existing.lastVisitAt = order.createdAt
    }

    customerMap.set(customerId, existing)

    const itemCounts = favoriteCounts.get(customerId) ?? new Map<string, number>()
    for (const item of order.items) {
      itemCounts.set(item.name, (itemCounts.get(item.name) ?? 0) + item.quantity)
    }
    favoriteCounts.set(customerId, itemCounts)

    const paymentMap = paymentCounts.get(customerId) ?? new Map<string, number>()
    paymentMap.set(order.paymentMethod, (paymentMap.get(order.paymentMethod) ?? 0) + 1)
    paymentCounts.set(customerId, paymentMap)
  }

  return Array.from(customerMap.values())
    .map((customer) => {
      const favoriteItem = Array.from(favoriteCounts.get(customer.id)?.entries() ?? [])
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? customer.favoriteItem
      const preferredPaymentMethod = Array.from(paymentCounts.get(customer.id)?.entries() ?? [])
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? customer.preferredPaymentMethod
      const averageSpendCents = customer.visits > 0 ? Math.round(customer.totalSpendCents / customer.visits) : 0
      return {
        ...customer,
        favoriteItem,
        preferredPaymentMethod,
        averageSpendCents,
        tier: tierFor(customer.visits, customer.totalSpendCents),
      }
    })
    .sort((a, b) => {
      if (b.totalSpendCents !== a.totalSpendCents) {
        return b.totalSpendCents - a.totalSpendCents
      }
      return b.visits - a.visits
    })
}

function delta(current: number, previous: number) {
  if (range.value === 'all' || previous === 0) {
    return null
  }

  const percentage = ((current - previous) / previous) * 100
  return {
    value: `${Math.abs(percentage).toFixed(1)}%`,
    positive: percentage >= 0,
  }
}

const bounds = computed(() => getBounds(range.value))
const periodOrders = computed(() => store.orders.filter((order) => inBounds(order, bounds.value.start, bounds.value.end)))
const priorOrders = computed(() =>
  range.value === 'all'
    ? []
    : store.orders.filter((order) => inBounds(order, bounds.value.prevStart, bounds.value.prevEnd)),
)

const customerProfiles = computed(() => buildProfiles(periodOrders.value))
const previousCustomerProfiles = computed(() => buildProfiles(priorOrders.value))

const filteredCustomers = computed(() => {
  const needle = searchQuery.value.trim().toLowerCase()

  return customerProfiles.value.filter((customer) => {
    if (tierFilter.value !== 'all' && customer.tier !== tierFilter.value) {
      return false
    }

    if (!needle) {
      return true
    }

    return (
      customer.name.toLowerCase().includes(needle)
      || customer.favoriteItem.toLowerCase().includes(needle)
      || customer.preferredPaymentMethod.toLowerCase().includes(needle)
    )
  })
})

const totalCustomers = computed(() => customerProfiles.value.length)
const previousTotalCustomers = computed(() => previousCustomerProfiles.value.length)
const activeRepeatCustomers = computed(() => customerProfiles.value.filter((customer) => customer.visits > 1).length)
const previousActiveRepeatCustomers = computed(() => previousCustomerProfiles.value.filter((customer) => customer.visits > 1).length)
const totalCustomerRevenue = computed(() => customerProfiles.value.reduce((sum, customer) => sum + customer.totalSpendCents, 0))
const averageLifetimeValue = computed(() =>
  totalCustomers.value > 0 ? Math.round(totalCustomerRevenue.value / totalCustomers.value) : 0,
)
const previousAverageLifetimeValue = computed(() => {
  const total = previousCustomerProfiles.value.reduce((sum, customer) => sum + customer.totalSpendCents, 0)
  return previousTotalCustomers.value > 0 ? Math.round(total / previousTotalCustomers.value) : 0
})
const repeatRate = computed(() =>
  totalCustomers.value > 0 ? (activeRepeatCustomers.value / totalCustomers.value) * 100 : 0,
)
const previousRepeatRate = computed(() =>
  previousTotalCustomers.value > 0 ? (previousActiveRepeatCustomers.value / previousTotalCustomers.value) * 100 : 0,
)

const tierBreakdown = computed(() => {
  const tiers: CustomerTier[] = ['VIP', 'Regular', 'Occasional', 'New']
  return tiers.map((tier) => {
    const count = customerProfiles.value.filter((customer) => customer.tier === tier).length
    const percentage = totalCustomers.value > 0 ? Math.round((count / totalCustomers.value) * 100) : 0
    return { tier, count, percentage }
  })
})

const topCustomers = computed(() => customerProfiles.value.slice(0, 5))
const recentCustomerOrders = computed(() =>
  periodOrders.value
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8)
    .map((order) => {
      const customerId = inferCustomerKey(order)
      return {
        id: order.id,
        ticketNumber: order.ticketNumber,
        customerName: inferCustomerName(customerId),
        amount: order.totalCents,
        createdAt: order.createdAt,
      }
    }),
)

const rangeCaption = computed(() => {
  const formatter = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
  if (range.value === 'today') {
    return formatter.format(now)
  }

  const endForCaption = new Date(bounds.value.end.getTime() - 86400000)
  return `${formatter.format(bounds.value.start)} - ${formatter.format(endForCaption)}`
})

const previousRangeCaption = computed(() => {
  if (range.value === 'all') {
    return ''
  }

  const formatter = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' })
  if (range.value === 'today') {
    return `vs ${formatter.format(bounds.value.prevStart)}`
  }

  const endForCaption = new Date(bounds.value.prevEnd.getTime() - 86400000)
  return `vs ${formatter.format(bounds.value.prevStart)} - ${formatter.format(endForCaption)}`
})
</script>

<template>
  <div class="customers-page">
    <section class="customers-header">
      <div>
        <h1 class="customers-title">Customers</h1>
        <p class="customers-copy">
          Customer records are currently inferred from order history patterns so you can still monitor loyalty,
          return traffic, and spend trends before a full CRM lands.
        </p>
      </div>

      <div class="customers-toolbar">
        <div class="customers-range">
          <span class="customers-range__text">{{ rangeCaption }}</span>
          <RangeSelector v-model="range" />
        </div>
      </div>
    </section>

    <section class="customers-kpis">
      <MetricCard
        label="Active Customers"
        :value="totalCustomers.toLocaleString('en-PH')"
        :delta="delta(totalCustomers, previousTotalCustomers)"
        :compare-label="previousRangeCaption"
      />
      <MetricCard
        label="Repeat Customers"
        :value="activeRepeatCustomers.toLocaleString('en-PH')"
        :delta="delta(activeRepeatCustomers, previousActiveRepeatCustomers)"
        :compare-label="previousRangeCaption"
      />
      <MetricCard
        label="Repeat Rate"
        :value="`${repeatRate.toFixed(1)}%`"
        :delta="delta(repeatRate, previousRepeatRate)"
        :compare-label="previousRangeCaption"
      />
      <MetricCard
        label="Average Lifetime Value"
        :value="formatCurrency(averageLifetimeValue)"
        :delta="delta(averageLifetimeValue, previousAverageLifetimeValue)"
        :compare-label="previousRangeCaption"
      />
    </section>

    <section class="customers-grid">
      <ChartCard title="Customer Mix" summary="Breakdown of inferred customer tiers for the selected period.">
        <div class="customers-tier-list">
          <div v-for="segment in tierBreakdown" :key="segment.tier" class="customers-tier-row">
            <div class="customers-tier-row__head">
              <span class="customers-tier-row__label">
                <Star :size="14" />
                {{ segment.tier }}
              </span>
              <span class="customers-tier-row__stats">{{ segment.count }} · {{ segment.percentage }}%</span>
            </div>
            <div class="customers-tier-row__track">
              <div class="customers-tier-row__fill" :style="{ width: `${segment.percentage}%` }" />
            </div>
          </div>
        </div>
      </ChartCard>

      <ChartCard title="Top Customers" summary="Highest-spending inferred customer profiles in the selected period.">
        <div class="customers-leaderboard">
          <div v-for="customer in topCustomers" :key="customer.id" class="customers-leaderboard__row">
            <div class="customers-avatar">{{ customer.initials }}</div>
            <div class="customers-leaderboard__body">
              <strong>{{ customer.name }}</strong>
              <p>{{ customer.visits }} visits · Favorite: {{ customer.favoriteItem }}</p>
            </div>
            <div class="customers-leaderboard__amount">{{ formatCurrency(customer.totalSpendCents) }}</div>
          </div>
        </div>
      </ChartCard>
    </section>

    <section class="customers-grid customers-grid--tables">
      <ChartCard title="Customer Directory" summary="Search and review inferred customer profiles from order history.">
        <div class="customers-table__head">
          <div class="customers-table__filters">
            <label class="customers-search">
              <Search :size="16" />
              <input v-model="searchQuery" type="search" placeholder="Search customer, item, or payment method" />
            </label>

            <select v-model="tierFilter" class="sheet-input customers-select" aria-label="Filter customers by tier">
              <option value="all">All tiers</option>
              <option value="VIP">VIP</option>
              <option value="Regular">Regular</option>
              <option value="Occasional">Occasional</option>
              <option value="New">New</option>
            </select>
          </div>

          <span class="customers-table__note">Based on {{ periodOrders.length }} orders in the selected range.</span>
        </div>

        <table v-if="filteredCustomers.length" class="customers-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Visits</th>
              <th>Avg Spend</th>
              <th>Favorite Item</th>
              <th>Last Visit</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="customer in filteredCustomers" :key="customer.id">
              <td>
                <div class="customers-table__identity">
                  <span class="customers-avatar customers-avatar--sm">{{ customer.initials }}</span>
                  <div>
                    <strong>{{ customer.name }}</strong>
                    <p>{{ customer.tier }} · {{ customer.preferredPaymentMethod }}</p>
                  </div>
                </div>
              </td>
              <td>{{ customer.visits }}</td>
              <td>{{ formatCurrency(customer.averageSpendCents) }}</td>
              <td>{{ customer.favoriteItem }}</td>
              <td>{{ formatCompactDate(customer.lastVisitAt) }}</td>
            </tr>
          </tbody>
        </table>

        <div v-else class="customers-empty">
          No customer profiles match the current filters.
        </div>
      </ChartCard>

      <ChartCard title="Recent Customer Activity" summary="Latest inferred customer activity based on recent orders.">
        <div class="customers-activity">
          <div v-for="order in recentCustomerOrders" :key="order.id" class="customers-activity__row">
            <div class="customers-activity__icon">
              <Users :size="16" />
            </div>
            <div class="customers-activity__body">
              <strong>{{ order.customerName }}</strong>
              <p>Ticket #{{ order.ticketNumber }} · {{ formatCompactDate(order.createdAt) }}</p>
            </div>
            <div class="customers-activity__meta">
              <span>{{ formatCurrency(order.amount) }}</span>
            </div>
          </div>

          <RouterLink class="customers-link" to="/orders">
            <span>View orders</span>
            <ChevronRight :size="14" />
          </RouterLink>
        </div>
      </ChartCard>
    </section>
  </div>
</template>

<style scoped>
.customers-page {
  display: grid;
  gap: var(--space-5);
}

.customers-header,
.customers-kpis,
.customers-grid {
  display: grid;
  gap: var(--space-4);
}

.customers-header {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
}

.customers-title {
  margin: 0;
  font: var(--type-title1);
}

.customers-copy {
  max-width: 72ch;
  margin: var(--space-2) 0 0;
  color: var(--text-secondary);
}

.customers-toolbar,
.customers-range,
.customers-table__head,
.customers-link {
  display: flex;
  align-items: center;
}

.customers-range {
  gap: var(--space-3);
  justify-content: end;
  flex-wrap: wrap;
}

.customers-range__text,
.customers-table__note {
  color: var(--text-secondary);
  font: var(--type-caption);
}

.customers-kpis {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.customers-grid {
  grid-template-columns: 1.2fr 1fr;
}

.customers-grid--tables {
  grid-template-columns: 1.45fr 1fr;
}

.customers-tier-list,
.customers-leaderboard,
.customers-activity {
  display: grid;
  gap: var(--space-4);
}

.customers-tier-row {
  display: grid;
  gap: var(--space-2);
}

.customers-tier-row__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  font: var(--type-caption);
}

.customers-tier-row__label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-secondary);
}

.customers-tier-row__stats {
  color: var(--text-primary);
  font-weight: 600;
}

.customers-tier-row__track {
  height: 8px;
  border-radius: var(--radius-pill);
  background: var(--fill);
  overflow: hidden;
}

.customers-tier-row__fill {
  height: 100%;
  border-radius: var(--radius-pill);
  background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 55%, white));
}

.customers-leaderboard__row,
.customers-activity__row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.customers-avatar,
.customers-activity__icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: var(--fill);
  color: var(--accent);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  font: var(--type-subhead);
  font-weight: 700;
}

.customers-avatar--sm {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  font-size: 0.8rem;
}

.customers-leaderboard__body,
.customers-activity__body {
  flex: 1;
  min-width: 0;
}

.customers-leaderboard__body strong,
.customers-activity__body strong,
.customers-table__identity strong {
  display: block;
}

.customers-leaderboard__body p,
.customers-activity__body p,
.customers-table__identity p {
  margin: 4px 0 0;
  color: var(--text-secondary);
  font: var(--type-caption);
}

.customers-leaderboard__amount,
.customers-activity__meta span {
  font: var(--type-subhead);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.customers-table__head {
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.customers-table__filters {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.customers-search {
  min-width: min(100%, 320px);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 44px;
  padding: 0 var(--space-3);
  border: 1px solid var(--separator);
  border-radius: 14px;
  background: var(--bg-elevated);
  color: var(--text-secondary);
}

.customers-search input {
  width: 100%;
  border: none;
  background: transparent;
  outline: none;
  color: var(--text-primary);
}

.customers-select {
  min-width: 150px;
}

.customers-table {
  width: 100%;
  border-collapse: collapse;
}

.customers-table th,
.customers-table td {
  padding: 14px 0;
  border-bottom: 1px solid var(--separator);
  text-align: left;
}

.customers-table th {
  color: var(--text-tertiary);
  font: var(--type-caption);
  font-weight: 600;
}

.customers-table td {
  color: var(--text-primary);
  font: var(--type-subhead);
}

.customers-table__identity {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.customers-link {
  gap: 2px;
  color: var(--accent);
  text-decoration: none;
}

.customers-empty {
  padding: var(--space-6) var(--space-4);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--fill) 78%, transparent);
  color: var(--text-secondary);
  text-align: center;
}

@media (max-width: 1100px) {
  .customers-header,
  .customers-kpis,
  .customers-grid,
  .customers-grid--tables {
    grid-template-columns: 1fr;
  }

  .customers-range {
    justify-content: start;
  }
}

@media (max-width: 720px) {
  .customers-table__head,
  .customers-table__filters {
    flex-direction: column;
    align-items: stretch;
  }

  .customers-table {
    display: block;
    overflow-x: auto;
  }
}
</style>
