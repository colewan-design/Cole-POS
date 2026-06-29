<script setup lang="ts">
import { Check, Pencil, Plus, Search, Trash2, X } from '@lucide/vue'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import ProductSheet from '@pos/core/components/ProductSheet.vue'
import SelectMenu from '@pos/core/components/SelectMenu.vue'
import ToggleSwitch from '@pos/core/components/ToggleSwitch.vue'
import { usePosStore } from '@pos/core/stores/pos'
import { formatCurrency, type BusinessMode, type Category, type Product } from '@pos/shared/index'

const store = usePosStore()

// ── Tabs ──────────────────────────────────────────────────────────────────────
const activeTab = ref<'products' | 'categories'>('products')

// ── Filters ───────────────────────────────────────────────────────────────────
const modeFilter = ref<BusinessMode | 'all'>('all')
const searchQuery = ref('')
const sortBy = ref<'name' | 'price' | 'low-stock' | 'recently-added'>('name')
const availabilityFilter = ref<'all' | 'active' | 'inactive'>('all')

// ── Virtual list ──────────────────────────────────────────────────────────────
const HEADER_H = 44
const ROW_H = 68
const BUFFER_PX = ROW_H * 6

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

watch([searchQuery, modeFilter, availabilityFilter, sortBy], () => {
  nextTick(() => {
    if (scrollEl.value) scrollEl.value.scrollTop = 0
    scrollTop.value = 0
  })
})

// ── Filtered + sorted + grouped ───────────────────────────────────────────────
const processedProducts = computed(() => {
  const needle = searchQuery.value.trim().toLowerCase()
  let arr = store.products.filter((p) => {
    if (modeFilter.value !== 'all' && !p.businessModes.includes(modeFilter.value as BusinessMode)) return false
    if (availabilityFilter.value === 'active' && p.outOfStock) return false
    if (availabilityFilter.value === 'inactive' && !p.outOfStock) return false
    if (needle && !p.name.toLowerCase().includes(needle) && !p.sku.toLowerCase().includes(needle) && !p.barcode.includes(needle)) return false
    return true
  })

  switch (sortBy.value) {
    case 'name': arr = arr.slice().sort((a, b) => a.name.localeCompare(b.name)); break
    case 'price': arr = arr.slice().sort((a, b) => a.priceCents - b.priceCents); break
    case 'low-stock':
      arr = arr.slice().sort((a, b) => {
        const aQty = a.stockQty ?? Infinity
        const bQty = b.stockQty ?? Infinity
        return aQty - bQty
      })
      break
    case 'recently-added': arr = arr.slice().reverse(); break
  }
  return arr
})

const groupedProducts = computed(() => {
  const byId = new Map<string, Product[]>()
  for (const p of processedProducts.value) {
    const list = byId.get(p.categoryId) ?? []
    list.push(p)
    byId.set(p.categoryId, list)
  }
  const result: { category: Category; products: Product[] }[] = []
  for (const cat of store.categories) {
    const prods = byId.get(cat.id)
    if (prods?.length) result.push({ category: cat, products: prods })
  }
  for (const [id, prods] of byId) {
    if (!store.categories.find((c) => c.id === id))
      result.push({ category: { id, name: id }, products: prods })
  }
  return result
})

// Flat list with pre-computed positions
type VItem =
  | { type: 'header'; category: Category; count: number; y: number; h: number }
  | { type: 'row'; product: Product; y: number; h: number }

const flatItems = computed<VItem[]>(() => {
  const items: VItem[] = []
  let y = 0
  for (const { category, products } of groupedProducts.value) {
    items.push({ type: 'header', category, count: products.length, y, h: HEADER_H })
    y += HEADER_H
    for (const product of products) {
      items.push({ type: 'row', product, y, h: ROW_H })
      y += ROW_H
    }
  }
  return items
})

const totalHeight = computed(() => {
  const last = flatItems.value.at(-1)
  return last ? last.y + last.h : 0
})

const visibleItems = computed(() => {
  const top = Math.max(0, scrollTop.value - BUFFER_PX)
  const bottom = scrollTop.value + viewportH.value + BUFFER_PX
  return flatItems.value.filter((item) => item.y + item.h > top && item.y < bottom)
})

const stickyHeader = computed<(VItem & { type: 'header' }) | null>(() => {
  let current: (VItem & { type: 'header' }) | null = null
  for (const item of flatItems.value) {
    if (item.type === 'header' && item.y <= scrollTop.value) current = item
    else if (item.y > scrollTop.value) break
  }
  return current
})

// ── Multi-select ──────────────────────────────────────────────────────────────
const selectMode = ref(false)
const selectedIds = ref(new Set<string>())

function toggleSelectMode() {
  selectMode.value = !selectMode.value
  if (!selectMode.value) selectedIds.value = new Set()
}

function toggleSelect(id: string) {
  const next = new Set(selectedIds.value)
  next.has(id) ? next.delete(id) : next.add(id)
  selectedIds.value = next
}

let longPressTimer: ReturnType<typeof setTimeout> | null = null

function onRowPointerDown(product: Product) {
  if (selectMode.value) return
  longPressTimer = setTimeout(() => {
    selectMode.value = true
    selectedIds.value = new Set([product.id])
    if ('vibrate' in navigator) navigator.vibrate(40)
  }, 500)
}

function cancelLongPress() {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null }
}

async function bulkSetAvailability(available: boolean) {
  await Promise.all(
    [...selectedIds.value].map((id) => {
      const p = store.products.find((x) => x.id === id)
      return p ? store.editProduct({ ...p, outOfStock: !available }) : Promise.resolve()
    }),
  )
  selectedIds.value = new Set()
  selectMode.value = false
}

async function bulkDelete() {
  await Promise.all([...selectedIds.value].map((id) => store.removeProduct(id)))
  selectedIds.value = new Set()
  selectMode.value = false
}

// ── Row / sheet ───────────────────────────────────────────────────────────────
const sheetProduct = ref<Product | undefined>()
const sheetOpen = ref(false)

function openAdd() {
  sheetProduct.value = undefined
  sheetOpen.value = true
}

function onRowTap(product: Product) {
  cancelLongPress()
  if (selectMode.value) { toggleSelect(product.id); return }
  sheetProduct.value = product
  sheetOpen.value = true
}

function closeSheet() { sheetOpen.value = false }
function onSaved() { sheetOpen.value = false }

async function toggleAvailability(product: Product) {
  await store.editProduct({ ...product, outOfStock: !product.outOfStock })
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

// ── Thumbnails ────────────────────────────────────────────────────────────────
const failedImages = ref<Record<string, boolean>>({})

const THUMB_PALETTE = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55', '#5AC8FA', '#FF6B35', '#00C7BE']

function thumbColor(categoryId: string): string {
  const i = store.categories.findIndex((c) => c.id === categoryId)
  return THUMB_PALETTE[(i < 0 ? 0 : i) % THUMB_PALETTE.length]
}

function thumbInitial(name: string): string {
  return name.charAt(0).toUpperCase()
}

// ── Categories tab ────────────────────────────────────────────────────────────
const newCategoryName = ref('')
const addingCategory = ref(false)
const editingCategoryId = ref<string | null>(null)
const editingCategoryName = ref('')
const confirmDeleteCategoryId = ref<string | null>(null)

function productCountForCategory(id: string) {
  return store.products.filter((p) => p.categoryId === id).length
}

async function submitNewCategory() {
  const name = newCategoryName.value.trim()
  if (!name) return
  await store.createCategory(name)
  newCategoryName.value = ''
  addingCategory.value = false
}

function startEditCategory(cat: Category) {
  editingCategoryId.value = cat.id
  editingCategoryName.value = cat.name
}

async function submitEditCategory(cat: Category) {
  const name = editingCategoryName.value.trim()
  if (!name) return
  await store.editCategory({ ...cat, name })
  editingCategoryId.value = null
}

async function confirmDeleteCategory(id: string) {
  await store.removeCategory(id)
  confirmDeleteCategoryId.value = null
}
</script>

<template>
  <div class="products-page">
    <!-- ── Page header ──────────────────────────────────────────────────────── -->
    <div class="products-page__header">
      <div class="products-page__titleblock">
        <h1 class="products-page__title">Products</h1>
        <span class="products-page__count">{{ store.products.length }} products</span>
      </div>
      <button
        v-if="activeTab === 'products'"
        class="primary-button products-page__add-btn"
        type="button"
        @click="openAdd"
      >
        <Plus :size="16" aria-hidden="true" />
        <span class="products-page__add-label">Add product</span>
      </button>
    </div>

    <!-- ── Tabs ────────────────────────────────────────────────────────────── -->
    <div class="category-tabs">
      <button class="category-tab" :class="{ active: activeTab === 'products' }" type="button" @click="activeTab = 'products'">Products</button>
      <button class="category-tab" :class="{ active: activeTab === 'categories' }" type="button" @click="activeTab = 'categories'">Categories</button>
    </div>

    <!-- ══ Products tab ══════════════════════════════════════════════════════ -->
    <template v-if="activeTab === 'products'">
      <!-- Business mode chips -->
      <div class="segmented-control products-page__mode-filter" role="group" aria-label="Business mode">
        <button
          v-for="opt in [
            { value: 'all', label: 'All' },
            { value: 'coffee-shop', label: 'Coffee shop' },
            { value: 'grocery', label: 'Grocery' },
            { value: 'restaurant', label: 'Restaurant' },
          ]"
          :key="opt.value"
          class="segment-button"
          :class="{ active: modeFilter === opt.value }"
          type="button"
          @click="modeFilter = opt.value as typeof modeFilter"
        >{{ opt.label }}</button>
      </div>

      <!-- Toolbar: search + sort + availability + select mode -->
      <div class="ptoolbar">
        <label class="psearch">
          <Search :size="16" class="psearch__icon" aria-hidden="true" />
          <input
            v-model="searchQuery"
            class="psearch__input"
            type="search"
            placeholder="Search products, SKU, barcode…"
            aria-label="Search products"
          />
          <button
            v-if="searchQuery"
            class="psearch__clear icon-button"
            type="button"
            aria-label="Clear search"
            @click="searchQuery = ''"
          ><X :size="14" /></button>
        </label>

        <div class="ptoolbar__controls">
          <SelectMenu
            v-model="sortBy"
            label="Sort products by"
            :options="[
              { value: 'name',           label: 'Name' },
              { value: 'price',          label: 'Price' },
              { value: 'low-stock',      label: 'Low stock' },
              { value: 'recently-added', label: 'Recently added' },
            ]"
          />

          <div class="segmented-control" role="group" aria-label="Filter by availability">
            <button
              v-for="opt in [{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]"
              :key="opt.value"
              class="segment-button"
              :class="{ active: availabilityFilter === opt.value }"
              type="button"
              @click="availabilityFilter = opt.value as typeof availabilityFilter"
            >{{ opt.label }}</button>
          </div>

          <button
            class="segment-button"
            :class="{ active: selectMode }"
            type="button"
            :aria-pressed="selectMode"
            @click="toggleSelectMode"
          >Select</button>
        </div>
      </div>

      <!-- Bulk action bar -->
      <Transition name="bulk-bar">
        <div v-if="selectMode" class="bulk-bar" role="toolbar" aria-label="Bulk actions">
          <div class="bulk-bar__left">
            <span class="bulk-bar__count">{{ selectedIds.size }} selected</span>
            <button class="bulk-bar__link" type="button" @click="selectedIds = new Set(processedProducts.map((p) => p.id))">All</button>
            <button class="bulk-bar__link" type="button" @click="selectedIds = new Set()">None</button>
          </div>
          <div class="bulk-bar__actions">
            <button class="segment-button" type="button" :disabled="selectedIds.size === 0" @click="bulkSetAvailability(true)">Enable</button>
            <button class="segment-button" type="button" :disabled="selectedIds.size === 0" @click="bulkSetAvailability(false)">Disable</button>
            <button class="danger-button bulk-bar__delete" type="button" :disabled="selectedIds.size === 0" @click="bulkDelete">Delete</button>
          </div>
        </div>
      </Transition>

      <!-- Empty state -->
      <div v-if="flatItems.length === 0" class="empty-state">
        No products match your search.
      </div>

      <!-- ── Virtualized product list ────────────────────────────────────── -->
      <div
        v-else
        ref="scrollEl"
        class="plist surface-panel"
        @scroll.passive="onScroll"
      >
        <!-- Sticky section header overlay (zero-height anchor) -->
        <div class="plist__sticky-anchor" aria-hidden="true">
          <Transition name="section-swap">
            <div
              v-if="stickyHeader"
              :key="stickyHeader.category.id"
              class="psection-header psection-header--overlay"
            >
              <span class="psection-header__name">{{ stickyHeader.category.name }}</span>
              <span class="psection-header__count">{{ stickyHeader.count }}</span>
            </div>
          </Transition>
        </div>

        <!-- Scroll canvas -->
        <div class="plist__inner" :style="{ height: totalHeight + 'px' }">
          <template
            v-for="item in visibleItems"
            :key="item.type === 'header' ? 'h:' + item.category.id : 'r:' + item.product.id"
          >
            <!-- Section header -->
            <div
              v-if="item.type === 'header'"
              class="psection-header"
              :style="{ top: item.y + 'px' }"
              aria-hidden="true"
            >
              <span class="psection-header__name">{{ item.category.name }}</span>
              <span class="psection-header__count">{{ item.count }}</span>
            </div>

            <!-- Product row -->
            <div
              v-else
              class="p-row"
              :class="{
                'p-row--inactive': item.product.outOfStock,
                'p-row--selected': selectedIds.has(item.product.id),
              }"
              :style="{ top: item.y + 'px' }"
              role="button"
              tabindex="0"
              :aria-label="
                selectMode
                  ? `${selectedIds.has(item.product.id) ? 'Deselect' : 'Select'} ${item.product.name}`
                  : `Edit ${item.product.name}`
              "
              @click="onRowTap(item.product)"
              @keydown.enter.prevent="onRowTap(item.product)"
              @keydown.space.prevent="onRowTap(item.product)"
              @pointerdown="onRowPointerDown(item.product)"
              @pointerup="cancelLongPress"
              @pointercancel="cancelLongPress"
              @pointermove="cancelLongPress"
            >
              <!-- Select checkbox -->
              <div
                v-if="selectMode"
                class="p-row__checkbox"
                :class="{ 'p-row__checkbox--on': selectedIds.has(item.product.id) }"
                aria-hidden="true"
              >
                <Check v-if="selectedIds.has(item.product.id)" :size="12" />
              </div>

              <!-- Thumbnail -->
              <div class="p-row__thumb" :style="{ '--thumb-c': thumbColor(item.product.categoryId) }">
                <img
                  v-if="item.product.imageUrl && !failedImages[item.product.id]"
                  :src="item.product.imageUrl"
                  :alt="item.product.name"
                  loading="lazy"
                  @error="failedImages[item.product.id] = true"
                />
                <span v-else class="p-row__initial">{{ thumbInitial(item.product.name) }}</span>
              </div>

              <!-- Body -->
              <div class="p-row__body">
                <p class="p-row__name">{{ item.product.name }}</p>
                <div class="p-row__meta">
                  <template v-if="item.product.stockQty !== undefined">
                    <span
                      v-if="item.product.stockQty === 0"
                      class="p-row__badge p-row__badge--oos"
                    >Out of stock</span>
                    <span
                      v-else-if="item.product.stockQty <= (item.product.lowStockThreshold ?? 5)"
                      class="p-row__badge p-row__badge--low"
                    >{{ item.product.stockQty }} left</span>
                    <span v-else class="p-row__stock-count">{{ item.product.stockQty }} in stock</span>
                  </template>
                  <span v-else-if="item.product.outOfStock" class="p-row__badge p-row__badge--oos">Out of stock</span>
                  <span v-if="item.product.sku" class="p-row__sku">{{ item.product.sku }}</span>
                </div>
              </div>

              <!-- Price -->
              <p class="p-row__price">
                {{ formatCurrency(item.product.priceCents) }}<span v-if="item.product.unitLabel" class="p-row__unit">{{ item.product.unitLabel }}</span>
              </p>

              <!-- Restock inline -->
              <div
                v-if="item.product.stockQty !== undefined && !selectMode"
                class="p-row__restock-wrap"
                @click.stop
                @keydown.stop
              >
                <template v-if="restockingId === item.product.id">
                  <input
                    v-model.number="restockQty"
                    class="p-row__restock-input"
                    type="number"
                    min="1"
                    step="1"
                    aria-label="Restock quantity"
                    @keydown.enter.prevent="submitRestock(item.product.id, $event)"
                    @keydown.escape.prevent="cancelRestock($event)"
                  />
                  <button class="segment-button p-row__restock-ok" type="button" @click="submitRestock(item.product.id, $event)">+Add</button>
                  <button class="icon-button" type="button" aria-label="Cancel" @click="cancelRestock($event)"><X :size="14" /></button>
                </template>
                <button
                  v-else
                  class="segment-button p-row__restock-btn"
                  type="button"
                  aria-label="Restock"
                  @click="openRestock(item.product.id, $event)"
                >Restock</button>
              </div>

              <!-- Availability toggle (only when not tracking inventory) -->
              <div
                v-if="item.product.stockQty === undefined"
                class="p-row__toggle-wrap"
                @click.stop
                @keydown.stop
              >
                <ToggleSwitch
                  :model-value="!item.product.outOfStock"
                  :ariaLabel="`${item.product.name} available`"
                  @update:model-value="toggleAvailability(item.product)"
                />
              </div>
            </div>
          </template>
        </div>
      </div>
    </template>

    <!-- ══ Categories tab ════════════════════════════════════════════════════ -->
    <template v-else>
      <div class="surface-panel">
        <div
          v-for="(cat, i) in store.categories"
          :key="cat.id"
          class="category-row"
          :class="{ 'category-row--last': i === store.categories.length - 1 && !addingCategory }"
        >
          <template v-if="editingCategoryId === cat.id">
            <input
              v-model="editingCategoryName"
              class="sheet-input category-row__edit-input"
              type="text"
              @keydown.enter="submitEditCategory(cat)"
              @keydown.escape="editingCategoryId = null"
            />
            <button class="segment-button" type="button" @click="submitEditCategory(cat)">Save</button>
            <button class="icon-button" type="button" @click="editingCategoryId = null"><X :size="14" /></button>
          </template>

          <template v-else-if="confirmDeleteCategoryId === cat.id">
            <p class="category-row__confirm-text">
              Delete <strong>{{ cat.name }}</strong>?
              {{ productCountForCategory(cat.id) > 0 ? `${productCountForCategory(cat.id)} products will be reassigned.` : '' }}
            </p>
            <button class="danger-button" type="button" @click="confirmDeleteCategory(cat.id)">Delete</button>
            <button class="segment-button" type="button" @click="confirmDeleteCategoryId = null">Cancel</button>
          </template>

          <template v-else>
            <div class="category-row__body">
              <p class="category-row__name">{{ cat.name }}</p>
              <p class="category-row__count">{{ productCountForCategory(cat.id) }} products</p>
            </div>
            <button class="icon-button" type="button" :aria-label="`Edit ${cat.name}`" @click="startEditCategory(cat)">
              <Pencil :size="16" />
            </button>
            <button class="icon-button" type="button" :aria-label="`Delete ${cat.name}`" @click="confirmDeleteCategoryId = cat.id">
              <Trash2 :size="16" />
            </button>
          </template>
        </div>

        <div v-if="addingCategory" class="category-row category-row--last">
          <input
            v-model="newCategoryName"
            class="sheet-input category-row__edit-input"
            type="text"
            placeholder="Category name"
            @keydown.enter="submitNewCategory"
            @keydown.escape="addingCategory = false"
          />
          <button class="segment-button" type="button" @click="submitNewCategory">Add</button>
          <button class="icon-button" type="button" @click="addingCategory = false; newCategoryName = ''">
            <Trash2 :size="14" />
          </button>
        </div>

        <div v-if="!addingCategory" class="category-row__add-row">
          <button class="segment-button" type="button" @click="addingCategory = true">
            <Plus :size="14" />
            Add category
          </button>
        </div>
      </div>
    </template>
  </div>

  <ProductSheet v-if="sheetOpen" :product="sheetProduct" @close="closeSheet" @saved="onSaved" />
</template>
