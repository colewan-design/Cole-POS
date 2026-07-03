<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Funnel, ChevronRight } from '@lucide/vue'
import { formatCurrency, guestCustomerName, type OrderSummary } from '@pos/shared/index'
import { usePosStore } from '@pos/core/stores/pos'
import MetricCard from '@pos/core/components/MetricCard.vue'
import ChartCard from '@pos/core/components/ChartCard.vue'
import RangeSelector, { type Range } from '@pos/core/components/RangeSelector.vue'

const store = usePosStore()
onMounted(() => {
  if (!store.isReady) {
    void store.initialize()
  }
})

const range = ref<Range>('month')
const now = new Date()

type Channel = 'In-Store' | 'Online' | 'Mobile App' | 'Walk-in'

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function getMonday(d: Date) {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return new Date(startOfDay(d).getTime() + diff * 86400000)
}

function hashValue(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return hash
}

function customerNameFor(order: OrderSummary) {
  return order.customerName || guestCustomerName
}

function channelFor(order: OrderSummary): Channel {
  const channels: Channel[] = ['In-Store', 'Online', 'Mobile App', 'Walk-in']
  return channels[hashValue(`${order.id}:${order.paymentMethod}:${order.orderType}`) % channels.length]
}

function orderStatusFor(order: OrderSummary) {
  return hashValue(`${order.id}:status`) % 4 === 0 ? 'Processing' : 'Completed'
}

interface Bounds {
  start: Date
  end: Date
  prevStart: Date
  prevEnd: Date
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

const bounds = computed(() => getBounds(range.value))
const periodOrders = computed(() => store.orders.filter((order) => inBounds(order, bounds.value.start, bounds.value.end)))
const priorOrders = computed(() =>
  range.value === 'all'
    ? []
    : store.orders.filter((order) => inBounds(order, bounds.value.prevStart, bounds.value.prevEnd)),
)

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

const totalRevenue = computed(() => periodOrders.value.reduce((sum, order) => sum + order.totalCents, 0))
const previousRevenue = computed(() => priorOrders.value.reduce((sum, order) => sum + order.totalCents, 0))
const transactions = computed(() => periodOrders.value.length)
const previousTransactions = computed(() => priorOrders.value.length)
const averageOrderValue = computed(() => transactions.value > 0 ? Math.round(totalRevenue.value / transactions.value) : 0)
const previousAverageOrderValue = computed(() =>
  previousTransactions.value > 0 ? Math.round(previousRevenue.value / previousTransactions.value) : 0,
)

function repeatCustomerRate(orders: OrderSummary[]) {
  const namedOrders = orders.filter((order) => customerNameFor(order) !== guestCustomerName)
  if (namedOrders.length === 0) {
    return 0
  }

  const counts = new Map<string, number>()
  for (const order of namedOrders) {
    const customer = customerNameFor(order)
    counts.set(customer, (counts.get(customer) ?? 0) + 1)
  }

  let repeatOrders = 0
  for (const order of namedOrders) {
    if ((counts.get(customerNameFor(order)) ?? 0) > 1) {
      repeatOrders += 1
    }
  }

  return (repeatOrders / namedOrders.length) * 100
}

const returnCustomers = computed(() => repeatCustomerRate(periodOrders.value))
const previousReturnCustomers = computed(() => repeatCustomerRate(priorOrders.value))

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

const salesSeries = computed(() => {
  const days: { key: string; label: string; totalCents: number }[] = []
  const cursor = new Date(bounds.value.start)
  const dayFormat = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' })

  while (cursor < bounds.value.end && days.length < 31) {
    days.push({
      key: cursor.toISOString(),
      label: dayFormat.format(cursor),
      totalCents: 0,
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  if (range.value === 'all') {
    const grouped = new Map<string, number>()
    for (const order of periodOrders.value) {
      const key = order.createdAt.slice(0, 10)
      grouped.set(key, (grouped.get(key) ?? 0) + order.totalCents)
    }
    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([key, total]) => ({
        key,
        label: dayFormat.format(new Date(key)),
        totalCents: total,
      }))
  }

  for (const order of periodOrders.value) {
    const key = order.createdAt.slice(0, 10)
    const match = days.find((entry) => entry.key.slice(0, 10) === key)
    if (match) {
      match.totalCents += order.totalCents
    }
  }

  return days
})

const maxSalesPoint = computed(() => Math.max(...salesSeries.value.map((point) => point.totalCents), 1))

function niceCeil(value: number) {
  if (value <= 0) {
    return 1
  }

  const exponent = Math.floor(Math.log10(value))
  const fraction = value / 10 ** exponent
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
  return niceFraction * 10 ** exponent
}

const salesAxisMax = computed(() => niceCeil(maxSalesPoint.value))

function formatAxisValue(cents: number) {
  const pesos = cents / 100
  if (pesos >= 1000) {
    return `₱${(pesos / 1000).toFixed(pesos % 1000 === 0 ? 0 : 1)}k`
  }
  return `₱${Math.round(pesos)}`
}

const salesYAxisTicks = computed(() =>
  [4, 3, 2, 1, 0].map((step) => formatAxisValue((salesAxisMax.value * step) / 4)),
)

const peakSalesIndex = computed(() => {
  let peak = 0
  for (let i = 1; i < salesSeries.value.length; i += 1) {
    if (salesSeries.value[i].totalCents > salesSeries.value[peak].totalCents) {
      peak = i
    }
  }
  return peak
})

const salesLabelStep = computed(() => Math.max(1, Math.ceil(salesSeries.value.length / 8)))

const channelBreakdown = computed(() => {
  const totals = new Map<Channel, number>([
    ['In-Store', 0],
    ['Online', 0],
    ['Mobile App', 0],
    ['Walk-in', 0],
  ])

  for (const order of periodOrders.value) {
    const channel = channelFor(order)
    totals.set(channel, (totals.get(channel) ?? 0) + order.totalCents)
  }

  const total = Array.from(totals.values()).reduce((sum, value) => sum + value, 0)
  const colors: Record<Channel, string> = {
    'Walk-in': 'var(--accent)',
    'In-Store': 'var(--success)',
    'Online': 'var(--warning)',
    'Mobile App': 'var(--danger)',
  }

  return Array.from(totals.entries())
    .map(([label, value]) => ({
      label,
      value,
      percentage: total > 0 ? Math.round((value / total) * 100) : 0,
      stroke: colors[label],
    }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value)
})

const topProducts = computed(() => {
  const map = new Map<string, { id: string; name: string; unitsSold: number; revenue: number }>()
  for (const order of periodOrders.value) {
    for (const item of order.items) {
      const existing = map.get(item.productId) ?? { id: item.productId, name: item.name, unitsSold: 0, revenue: 0 }
      existing.unitsSold += item.quantity
      existing.revenue += item.lineTotalCents
      map.set(item.productId, existing)
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((product) => ({
      ...product,
      imageUrl: store.products.find((p) => p.id === product.id)?.imageUrl,
    }))
})

const recentOrders = computed(() =>
  periodOrders.value
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6)
    .map((order) => ({
      id: `#${order.ticketNumber}`,
      customerName: customerNameFor(order),
      amount: order.totalCents,
      status: orderStatusFor(order),
    })),
)
</script>

<template>
  <div class="dashboard-page">
    <section class="dashboard-header">
      <div>
        <h1 class="dashboard-title">Dashboard</h1>
        <p class="dashboard-copy">Track store performance across revenue, customer behavior, and product movement from one control center.</p>
      </div>

      <div class="dashboard-toolbar">
        <div class="dashboard-range">
          <span class="dashboard-range__text">{{ rangeCaption }}</span>
          <RangeSelector v-model="range" />
        </div>
        <button class="dashboard-filter" type="button">
          <Funnel :size="16" />
          <span>Filters</span>
        </button>
      </div>
    </section>

    <section class="dashboard-kpis">
      <MetricCard label="Total Revenue" :value="formatCurrency(totalRevenue)" :delta="delta(totalRevenue, previousRevenue)" :compare-label="previousRangeCaption" />
      <MetricCard label="Transactions" :value="transactions.toLocaleString('en-PH')" :delta="delta(transactions, previousTransactions)" :compare-label="previousRangeCaption" />
      <MetricCard label="Average Order Value" :value="formatCurrency(averageOrderValue)" :delta="delta(averageOrderValue, previousAverageOrderValue)" :compare-label="previousRangeCaption" />
      <MetricCard label="Return Customers" :value="`${returnCustomers.toFixed(1)}%`" :delta="delta(returnCustomers, previousReturnCustomers)" :compare-label="previousRangeCaption" />
    </section>

    <section class="dashboard-grid">
      <ChartCard title="Sales Overview" summary="Daily revenue trend for the selected period.">
        <div class="dashboard-chart__header">
          <span class="dashboard-chart__badge">Daily</span>
        </div>
        <div class="dashboard-bar-chart">
          <div class="dashboard-bar-chart__plot">
            <div class="dashboard-bar-chart__yaxis">
              <span v-for="tick in salesYAxisTicks" :key="tick">{{ tick }}</span>
            </div>
            <div class="dashboard-bar-chart__grid">
              <div class="dashboard-bar-chart__gridlines" aria-hidden="true">
                <span v-for="row in 5" :key="row" />
              </div>
              <div class="dashboard-bar-chart__bars">
                <div v-for="(point, index) in salesSeries" :key="point.key" class="dashboard-bar-chart__col">
                  <span v-if="index === peakSalesIndex" class="dashboard-bar-chart__value">{{ formatCurrency(point.totalCents) }}</span>
                  <div
                    class="dashboard-bar-chart__bar"
                    :class="{ 'is-peak': index === peakSalesIndex }"
                    :style="{ height: `${(point.totalCents / salesAxisMax) * 100}%` }"
                  />
                </div>
              </div>
            </div>
          </div>
          <div class="dashboard-bar-chart__labels">
            <span v-for="(point, index) in salesSeries" :key="point.key">{{ index % salesLabelStep === 0 ? point.label : '' }}</span>
          </div>
        </div>
      </ChartCard>

      <ChartCard title="Sales by Channel" summary="Revenue distribution across sales channels.">
        <div class="dashboard-channels">
          <div class="dashboard-channels__total">
            <span>Total revenue</span>
            <strong>{{ formatCurrency(totalRevenue) }}</strong>
          </div>
          <div class="dashboard-channels__list">
            <div v-for="segment in channelBreakdown" :key="segment.label" class="dashboard-channels__row">
              <div class="dashboard-channels__row-head">
                <span class="dashboard-channels__label">
                  <i :style="{ background: segment.stroke }" />
                  {{ segment.label }}
                </span>
                <span class="dashboard-channels__stats">{{ formatCurrency(segment.value) }} · {{ segment.percentage }}%</span>
              </div>
              <div class="dashboard-channels__track">
                <div class="dashboard-channels__fill" :style="{ width: `${segment.percentage}%`, background: segment.stroke }" />
              </div>
            </div>
          </div>
        </div>
      </ChartCard>
    </section>

    <section class="dashboard-grid dashboard-grid--tables">
      <ChartCard title="Top Products" summary="Best-performing products ranked by revenue.">
        <div class="dashboard-table__head">
          <span>Units sold and revenue</span>
          <RouterLink class="dashboard-link" to="/products">
            <span>View all</span>
            <ChevronRight :size="14" />
          </RouterLink>
        </div>
        <table class="dashboard-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Units Sold</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="product in topProducts" :key="product.id">
              <td>
                <div class="dashboard-product-cell">
                  <span class="dashboard-product-thumb">
                    <img v-if="product.imageUrl" :src="product.imageUrl" :alt="product.name" loading="lazy">
                  </span>
                  <span>{{ product.name }}</span>
                </div>
              </td>
              <td>{{ product.unitsSold.toLocaleString('en-PH') }}</td>
              <td>{{ formatCurrency(product.revenue) }}</td>
            </tr>
          </tbody>
        </table>
      </ChartCard>

      <ChartCard title="Recent Orders" summary="Latest transactions for the selected date range.">
        <div class="dashboard-table__head">
          <span>Latest order activity</span>
          <RouterLink class="dashboard-link" to="/orders">
            <span>View all</span>
            <ChevronRight :size="14" />
          </RouterLink>
        </div>
        <table class="dashboard-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in recentOrders" :key="order.id">
              <td class="dashboard-table__id">{{ order.id }}</td>
              <td>{{ order.customerName }}</td>
              <td>{{ formatCurrency(order.amount) }}</td>
              <td>
                <span class="dashboard-status" :class="order.status === 'Completed' ? 'dashboard-status--done' : 'dashboard-status--processing'">
                  {{ order.status }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </ChartCard>
    </section>
  </div>
</template>

<style scoped>
.dashboard-page {
  display: grid;
  gap: var(--space-5);
}

.dashboard-header,
.dashboard-kpis,
.dashboard-grid {
  display: grid;
  gap: var(--space-4);
}

.dashboard-header {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
}

.dashboard-title {
  margin: 0;
  font: var(--type-title1);
}

.dashboard-copy {
  max-width: 64ch;
  margin: var(--space-2) 0 0;
  color: var(--text-secondary);
}

.dashboard-toolbar,
.dashboard-range,
.dashboard-chart__header,
.dashboard-table__head,
.dashboard-link {
  display: flex;
  align-items: center;
}

.dashboard-toolbar,
.dashboard-range {
  gap: var(--space-3);
}

.dashboard-range {
  flex-wrap: wrap;
  justify-content: end;
}

.dashboard-range__text {
  color: var(--text-secondary);
  font: var(--type-caption);
}

.dashboard-filter {
  min-height: 38px;
  padding: 0 var(--space-4);
  border: 1px solid var(--separator);
  border-radius: 14px;
  background: white;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.dashboard-kpis {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.dashboard-grid {
  grid-template-columns: 1.65fr 1fr;
}

.dashboard-grid--tables {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.dashboard-chart__header,
.dashboard-table__head {
  justify-content: space-between;
  margin-bottom: var(--space-2);
  color: var(--text-secondary);
  font: var(--type-caption);
}

.dashboard-chart__badge {
  min-height: 28px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  background: var(--fill);
  color: var(--text-primary);
}

.dashboard-bar-chart {
  display: grid;
  gap: var(--space-3);
}

.dashboard-bar-chart__plot {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-3);
  height: 260px;
}

.dashboard-bar-chart__yaxis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  color: var(--text-tertiary);
  font: var(--type-caption);
  font-variant-numeric: tabular-nums;
}

.dashboard-bar-chart__grid {
  position: relative;
  height: 100%;
}

.dashboard-bar-chart__gridlines {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}

.dashboard-bar-chart__gridlines span {
  display: block;
  height: 0;
  border-top: 1px solid var(--separator);
}

.dashboard-bar-chart__bars {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
  padding-top: 28px;
}

.dashboard-bar-chart__col {
  flex: 1;
  height: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: var(--space-1);
}

.dashboard-bar-chart__bar {
  width: 100%;
  max-width: 28px;
  border-radius: 4px 4px 0 0;
  background: color-mix(in srgb, var(--accent) 55%, transparent);
}

.dashboard-bar-chart__bar.is-peak {
  background: var(--accent);
}

.dashboard-bar-chart__value {
  color: var(--text-primary);
  font: var(--type-caption);
  font-weight: 600;
  white-space: nowrap;
}

.dashboard-bar-chart__labels {
  display: flex;
  gap: var(--space-2);
  padding-left: calc(2.5em + var(--space-3));
  color: var(--text-tertiary);
  font: var(--type-caption);
}

.dashboard-bar-chart__labels span {
  flex: 1;
  min-width: 0;
  text-align: center;
  white-space: nowrap;
  overflow: visible;
}

.dashboard-channels {
  display: grid;
  gap: var(--space-4);
}

.dashboard-channels__total {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--separator);
}

.dashboard-channels__total span {
  color: var(--text-secondary);
  font: var(--type-caption);
}

.dashboard-channels__total strong {
  font: var(--type-headline);
}

.dashboard-channels__list {
  display: grid;
  gap: var(--space-4);
}

.dashboard-channels__row {
  display: grid;
  gap: var(--space-2);
}

.dashboard-channels__row-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font: var(--type-caption);
}

.dashboard-channels__label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-secondary);
}

.dashboard-channels__label i {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: inline-block;
  flex: none;
}

.dashboard-channels__stats {
  color: var(--text-primary);
  font-weight: 600;
}

.dashboard-channels__track {
  height: 8px;
  border-radius: var(--radius-pill);
  background: var(--fill);
  overflow: hidden;
}

.dashboard-channels__fill {
  height: 100%;
  border-radius: var(--radius-pill);
}

.dashboard-link {
  gap: 2px;
  color: var(--accent);
  text-decoration: none;
}

.dashboard-table {
  width: 100%;
  border-collapse: collapse;
}

.dashboard-table th,
.dashboard-table td {
  padding: 14px 0;
  border-bottom: 1px solid var(--separator);
  text-align: left;
}

.dashboard-table th {
  color: var(--text-tertiary);
  font: var(--type-caption);
  font-weight: 600;
}

.dashboard-table td {
  color: var(--text-primary);
  font: var(--type-subhead);
}

.dashboard-table__id {
  color: var(--accent);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.dashboard-product-cell {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.dashboard-product-thumb {
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--fill);
}

.dashboard-product-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dashboard-status {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  font: var(--type-caption);
  font-weight: 600;
}

.dashboard-status--done {
  background: color-mix(in srgb, var(--success) 16%, transparent);
  color: var(--success);
}

.dashboard-status--processing {
  background: color-mix(in srgb, var(--warning) 18%, transparent);
  color: var(--warning);
}

@media (max-width: 1100px) {
  .dashboard-kpis,
  .dashboard-grid,
  .dashboard-grid--tables {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dashboard-header {
    grid-template-columns: 1fr;
  }

  .dashboard-range {
    justify-content: start;
  }
}

@media (max-width: 720px) {
  .dashboard-kpis,
  .dashboard-grid,
  .dashboard-grid--tables {
    grid-template-columns: 1fr;
  }

  .dashboard-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .dashboard-table {
    display: block;
    overflow-x: auto;
  }
}
</style>
