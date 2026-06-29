<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { OrderSummary } from '@pos/shared/index'
import { formatCurrency } from '@pos/shared/index'
import { usePosStore } from '@pos/core/stores/pos'
import MetricCard from '@pos/core/components/MetricCard.vue'
import ChartCard from '@pos/core/components/ChartCard.vue'
import RangeSelector, { type Range } from '@pos/core/components/RangeSelector.vue'

// ─── Store ─────────────────────────────────────────────────────────────────
const store = usePosStore()
onMounted(() => { if (!store.isReady) void store.initialize() })

// ─── Time range ─────────────────────────────────────────────────────────────
const range = ref<Range>('today')

// Snapshot "now" when the component mounts; navigating away/back resets it.
const now = new Date()

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function getMonday(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return new Date(startOfDay(d).getTime() + diff * 86_400_000)
}

interface Bounds { start: Date; end: Date; prevStart: Date; prevEnd: Date }

function getBounds(r: Range): Bounds {
  const today = startOfDay(now)
  switch (r) {
    case 'today': {
      const start = today
      const end = new Date(today.getTime() + 86_400_000)
      return { start, end, prevStart: new Date(start.getTime() - 86_400_000), prevEnd: start }
    }
    case 'week': {
      const start = getMonday(now)
      const end = new Date(start.getTime() + 7 * 86_400_000)
      return { start, end, prevStart: new Date(start.getTime() - 7 * 86_400_000), prevEnd: start }
    }
    case 'month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      const prevStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      return { start, end, prevStart, prevEnd: start }
    }
    case 'all': {
      const epoch = new Date(0)
      const far = new Date(8_640_000_000_000_000)
      return { start: epoch, end: far, prevStart: epoch, prevEnd: epoch }
    }
  }
}

function inBounds(o: OrderSummary, start: Date, end: Date): boolean {
  const d = new Date(o.createdAt)
  return d >= start && d < end
}

// ─── Range caption ──────────────────────────────────────────────────────────
const rangeCaption = computed<string>(() => {
  const locale = 'en-PH'
  switch (range.value) {
    case 'today':
      return new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', year: 'numeric' }).format(now)
    case 'week': {
      const mon = getMonday(now)
      const sun = new Date(mon.getTime() + 6 * 86_400_000)
      if (mon.getMonth() === sun.getMonth()) {
        const s = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(mon)
        const e = new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(sun)
        return `${s}–${e}, ${sun.getFullYear()}`
      }
      const s = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(mon)
      const e = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(sun)
      return `${s} – ${e}`
    }
    case 'month':
      return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(now)
    case 'all':
      return 'All time'
  }
})

// ─── Filtered orders ────────────────────────────────────────────────────────
const bounds = computed(() => getBounds(range.value))

const orders = computed(() =>
  store.orders.filter(o => inBounds(o, bounds.value.start, bounds.value.end)),
)

const prevOrders = computed(() =>
  range.value === 'all'
    ? []
    : store.orders.filter(o => inBounds(o, bounds.value.prevStart, bounds.value.prevEnd)),
)

// ─── KPIs ───────────────────────────────────────────────────────────────────
const grossSales    = computed(() => orders.value.reduce((s, o) => s + o.totalCents, 0))
const prevGrossSales = computed(() => prevOrders.value.reduce((s, o) => s + o.totalCents, 0))
const orderCount    = computed(() => orders.value.length)
const prevOrderCount = computed(() => prevOrders.value.length)
const taxCollected  = computed(() => orders.value.reduce((s, o) => s + o.taxCents, 0))

const avgOrderValue = computed(() =>
  orderCount.value > 0 ? Math.round(grossSales.value / orderCount.value) : 0,
)
const prevAvgOrderValue = computed(() =>
  prevOrders.value.length > 0 ? Math.round(prevGrossSales.value / prevOrders.value.length) : 0,
)

const itemsPerOrder = computed(() => {
  if (orderCount.value === 0) return 0
  const total = orders.value.reduce(
    (s, o) => s + o.items.reduce((is, i) => is + i.quantity, 0), 0,
  )
  return total / orderCount.value
})
const prevItemsPerOrder = computed(() => {
  if (prevOrders.value.length === 0) return 0
  const total = prevOrders.value.reduce(
    (s, o) => s + o.items.reduce((is, i) => is + i.quantity, 0), 0,
  )
  return total / prevOrders.value.length
})

function pctDelta(cur: number, prev: number): { value: string; positive: boolean } | null {
  if (range.value === 'all' || prev === 0) return null
  const pct = Math.round(((cur - prev) / prev) * 100)
  return { value: `${Math.abs(pct)}%`, positive: pct >= 0 }
}

// ─── Sync status ────────────────────────────────────────────────────────────
const syncLabel = computed(() => {
  const n = store.pendingAppEvents.length
  return n > 0 ? `Synced locally · ${n} pending` : 'Synced locally'
})

// ─── Chart 1: Payment mix donut ─────────────────────────────────────────────
const DONUT_R  = 36
const DONUT_CX = 50
const DONUT_CY = 50
const DONUT_C  = 2 * Math.PI * DONUT_R

const paymentCounts = computed(() => {
  const c = { cash: 0, card: 0, ewallet: 0 }
  for (const o of orders.value) c[o.paymentMethod]++
  return c
})

const paymentTotal = computed(
  () => paymentCounts.value.cash + paymentCounts.value.card + paymentCounts.value.ewallet,
)

interface DonutSeg {
  key: string; label: string; count: number
  strokeClass: string; dotClass: string
  dashArray: string; dashOffset: number
}

const donutSegments = computed<DonutSeg[]>(() => {
  const total = paymentTotal.value
  if (total === 0) return []
  const raw = [
    { key: 'cash',    label: 'Cash',     count: paymentCounts.value.cash,    strokeClass: 'dseg--cash',    dotClass: 'ddot--cash' },
    { key: 'card',    label: 'Card',     count: paymentCounts.value.card,    strokeClass: 'dseg--card',    dotClass: 'ddot--card' },
    { key: 'ewallet', label: 'E-wallet', count: paymentCounts.value.ewallet, strokeClass: 'dseg--ewallet', dotClass: 'ddot--ewallet' },
  ].filter(s => s.count > 0)

  const GAP = raw.length > 1 ? 1.5 : 0
  let cum = 0
  return raw.map(seg => {
    const len = Math.max(0, (seg.count / total) * DONUT_C - GAP)
    const offset = cum
    cum += (seg.count / total) * DONUT_C
    return { ...seg, dashArray: `${len} ${DONUT_C - len}`, dashOffset: -offset }
  })
})

const paymentSummary = computed(() => {
  const { cash, card, ewallet } = paymentCounts.value
  return `Payment mix: ${cash} cash, ${card} card, ${ewallet} e-wallet orders.`
})

// ─── Chart 2: Sales by category (horizontal bars) ───────────────────────────
const salesByCategory = computed(() => {
  const productMap = new Map(store.products.map(p => [p.id, p]))
  const totals = new Map<string, number>()
  for (const o of orders.value) {
    for (const item of o.items) {
      const catId = productMap.get(item.productId)?.categoryId ?? 'uncategorized'
      totals.set(catId, (totals.get(catId) ?? 0) + item.lineTotalCents)
    }
  }
  return store.categories
    .map(c => ({ id: c.id, name: c.name, totalCents: totals.get(c.id) ?? 0 }))
    .filter(c => c.totalCents > 0)
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, 7)
})

const maxCategoryCents = computed(() => salesByCategory.value[0]?.totalCents ?? 1)

const categorySummary = computed(() =>
  salesByCategory.value.length === 0
    ? 'No category sales data for this period.'
    : salesByCategory.value.map(c => `${c.name}: ${formatCurrency(c.totalCents)}`).join(', '),
)

// ─── Chart 3: Top products (ranked list) ────────────────────────────────────
const topProducts = computed(() => {
  const agg = new Map<string, { name: string; quantity: number; salesCents: number }>()
  for (const o of orders.value) {
    for (const item of o.items) {
      const cur = agg.get(item.productId) ?? { name: item.name, quantity: 0, salesCents: 0 }
      cur.quantity += item.quantity
      cur.salesCents += item.lineTotalCents
      agg.set(item.productId, cur)
    }
  }
  return [...agg.values()].sort((a, b) => b.salesCents - a.salesCents).slice(0, 5)
})

const maxProductSales = computed(() => topProducts.value[0]?.salesCents ?? 1)

const topProductsSummary = computed(() =>
  topProducts.value.length === 0
    ? 'No product sales data for this period.'
    : topProducts.value
        .map((p, i) => `#${i + 1} ${p.name}: ${p.quantity} sold, ${formatCurrency(p.salesCents)}`)
        .join('. '),
)

// ─── Chart 4: Hourly sales (SVG bar chart) ──────────────────────────────────
const CHART_H    = 72   // bar area height in SVG units
const CHART_TOTAL_H = 100
const BAR_W      = 8
const BAR_SLOT   = 12   // bar + gap
const CHART_W    = 24 * BAR_SLOT  // 288

const hourlySales = computed(() => {
  const buckets = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    label: h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`,
    totalCents: 0,
    orders: 0,
  }))
  for (const o of orders.value) {
    const h = new Date(o.createdAt).getHours()
    buckets[h].totalCents += o.totalCents
    buckets[h].orders++
  }
  return buckets
})

const maxHourlyCents = computed(() =>
  Math.max(...hourlySales.value.map(b => b.totalCents), 1),
)

const hasHourlyData = computed(() => hourlySales.value.some(b => b.orders > 0))

const hourlySummary = computed(() => {
  const active = hourlySales.value.filter(b => b.orders > 0)
  if (active.length === 0) return 'No hourly sales data for this period.'
  const peak = active.reduce((m, b) => b.totalCents > m.totalCents ? b : m)
  return `Peak hour: ${peak.label} with ${formatCurrency(peak.totalCents)} in sales across ${active.length} active hours.`
})
</script>

<template>
  <div class="analytics-page">

    <!-- ── Header ─────────────────────────────────────────────────────────── -->
    <div class="analytics-header">
      <div class="analytics-header__top">
        <h1 class="analytics-title">Analytics</h1>
        <span class="sync-chip">{{ syncLabel }}</span>
      </div>
      <div class="analytics-header__controls">
        <RangeSelector v-model="range" />
        <p class="analytics-caption">{{ rangeCaption }}</p>
      </div>
    </div>

    <!-- ── KPI row ────────────────────────────────────────────────────────── -->
    <div class="kpi-grid">
      <MetricCard
        label="Gross sales"
        :value="formatCurrency(grossSales)"
        :delta="pctDelta(grossSales, prevGrossSales)"
      />
      <MetricCard
        label="Orders"
        :value="String(orderCount)"
        :delta="pctDelta(orderCount, prevOrderCount)"
      />
      <MetricCard
        label="Average order value"
        :value="formatCurrency(avgOrderValue)"
        :delta="pctDelta(avgOrderValue, prevAvgOrderValue)"
      />
      <MetricCard
        label="Tax collected"
        :value="formatCurrency(taxCollected)"
      />
      <MetricCard
        label="Items per order"
        :value="itemsPerOrder > 0 ? itemsPerOrder.toFixed(1) : '—'"
        :delta="pctDelta(itemsPerOrder, prevItemsPerOrder)"
      />
    </div>

    <!-- ── Charts grid ────────────────────────────────────────────────────── -->
    <div class="charts-grid">

      <!-- Chart 1: Payment mix -->
      <ChartCard title="Payment mix" :summary="paymentSummary">
        <div v-if="paymentTotal === 0" class="empty-state">
          No payments recorded in this period.
        </div>
        <div v-else class="payment-mix">
          <svg
            class="donut-chart"
            :viewBox="`0 0 100 100`"
            aria-hidden="true"
          >
            <circle
              :cx="DONUT_CX" :cy="DONUT_CY" :r="DONUT_R"
              fill="none" class="donut-bg" stroke-width="14"
            />
            <circle
              v-for="seg in donutSegments"
              :key="seg.key"
              :cx="DONUT_CX" :cy="DONUT_CY" :r="DONUT_R"
              fill="none"
              stroke-linecap="butt"
              stroke-width="14"
              :class="seg.strokeClass"
              :stroke-dasharray="seg.dashArray"
              :stroke-dashoffset="seg.dashOffset"
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div class="payment-legend">
            <div v-for="seg in donutSegments" :key="seg.key" class="legend-row">
              <span class="legend-dot" :class="seg.dotClass" />
              <span class="legend-label">{{ seg.label }}</span>
              <strong class="legend-count">{{ seg.count }}</strong>
            </div>
          </div>
        </div>
      </ChartCard>

      <!-- Chart 2: Sales by category -->
      <ChartCard title="Sales by category" :summary="categorySummary">
        <div v-if="salesByCategory.length === 0" class="empty-state">
          Category sales appear after the first completed order.
        </div>
        <div v-else class="hbar-list">
          <div v-for="cat in salesByCategory" :key="cat.id" class="hbar-row">
            <span class="hbar-label">{{ cat.name }}</span>
            <div class="hbar-track" role="presentation">
              <div
                class="hbar-fill"
                :style="{ width: `${(cat.totalCents / maxCategoryCents) * 100}%` }"
              />
            </div>
            <span class="hbar-value">{{ formatCurrency(cat.totalCents) }}</span>
          </div>
        </div>
      </ChartCard>

      <!-- Chart 3: Top products -->
      <ChartCard title="Top products" :summary="topProductsSummary">
        <div v-if="topProducts.length === 0" class="empty-state">
          Complete a few orders to surface top sellers.
        </div>
        <ol v-else class="product-rank-list" role="list">
          <li v-for="(product, i) in topProducts" :key="product.name" class="product-rank-row">
            <span class="rank-num" aria-hidden="true">{{ i + 1 }}</span>
            <div class="rank-meta">
              <p class="rank-name">{{ product.name }}</p>
              <p class="rank-sub">{{ product.quantity }} sold</p>
              <div class="rank-bar-track" role="presentation">
                <div
                  class="rank-bar-fill"
                  :style="{ width: `${(product.salesCents / maxProductSales) * 100}%` }"
                />
              </div>
            </div>
            <span class="rank-revenue">{{ formatCurrency(product.salesCents) }}</span>
          </li>
        </ol>
      </ChartCard>

      <!-- Chart 4: Hourly sales -->
      <ChartCard title="Hourly sales" :summary="hourlySummary" class="chart-card--wide">
        <div v-if="!hasHourlyData" class="empty-state">
          Hourly data appears once orders are recorded.
        </div>
        <svg
          v-else
          class="hourly-chart"
          :viewBox="`0 0 ${CHART_W} ${CHART_TOTAL_H}`"
          aria-hidden="true"
          preserveAspectRatio="xMidYMid meet"
        >
          <!-- bars -->
          <rect
            v-for="b in hourlySales"
            :key="b.hour"
            class="hour-bar"
            :class="{ 'hour-bar--active': b.totalCents > 0 }"
            :x="b.hour * BAR_SLOT + 2"
            :y="CHART_H - (b.totalCents / maxHourlyCents) * CHART_H"
            :width="BAR_W"
            :height="(b.totalCents / maxHourlyCents) * CHART_H"
            rx="2"
          />
          <!-- baseline -->
          <line
            x1="0" :y1="CHART_H" :x2="CHART_W" :y2="CHART_H"
            class="hour-axis"
          />
          <!-- hour labels every 6 h -->
          <text
            v-for="h in [0, 6, 12, 18]"
            :key="h"
            class="hour-label"
            :x="h * BAR_SLOT + BAR_W / 2 + 2"
            :y="CHART_TOTAL_H - 4"
            text-anchor="middle"
          >{{ hourlySales[h].label }}</text>
        </svg>
      </ChartCard>

    </div>
  </div>
</template>

<style scoped>
/* ── Page layout ────────────────────────────────────────────────────────── */
.analytics-page {
  display: grid;
  gap: var(--space-6);
  padding-bottom: var(--space-10);
}

/* ── Header ─────────────────────────────────────────────────────────────── */
.analytics-header {
  display: grid;
  gap: var(--space-3);
}

.analytics-header__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.analytics-title {
  margin: 0;
  font: var(--type-title1);
  color: var(--text-primary);
  letter-spacing: -0.015em;
}

.sync-chip {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  background: var(--fill);
  color: var(--text-tertiary);
  font: var(--type-caption);
  white-space: nowrap;
}

.analytics-header__controls {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.analytics-caption {
  margin: 0;
  color: var(--text-tertiary);
  font: var(--type-caption);
}

/* ── KPI grid ────────────────────────────────────────────────────────────── */
.kpi-grid {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

/* ── Charts grid ─────────────────────────────────────────────────────────── */
.charts-grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}

/* ── Payment mix donut ───────────────────────────────────────────────────── */
.payment-mix {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  flex-wrap: wrap;
}

.donut-chart {
  flex: none;
  width: 100px;
  height: 100px;
}

.donut-bg          { stroke: var(--fill); }
.dseg--cash        { stroke: var(--success); }
.dseg--card        { stroke: var(--accent); }
.dseg--ewallet     { stroke: var(--warning); }

.payment-legend {
  flex: 1;
  display: grid;
  gap: var(--space-3);
  min-width: 120px;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.legend-dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-pill);
}

.ddot--cash        { background: var(--success); }
.ddot--card        { background: var(--accent); }
.ddot--ewallet     { background: var(--warning); }

.legend-label {
  flex: 1;
  color: var(--text-secondary);
  font: var(--type-subhead);
}

.legend-count {
  color: var(--text-primary);
  font: var(--type-subhead);
  font-variant-numeric: tabular-nums;
}

/* ── Horizontal bar chart (categories) ──────────────────────────────────── */
.hbar-list {
  display: grid;
  gap: var(--space-3);
}

.hbar-row {
  display: grid;
  grid-template-columns: 88px 1fr auto;
  align-items: center;
  gap: var(--space-3);
}

.hbar-label {
  color: var(--text-secondary);
  font: var(--type-caption);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hbar-track {
  height: 6px;
  border-radius: var(--radius-pill);
  background: var(--fill);
  overflow: hidden;
}

.hbar-fill {
  height: 100%;
  border-radius: var(--radius-pill);
  background: var(--accent);
  transition: width var(--dur-base) var(--ease-out);
}

.hbar-value {
  color: var(--text-primary);
  font: var(--type-caption);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* ── Top products ranked list ────────────────────────────────────────────── */
.product-rank-list {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.product-rank-row {
  display: grid;
  grid-template-columns: 20px 1fr auto;
  align-items: start;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-bottom: 0.5px solid var(--separator);
}

.product-rank-row:last-child { border-bottom: none; }

.rank-num {
  padding-top: 2px;
  color: var(--text-tertiary);
  font: var(--type-caption);
  font-variant-numeric: tabular-nums;
}

.rank-meta {
  display: grid;
  gap: var(--space-1);
}

.rank-name {
  margin: 0;
  font: var(--type-subhead);
  font-weight: 600;
  color: var(--text-primary);
}

.rank-sub {
  margin: 0;
  color: var(--text-secondary);
  font: var(--type-caption);
}

.rank-bar-track {
  height: 4px;
  border-radius: var(--radius-pill);
  background: var(--fill);
  overflow: hidden;
  margin-top: var(--space-1);
}

.rank-bar-fill {
  height: 100%;
  border-radius: var(--radius-pill);
  background: var(--accent);
  transition: width var(--dur-base) var(--ease-out);
}

.rank-revenue {
  padding-top: 2px;
  color: var(--text-primary);
  font: var(--type-subhead);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* ── Hourly bar chart ────────────────────────────────────────────────────── */
.hourly-chart {
  width: 100%;
  height: auto;
  display: block;
  overflow: visible;
}

.hour-bar         { fill: var(--fill); }
.hour-bar--active { fill: var(--accent); opacity: 0.85; }

.hour-axis {
  stroke: var(--separator);
  stroke-width: 0.5;
}

.hour-label {
  fill: var(--text-tertiary);
  font-size: 7px;
  font-family: var(--font-sans);
}

/* ── Responsive ──────────────────────────────────────────────────────────── */
@media (max-width: 720px) {
  .analytics-header__controls { flex-direction: column; align-items: flex-start; }
  .charts-grid { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .hbar-fill,
  .rank-bar-fill { transition: none; }
}
</style>
