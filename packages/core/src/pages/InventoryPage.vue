<script setup lang="ts">
import { AlertTriangle, Check, Package, Search, TrendingDown, X } from '@lucide/vue'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { usePosStore } from '@pos/core/stores/pos'
import SelectMenu from '@pos/core/components/SelectMenu.vue'
import { formatCurrency, type Product } from '@pos/shared/index'

const store = usePosStore()
onMounted(() => {
  if (!store.isReady) void store.initialize()
})

// ── Filters ───────────────────────────────────────────────────────────────────
const searchQuery = ref('')
const statusFilter = ref<'all' | 'healthy' | 'low' | 'oos'>('all')
const sortBy = ref<'name' | 'stock-asc' | 'stock-desc' | 'category'>('stock-asc')
const activeTab = ref<'all' | 'alerts'>('all')

// ── Virtual list ──────────────────────────────────────────────────────────────
const ROW_H = 68
const BUFFER_PX = ROW_H * 8

const scrollEl = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const viewportH = ref(500)
let ro: ResizeObserver | null = null

onMounted(() => {
  if (scrollEl.value) {
    viewportH.value = scrollEl.value.clientHeight
    ro = new ResizeObserver(([entry]) => { viewportH.value = entry.contentRect.height })
    ro.observe(scrollEl.value)
  }
})
onUnmounted(() => ro?.disconnect())

function onScroll(e: Event) {
  scrollTop.value = (e.target as HTMLElement).scrollTop
}

watch([searchQuery, statusFilter, sortBy, activeTab], () => {
  nextTick(() => {
    if (scrollEl.value) scrollEl.value.scrollTop = 0
    scrollTop.value = 0
  })
})

// ── Stock helpers ─────────────────────────────────────────────────────────────
function isTracked(p: Product) {
  return p.stockQty !== undefined
}

function stockStatus(p: Product): 'healthy' | 'low' | 'oos' | 'untracked' {
  if (p.stockQty === undefined) return 'untracked'
  if (p.stockQty === 0) return 'oos'
  if (p.stockQty <= (p.lowStockThreshold ?? 5)) return 'low'
  return 'healthy'
}

// ── Computed rows ─────────────────────────────────────────────────────────────
const modeProducts = computed(() =>
  store.products.filter((p) => p.businessModes.includes(store.settings.businessMode)),
)

const filteredProducts = computed(() => {
  const needle = searchQuery.value.trim().toLowerCase()

  let arr = modeProducts.value.filter((p) => {
    if (activeTab.value === 'alerts') {
      const s = stockStatus(p)
      if (s !== 'low' && s !== 'oos') return false
    } else {
      if (statusFilter.value === 'healthy' && stockStatus(p) !== 'healthy') return false
      if (statusFilter.value === 'low' && stockStatus(p) !== 'low') return false
      if (statusFilter.value === 'oos' && stockStatus(p) !== 'oos') return false
    }
    if (needle && !p.name.toLowerCase().includes(needle) && !p.sku.toLowerCase().includes(needle)) return false
    return true
  })

  switch (sortBy.value) {
    case 'name':
      arr = arr.slice().sort((a, b) => a.name.localeCompare(b.name))
      break
    case 'stock-asc':
      arr = arr.slice().sort((a, b) => {
        const aQ = a.stockQty ?? Infinity
        const bQ = b.stockQty ?? Infinity
        return aQ - bQ
      })
      break
    case 'stock-desc':
      arr = arr.slice().sort((a, b) => {
        const aQ = a.stockQty ?? -Infinity
        const bQ = b.stockQty ?? -Infinity
        return bQ - aQ
      })
      break
    case 'category':
      arr = arr.slice().sort((a, b) => {
        const aCat = store.categories.find((c) => c.id === a.categoryId)?.name ?? a.categoryId
        const bCat = store.categories.find((c) => c.id === b.categoryId)?.name ?? b.categoryId
        return aCat.localeCompare(bCat) || a.name.localeCompare(b.name)
      })
      break
  }
  return arr
})

const totalHeight = computed(() => filteredProducts.value.length * ROW_H)

const visibleItems = computed(() => {
  const top = Math.max(0, scrollTop.value - BUFFER_PX)
  const bottom = scrollTop.value + viewportH.value + BUFFER_PX
  return filteredProducts.value
    .map((p, i) => ({ product: p, y: i * ROW_H }))
    .filter(({ y }) => y + ROW_H > top && y < bottom)
})

// ── KPI metrics ───────────────────────────────────────────────────────────────
const tracked = computed(() => modeProducts.value.filter(isTracked))
const healthyCount = computed(() => tracked.value.filter((p) => stockStatus(p) === 'healthy').length)
const lowCount = computed(() => tracked.value.filter((p) => stockStatus(p) === 'low').length)
const oosCount = computed(() => tracked.value.filter((p) => stockStatus(p) === 'oos').length)
const alertCount = computed(() => lowCount.value + oosCount.value)

// ── Thumbnails ────────────────────────────────────────────────────────────────
const failedImages = ref<Record<string, boolean>>({})
const THUMB_PALETTE = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55', '#5AC8FA', '#FF6B35', '#00C7BE']

function thumbColor(categoryId: string): string {
  const i = store.categories.findIndex((c) => c.id === categoryId)
  return THUMB_PALETTE[(i < 0 ? 0 : i) % THUMB_PALETTE.length]
}

// ── Restock ───────────────────────────────────────────────────────────────────
const restockingId = ref<string | null>(null)
const restockQty = ref(1)

function openRestock(id: string, e: Event) {
  e.stopPropagation()
  restockingId.value = id
  restockQty.value = 1
}

function cancelRestock(e: Event) {
  e.stopPropagation()
  restockingId.value = null
}

async function submitRestock(id: string, e: Event) {
  e.stopPropagation()
  if (restockQty.value > 0) await store.restockProduct(id, restockQty.value)
  restockingId.value = null
}

// ── Set exact stock ───────────────────────────────────────────────────────────
const settingId = ref<string | null>(null)
const setQty = ref(0)

function openSet(product: Product, e: Event) {
  e.stopPropagation()
  settingId.value = product.id
  setQty.value = product.stockQty ?? 0
}

function cancelSet(e: Event) {
  e.stopPropagation()
  settingId.value = null
}

async function submitSet(product: Product, e: Event) {
  e.stopPropagation()
  const qty = Math.max(0, setQty.value)
  await store.editProduct({ ...product, stockQty: qty, outOfStock: qty === 0 })
  settingId.value = null
}
</script>

<template>
  <div class="inv-page">
    <!-- ── Page header ──────────────────────────────────────────────────────── -->
    <div class="inv-header">
      <div>
        <h1 class="inv-title">Inventory</h1>
        <p class="inv-copy">Watch stock movement, reorder pressure, and low-stock risk in real time.</p>
      </div>
    </div>

    <!-- ── KPI metrics ─────────────────────────────────────────────────────── -->
    <section class="inv-kpis">
      <div class="inv-kpi">
        <span class="inv-kpi__icon inv-kpi__icon--blue"><Package :size="18" /></span>
        <div>
          <p class="inv-kpi__label">Total Tracked</p>
          <strong class="inv-kpi__value">{{ tracked.length }}</strong>
        </div>
      </div>
      <div class="inv-kpi">
        <span class="inv-kpi__icon inv-kpi__icon--green"><Check :size="18" /></span>
        <div>
          <p class="inv-kpi__label">Healthy</p>
          <strong class="inv-kpi__value inv-kpi__value--success">{{ healthyCount }}</strong>
        </div>
      </div>
      <div class="inv-kpi">
        <span class="inv-kpi__icon inv-kpi__icon--orange"><TrendingDown :size="18" /></span>
        <div>
          <p class="inv-kpi__label">Low Stock</p>
          <strong class="inv-kpi__value inv-kpi__value--warning">{{ lowCount }}</strong>
        </div>
      </div>
      <div class="inv-kpi">
        <span class="inv-kpi__icon inv-kpi__icon--red"><AlertTriangle :size="18" /></span>
        <div>
          <p class="inv-kpi__label">Out of Stock</p>
          <strong class="inv-kpi__value inv-kpi__value--danger">{{ oosCount }}</strong>
        </div>
      </div>
    </section>

    <!-- ── Tabs ─────────────────────────────────────────────────────────────── -->
    <div class="category-tabs">
      <button class="category-tab" :class="{ active: activeTab === 'all' }" type="button" @click="activeTab = 'all'">
        All Products
        <span class="category-tab__count">{{ modeProducts.length }}</span>
      </button>
      <button class="category-tab" :class="{ active: activeTab === 'alerts' }" type="button" @click="activeTab = 'alerts'">
        Stock Alerts
        <span class="category-tab__count" :class="{ 'inv-alert-count': alertCount > 0 }">{{ alertCount }}</span>
      </button>
    </div>

    <!-- ── Toolbar ──────────────────────────────────────────────────────────── -->
    <div class="inv-toolbar">
      <label class="psearch inv-toolbar__search">
        <Search :size="16" class="psearch__icon" aria-hidden="true" />
        <input
          v-model="searchQuery"
          class="psearch__input"
          type="search"
          placeholder="Search products or SKU…"
          aria-label="Search inventory"
        />
        <button
          v-if="searchQuery"
          class="psearch__clear icon-button"
          type="button"
          aria-label="Clear search"
          @click="searchQuery = ''"
        ><X :size="14" /></button>
      </label>

      <div class="inv-toolbar__controls">
        <template v-if="activeTab === 'all'">
          <div class="segmented-control" role="group" aria-label="Filter by stock status">
            <button
              v-for="opt in [
                { value: 'all', label: 'All' },
                { value: 'healthy', label: 'Healthy' },
                { value: 'low', label: 'Low' },
                { value: 'oos', label: 'Out of stock' },
              ]"
              :key="opt.value"
              class="segment-button"
              :class="{ active: statusFilter === opt.value }"
              type="button"
              @click="statusFilter = opt.value as typeof statusFilter"
            >{{ opt.label }}</button>
          </div>
        </template>

        <SelectMenu
          v-model="sortBy"
          label="Sort by"
          :options="[
            { value: 'stock-asc',  label: 'Stock: low → high' },
            { value: 'stock-desc', label: 'Stock: high → low' },
            { value: 'name',       label: 'Name A–Z' },
            { value: 'category',   label: 'Category' },
          ]"
        />
      </div>
    </div>

    <!-- ── Empty state ─────────────────────────────────────────────────────── -->
    <div v-if="filteredProducts.length === 0" class="empty-state">
      <template v-if="activeTab === 'alerts'">
        All tracked products have healthy stock levels.
      </template>
      <template v-else>
        No products match your search or filter.
      </template>
    </div>

    <!-- ── Virtualized list ─────────────────────────────────────────────────── -->
    <div
      v-else
      ref="scrollEl"
      class="inv-list surface-panel"
      @scroll.passive="onScroll"
    >
      <div class="inv-list__inner" :style="{ height: totalHeight + 'px' }">
        <div
          v-for="{ product, y } in visibleItems"
          :key="product.id"
          class="inv-row"
          :class="{
            'inv-row--oos': stockStatus(product) === 'oos',
            'inv-row--low': stockStatus(product) === 'low',
          }"
          :style="{ top: y + 'px' }"
        >
          <!-- Thumbnail -->
          <div class="inv-row__thumb" :style="{ '--thumb-c': thumbColor(product.categoryId) }">
            <img
              v-if="product.imageUrl && !failedImages[product.id]"
              :src="product.imageUrl"
              :alt="product.name"
              loading="lazy"
              @error="failedImages[product.id] = true"
            />
            <span v-else class="inv-row__initial">{{ product.name.charAt(0).toUpperCase() }}</span>
          </div>

          <!-- Body -->
          <div class="inv-row__body">
            <p class="inv-row__name">{{ product.name }}</p>
            <div class="inv-row__meta">
              <span class="inv-row__sku">{{ product.sku }}</span>
              <span class="inv-row__category">{{ store.categories.find((c) => c.id === product.categoryId)?.name }}</span>
            </div>
          </div>

          <!-- Stock level -->
          <div class="inv-row__stock">
            <template v-if="product.stockQty !== undefined">
              <span
                class="inv-stock-badge"
                :class="{
                  'inv-stock-badge--oos': stockStatus(product) === 'oos',
                  'inv-stock-badge--low': stockStatus(product) === 'low',
                  'inv-stock-badge--ok': stockStatus(product) === 'healthy',
                }"
              >
                {{ product.stockQty === 0 ? 'Out of stock' : `${product.stockQty} in stock` }}
              </span>
              <span v-if="product.lowStockThreshold !== undefined" class="inv-row__threshold">
                threshold {{ product.lowStockThreshold }}
              </span>
            </template>
            <span v-else class="inv-row__untracked">Not tracked</span>
          </div>

          <!-- Price -->
          <p class="inv-row__price">{{ formatCurrency(product.priceCents) }}</p>

          <!-- Actions -->
          <div class="inv-row__actions" @click.stop @keydown.stop>
            <!-- Restock inline -->
            <template v-if="product.stockQty !== undefined && restockingId === product.id">
              <input
                v-model.number="restockQty"
                class="inv-row__qty-input"
                type="number"
                min="1"
                step="1"
                aria-label="Add stock quantity"
                @keydown.enter.prevent="submitRestock(product.id, $event)"
                @keydown.escape.prevent="cancelRestock($event)"
              />
              <button class="segment-button inv-row__action-btn" type="button" @click="submitRestock(product.id, $event)">
                <Check :size="13" />
                Add
              </button>
              <button class="icon-button icon-button--sm" type="button" aria-label="Cancel" @click="cancelRestock($event)">
                <X :size="13" />
              </button>
            </template>

            <!-- Set exact stock inline -->
            <template v-else-if="product.stockQty !== undefined && settingId === product.id">
              <input
                v-model.number="setQty"
                class="inv-row__qty-input"
                type="number"
                min="0"
                step="1"
                aria-label="Set stock quantity"
                @keydown.enter.prevent="submitSet(product, $event)"
                @keydown.escape.prevent="cancelSet($event)"
              />
              <button class="segment-button inv-row__action-btn" type="button" @click="submitSet(product, $event)">
                <Check :size="13" />
                Set
              </button>
              <button class="icon-button icon-button--sm" type="button" aria-label="Cancel" @click="cancelSet($event)">
                <X :size="13" />
              </button>
            </template>

            <!-- Default action buttons -->
            <template v-else-if="product.stockQty !== undefined">
              <button
                class="segment-button inv-row__action-btn"
                type="button"
                @click="openRestock(product.id, $event)"
              >+ Restock</button>
              <button
                class="segment-button inv-row__action-btn"
                type="button"
                @click="openSet(product, $event)"
              >Set qty</button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inv-page {
  display: grid;
  gap: var(--space-5);
  padding: var(--space-4) 0 var(--space-8);
}

.inv-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--space-4);
}

.inv-title {
  margin: 0;
  font: var(--type-title1);
}

.inv-copy {
  max-width: 64ch;
  margin: var(--space-2) 0 0;
  color: var(--text-secondary);
}

/* ── KPI metrics ────────────────────────────────────────────────────────────── */

.inv-kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-4);
}

.inv-kpi {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--bg-elevated) 94%, transparent);
}

.inv-kpi__icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
}

.inv-kpi__icon--blue  { background: color-mix(in srgb, var(--accent)   14%, transparent); color: var(--accent); }
.inv-kpi__icon--green { background: color-mix(in srgb, var(--success)  14%, transparent); color: var(--success); }
.inv-kpi__icon--orange{ background: color-mix(in srgb, var(--warning)  14%, transparent); color: var(--warning); }
.inv-kpi__icon--red   { background: color-mix(in srgb, var(--danger)   14%, transparent); color: var(--danger); }

.inv-kpi__label {
  margin: 0 0 2px;
  color: var(--text-secondary);
  font: var(--type-caption);
}

.inv-kpi__value {
  font: var(--type-title2);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}

.inv-kpi__value--success { color: var(--success); }
.inv-kpi__value--warning { color: var(--warning); }
.inv-kpi__value--danger  { color: var(--danger); }

/* Alert count badge */
.inv-alert-count {
  background: color-mix(in srgb, var(--warning) 18%, transparent);
  color: var(--warning);
}

/* ── Toolbar ────────────────────────────────────────────────────────────────── */

.inv-toolbar {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.inv-toolbar__search {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: 44px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  background: var(--fill);
  cursor: text;
}

.inv-toolbar__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

/* ── Virtualized list ───────────────────────────────────────────────────────── */

.inv-list {
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
  height: clamp(280px, calc(100svh - 380px), 900px);
  border-radius: var(--radius-xl);
}

.inv-list__inner {
  position: relative;
}

/* ── Inventory row ──────────────────────────────────────────────────────────── */

.inv-row {
  position: absolute;
  left: 0;
  right: 0;
  height: 68px;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 0 var(--space-4);
  border-bottom: 0.5px solid var(--separator);
  transition: background var(--dur-fast) var(--ease-out);
}

.inv-row:hover {
  background: var(--fill);
}

.inv-row--oos {
  background: color-mix(in srgb, var(--danger) 5%, transparent);
}

.inv-row--oos:hover {
  background: color-mix(in srgb, var(--danger) 9%, transparent);
}

.inv-row--low {
  background: color-mix(in srgb, var(--warning) 5%, transparent);
}

.inv-row--low:hover {
  background: color-mix(in srgb, var(--warning) 9%, transparent);
}

/* Thumbnail */
.inv-row__thumb {
  flex: none;
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: color-mix(in srgb, var(--thumb-c, var(--accent)) 14%, var(--bg-elevated));
}

.inv-row__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.inv-row__initial {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font: 600 1rem/1 var(--font-sans);
  color: var(--thumb-c, var(--accent));
}

/* Body */
.inv-row__body {
  flex: 1;
  min-width: 0;
}

.inv-row__name {
  margin: 0 0 3px;
  font: var(--type-subhead);
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.inv-row__meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.inv-row__sku {
  color: var(--text-tertiary);
  font: var(--type-caption);
  font-variant-numeric: tabular-nums;
}

.inv-row__category {
  color: var(--text-secondary);
  font: var(--type-caption);
}

/* Stock level area */
.inv-row__stock {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  min-width: 120px;
  flex: none;
}

.inv-stock-badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  font: var(--type-caption);
  font-weight: 600;
  white-space: nowrap;
}

.inv-stock-badge--ok  { background: color-mix(in srgb, var(--success) 14%, transparent); color: var(--success); }
.inv-stock-badge--low { background: color-mix(in srgb, var(--warning) 16%, transparent); color: var(--warning); }
.inv-stock-badge--oos { background: color-mix(in srgb, var(--danger)  14%, transparent); color: var(--danger); }

.inv-row__threshold {
  color: var(--text-tertiary);
  font: var(--type-caption);
  white-space: nowrap;
}

.inv-row__untracked {
  color: var(--text-tertiary);
  font: var(--type-caption);
  font-style: italic;
}

/* Price */
.inv-row__price {
  flex: none;
  min-width: 80px;
  margin: 0;
  text-align: right;
  font: var(--type-subhead);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary);
}

/* Actions */
.inv-row__actions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  flex-shrink: 0;
}

.inv-row__action-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 12px;
  height: 30px;
  min-height: 30px;
  padding: 0 var(--space-2);
}

.inv-row__qty-input {
  width: 60px;
  height: 30px;
  padding: 0 var(--space-2);
  border: 1px solid var(--separator);
  border-radius: var(--radius-sm);
  font-size: 13px;
  background: var(--bg-elevated);
  color: var(--text-primary);
  color-scheme: inherit;
  text-align: center;
  outline: none;
}

.inv-row__qty-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 16%, transparent);
}

/* ── Responsive ─────────────────────────────────────────────────────────────── */

@media (max-width: 1100px) {
  .inv-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .inv-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .inv-row__price {
    display: none;
  }

  .inv-list {
    height: clamp(280px, calc(100svh - 320px), 700px);
  }
}

@media (max-width: 480px) {
  .inv-kpis {
    grid-template-columns: 1fr;
  }

  .inv-row__stock {
    min-width: 90px;
  }

  .inv-row__actions {
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
  }
}
</style>
