<script setup lang="ts">
import { ArrowRight, CreditCard, Search, Wallet } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import AutocompleteSelect from '@pos/core/components/AutocompleteSelect.vue'
import ChartCard from '@pos/core/components/ChartCard.vue'
import MetricCard from '@pos/core/components/MetricCard.vue'
import RangeSelector, { type Range } from '@pos/core/components/RangeSelector.vue'
import { usePosStore } from '@pos/core/stores/pos'
import { businessModeLabel, formatCompactDate, formatCurrency, type OrderSummary } from '@pos/shared/index'

const store = usePosStore()

onMounted(() => {
  if (!store.isReady) {
    void store.initialize()
  }
})

const paymentFilterOptions: { value: 'all' | 'cash' | 'card' | 'ewallet'; label: string }[] = [
  { value: 'all',     label: 'All payments' },
  { value: 'cash',    label: 'Cash' },
  { value: 'card',    label: 'Card' },
  { value: 'ewallet', label: 'E-wallet' },
]

const modeFilterOptions: { value: 'all' | 'coffee-shop' | 'grocery' | 'restaurant' | 'nail-salon'; label: string }[] = [
  { value: 'all',         label: 'All modes' },
  { value: 'coffee-shop', label: 'Coffee shop' },
  { value: 'grocery',     label: 'Grocery' },
  { value: 'restaurant',  label: 'Restaurant' },
  { value: 'nail-salon',  label: 'Nail salon' },
]

const range = ref<Range>('week')
const paymentFilter = ref<'all' | 'cash' | 'card' | 'ewallet'>('all')
const modeFilter = ref<'all' | 'coffee-shop' | 'grocery' | 'restaurant' | 'nail-salon'>('all')
const searchQuery = ref('')
const now = new Date()

interface Bounds {
  start: Date
  end: Date
  prevStart: Date
  prevEnd: Date
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
const periodOrders = computed(() =>
  store.orders.filter((order) => inBounds(order, bounds.value.start, bounds.value.end)),
)
const previousOrders = computed(() =>
  range.value === 'all'
    ? []
    : store.orders.filter((order) => inBounds(order, bounds.value.prevStart, bounds.value.prevEnd)),
)

const filteredOrders = computed(() => {
  const needle = searchQuery.value.trim().toLowerCase()

  return periodOrders.value.filter((order) => {
    if (paymentFilter.value !== 'all' && order.paymentMethod !== paymentFilter.value) {
      return false
    }

    if (modeFilter.value !== 'all' && order.businessMode !== modeFilter.value) {
      return false
    }

    if (!needle) {
      return true
    }

    return (
      order.ticketNumber.toLowerCase().includes(needle)
      || order.items.some((item) => item.name.toLowerCase().includes(needle))
      || order.paymentMethod.toLowerCase().includes(needle)
    )
  })
})

const grossSales = computed(() => filteredOrders.value.reduce((sum, order) => sum + order.totalCents, 0))
const previousGrossSales = computed(() => previousOrders.value.reduce((sum, order) => sum + order.totalCents, 0))
const orderCount = computed(() => filteredOrders.value.length)
const previousOrderCount = computed(() => previousOrders.value.length)
const averageTicket = computed(() => orderCount.value > 0 ? Math.round(grossSales.value / orderCount.value) : 0)
const previousAverageTicket = computed(() =>
  previousOrders.value.length > 0
    ? Math.round(previousGrossSales.value / previousOrders.value.length)
    : 0,
)
const cashRevenue = computed(() =>
  filteredOrders.value
    .filter((order) => order.paymentMethod === 'cash')
    .reduce((sum, order) => sum + order.totalCents, 0),
)
const digitalRevenue = computed(() =>
  filteredOrders.value
    .filter((order) => order.paymentMethod !== 'cash')
    .reduce((sum, order) => sum + order.totalCents, 0),
)

const paymentMix = computed(() => {
  const total = grossSales.value || 1
  const breakdown = [
    {
      key: 'cash',
      label: 'Cash',
      value: filteredOrders.value.filter((order) => order.paymentMethod === 'cash').reduce((sum, order) => sum + order.totalCents, 0),
      className: 'sales-payment__fill--cash',
    },
    {
      key: 'card',
      label: 'Card',
      value: filteredOrders.value.filter((order) => order.paymentMethod === 'card').reduce((sum, order) => sum + order.totalCents, 0),
      className: 'sales-payment__fill--card',
    },
    {
      key: 'ewallet',
      label: 'E-wallet',
      value: filteredOrders.value.filter((order) => order.paymentMethod === 'ewallet').reduce((sum, order) => sum + order.totalCents, 0),
      className: 'sales-payment__fill--ewallet',
    },
  ]

  return breakdown
    .filter((entry) => entry.value > 0)
    .map((entry) => ({
      ...entry,
      percentage: Math.round((entry.value / total) * 100),
    }))
})

const modeBreakdown = computed(() => {
  const modes = ['coffee-shop', 'grocery', 'restaurant', 'nail-salon'] as const
  const total = grossSales.value || 1

  return modes
    .map((mode) => {
      const orders = filteredOrders.value.filter((order) => order.businessMode === mode)
      const revenue = orders.reduce((sum, order) => sum + order.totalCents, 0)
      return {
        mode,
        label: businessModeLabel(mode),
        orders: orders.length,
        revenue,
        share: Math.round((revenue / total) * 100),
      }
    })
    .filter((entry) => entry.orders > 0)
    .sort((a, b) => b.revenue - a.revenue)
})

const hourlyRows = computed(() => {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`,
    revenue: 0,
    orders: 0,
  }))

  for (const order of filteredOrders.value) {
    const hour = new Date(order.createdAt).getHours()
    buckets[hour].revenue += order.totalCents
    buckets[hour].orders += 1
  }

  return buckets
    .filter((bucket) => bucket.orders > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)
})

const topHourRevenue = computed(() => hourlyRows.value[0]?.revenue ?? 1)

const recentTickets = computed(() =>
  filteredOrders.value
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8),
)

const rangeCaption = computed(() => {
  const formatter = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
  if (range.value === 'today') {
    return formatter.format(now)
  }

  const endForCaption = new Date(bounds.value.end.getTime() - 86400000)
  return `${formatter.format(bounds.value.start)} - ${formatter.format(endForCaption)}`
})
</script>

<template>
  <div class="sales-page">
    <section class="sales-header">
      <div>
        <h1 class="sales-title">Sales</h1>
        <p class="sales-copy">
          Stay on top of revenue flow, payment mix, store-mode performance, and current ticket activity without
          dropping into the deeper analytics view.
        </p>
      </div>

      <div class="sales-toolbar">
        <div class="sales-range">
          <span class="sales-range__text">{{ rangeCaption }}</span>
          <RangeSelector v-model="range" />
        </div>
      </div>
    </section>

    <section class="sales-kpis">
      <MetricCard label="Gross Sales" :value="formatCurrency(grossSales)" :delta="delta(grossSales, previousGrossSales)" />
      <MetricCard label="Orders" :value="orderCount.toLocaleString('en-PH')" :delta="delta(orderCount, previousOrderCount)" />
      <MetricCard label="Average Ticket" :value="formatCurrency(averageTicket)" :delta="delta(averageTicket, previousAverageTicket)" />
      <MetricCard label="Cash / Digital" :value="`${formatCurrency(cashRevenue)} / ${formatCurrency(digitalRevenue)}`" />
    </section>

    <section class="sales-grid">
      <ChartCard title="Payment Mix" summary="Revenue share by payment method in the selected sales view.">
        <div v-if="paymentMix.length === 0" class="empty-state">
          No sales yet in this range.
        </div>
        <div v-else class="sales-payment">
          <div v-for="entry in paymentMix" :key="entry.key" class="sales-payment__row">
            <div class="sales-payment__head">
              <span class="sales-payment__label">
                <component :is="entry.key === 'cash' ? Wallet : CreditCard" :size="14" />
                {{ entry.label }}
              </span>
              <span class="sales-payment__value">{{ formatCurrency(entry.value) }} · {{ entry.percentage }}%</span>
            </div>
            <div class="sales-payment__track">
              <div class="sales-payment__fill" :class="entry.className" :style="{ width: `${entry.percentage}%` }" />
            </div>
          </div>
        </div>
      </ChartCard>

      <ChartCard title="Business Mode Performance" summary="Revenue and order volume by business mode.">
        <div v-if="modeBreakdown.length === 0" class="empty-state">
          No matching business-mode sales in this view.
        </div>
        <div v-else class="sales-modes">
          <div v-for="entry in modeBreakdown" :key="entry.mode" class="sales-modes__row">
            <div>
              <strong>{{ entry.label }}</strong>
              <p>{{ entry.orders }} orders · {{ entry.share }}% of sales</p>
            </div>
            <div class="sales-modes__meta">{{ formatCurrency(entry.revenue) }}</div>
          </div>
        </div>
      </ChartCard>
    </section>

    <section class="sales-grid sales-grid--bottom">
      <ChartCard title="Peak Selling Hours" summary="Highest-revenue hours from the selected sales view.">
        <div v-if="hourlyRows.length === 0" class="empty-state">
          Hourly trends appear after completed orders.
        </div>
        <div v-else class="sales-hours">
          <div v-for="row in hourlyRows" :key="row.hour" class="sales-hours__row">
            <div class="sales-hours__head">
              <span>{{ row.label }}</span>
              <span>{{ row.orders }} orders</span>
            </div>
            <div class="sales-hours__bar">
              <div class="sales-hours__fill" :style="{ width: `${(row.revenue / topHourRevenue) * 100}%` }" />
            </div>
            <strong>{{ formatCurrency(row.revenue) }}</strong>
          </div>
        </div>
      </ChartCard>

      <ChartCard title="Recent Tickets" summary="Latest tickets in the current sales view.">
        <div class="sales-table__head">
          <div class="sales-filters">
            <label class="sales-search">
              <Search :size="16" />
              <input v-model="searchQuery" type="search" placeholder="Search ticket, item, or payment method" />
            </label>

            <AutocompleteSelect
              v-model="paymentFilter"
              class="sales-select"
              label="Filter by payment method"
              :options="paymentFilterOptions"
            />

            <AutocompleteSelect
              v-model="modeFilter"
              class="sales-select"
              label="Filter by business mode"
              :options="modeFilterOptions"
            />
          </div>
        </div>

        <div v-if="recentTickets.length === 0" class="empty-state">
          No tickets match the current sales filters.
        </div>
        <div v-else class="sales-tickets">
          <article v-for="order in recentTickets" :key="order.id" class="sales-ticket">
            <div class="sales-ticket__main">
              <div>
                <strong>Ticket {{ order.ticketNumber }}</strong>
                <p>{{ formatCompactDate(order.createdAt) }} · {{ businessModeLabel(order.businessMode) }}</p>
              </div>
              <span class="sales-ticket__amount">{{ formatCurrency(order.totalCents) }}</span>
            </div>

            <div class="sales-ticket__meta">
              <span class="sales-ticket__payment">{{ order.paymentMethod }}</span>
              <span>{{ order.items.map((item) => `${item.quantity}x ${item.name}`).join(', ') }}</span>
            </div>
          </article>
        </div>
      </ChartCard>
    </section>

    <RouterLink class="sales-link" to="/orders">
      <span>Open full order history</span>
      <ArrowRight :size="15" />
    </RouterLink>
  </div>
</template>

<style scoped>
.sales-page {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-5);
}

.sales-header,
.sales-kpis,
.sales-grid {
  display: grid;
  gap: var(--space-4);
}

.sales-header {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
}

.sales-title {
  margin: 0;
  font: var(--type-title1);
}

.sales-copy {
  max-width: 70ch;
  margin: var(--space-2) 0 0;
  color: var(--text-secondary);
}

.sales-toolbar,
.sales-range,
.sales-payment__head,
.sales-table__head,
.sales-filters,
.sales-link,
.sales-ticket__main,
.sales-ticket__meta,
.sales-hours__head {
  display: flex;
  align-items: center;
}

.sales-range {
  gap: var(--space-3);
  justify-content: end;
  flex-wrap: wrap;
}

.sales-range__text {
  color: var(--text-secondary);
  font: var(--type-caption);
}

.sales-kpis {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.sales-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.sales-grid--bottom {
  grid-template-columns: 0.9fr 1.1fr;
}

.sales-payment,
.sales-modes,
.sales-hours,
.sales-tickets {
  display: grid;
  gap: var(--space-4);
}

.sales-payment__row,
.sales-modes__row,
.sales-hours__row,
.sales-ticket {
  display: grid;
  gap: var(--space-2);
}

.sales-payment__head,
.sales-modes__row,
.sales-hours__head,
.sales-ticket__main {
  justify-content: space-between;
  gap: var(--space-3);
}

.sales-payment__label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-secondary);
}

.sales-payment__value,
.sales-modes__meta,
.sales-hours__row strong,
.sales-ticket__amount {
  font: var(--type-subhead);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.sales-payment__track,
.sales-hours__bar {
  height: 8px;
  border-radius: var(--radius-pill);
  background: var(--fill);
  overflow: hidden;
}

.sales-payment__fill,
.sales-hours__fill {
  height: 100%;
  border-radius: var(--radius-pill);
}

.sales-payment__fill--cash {
  background: var(--success);
}

.sales-payment__fill--card {
  background: var(--accent);
}

.sales-payment__fill--ewallet {
  background: var(--warning);
}

.sales-modes__row {
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--separator);
}

.sales-modes__row:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.sales-modes__row p,
.sales-ticket p {
  margin: 4px 0 0;
  color: var(--text-secondary);
  font: var(--type-caption);
}

.sales-hours__head span {
  color: var(--text-secondary);
  font: var(--type-caption);
}

.sales-hours__fill {
  background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 55%, white));
}

.sales-search {
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

.sales-search input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-primary);
}

.sales-filters {
  gap: var(--space-3);
  flex-wrap: wrap;
  width: 100%;
}

.sales-select {
  width: 100%;
  min-width: 150px;
}

.sales-ticket {
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--separator);
}

.sales-ticket:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.sales-ticket__meta {
  gap: var(--space-3);
  flex-wrap: wrap;
  color: var(--text-secondary);
  font: var(--type-caption);
}

.sales-ticket__payment {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  background: var(--fill);
  color: var(--text-primary);
}

.sales-link {
  justify-self: flex-start;
  gap: var(--space-2);
  color: var(--accent);
  text-decoration: none;
}

@media (max-width: 1100px) {
  .sales-header,
  .sales-kpis,
  .sales-grid,
  .sales-grid--bottom {
    grid-template-columns: minmax(0, 1fr);
  }

  .sales-range {
    justify-content: start;
  }
}

@media (max-width: 720px) {
  .sales-copy {
    display: none;
  }

  .sales-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .sales-table__head,
  .sales-ticket__main,
  .sales-ticket__meta {
    flex-direction: column;
    align-items: stretch;
  }

  .sales-filters {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .sales-search,
  .sales-select {
    min-width: 0;
    width: 100%;
  }

  .sales-search {
    grid-column: 1 / -1;
  }
}
</style>
