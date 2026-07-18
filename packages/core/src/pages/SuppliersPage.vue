<script setup lang="ts">
import { Check, ClipboardList, Package, Pencil, Plus, Search, Trash2, Truck, X } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import AutocompleteSelect from '@pos/core/components/AutocompleteSelect.vue'
import ChartCard from '@pos/core/components/ChartCard.vue'
import MetricCard from '@pos/core/components/MetricCard.vue'
import { useAuthStore } from '@pos/core/stores/auth'
import { usePosStore } from '@pos/core/stores/pos'
import { formatCurrency, type Product, type ReorderMark, type Supplier } from '@pos/shared/index'

const store = usePosStore()
const auth = useAuthStore()

onMounted(() => {
  if (!store.isReady) {
    void store.initialize()
  }
})

const riskFilterOptions: { value: 'all' | 'low' | 'oos'; label: string }[] = [
  { value: 'all', label: 'All risks' },
  { value: 'oos', label: 'Out of stock' },
  { value: 'low', label: 'Low stock' },
]

const searchQuery = ref('')
const riskFilter = ref<'all' | 'low' | 'oos'>('all')
const supplierFilter = ref<'all' | string>('all')
const restockingId = ref<string | null>(null)
const restockQty = ref(1)

interface SupplierProfile extends Supplier {
  itemsCovered: number
  lowStockItems: number
  outOfStockItems: number
  reorderValueCents: number
}

interface ReorderRow {
  product: Product
  supplierId: string | null
  supplierName: string
  categoryName: string
  currentQty: number
  threshold: number
  suggestedQty: number
  suggestedValueCents: number
  status: 'low' | 'oos'
  mark: ReorderMark | null
}

function supplierForCategory(categoryId: string): Supplier | null {
  return store.suppliers.find((supplier) => supplier.categoryIds.includes(categoryId)) ?? null
}

function stockRisk(product: Product): 'healthy' | 'low' | 'oos' | 'untracked' {
  if (product.stockQty === undefined) return 'untracked'
  if (product.stockQty === 0) return 'oos'
  if (product.stockQty <= (product.lowStockThreshold ?? 5)) return 'low'
  return 'healthy'
}

function categoryNameFor(categoryId: string) {
  return store.categories.find((category) => category.id === categoryId)?.name ?? categoryId
}

const supplierProfiles = computed(() => {
  return store.suppliers.map((supplier) => {
    const products = store.products.filter((product) => supplier.categoryIds.includes(product.categoryId) && product.stockQty !== undefined)
    const lowStockItems = products.filter((product) => stockRisk(product) === 'low').length
    const outOfStockItems = products.filter((product) => stockRisk(product) === 'oos').length
    const reorderValueCents = products.reduce((sum, product) => {
      const threshold = product.lowStockThreshold ?? 5
      const currentQty = product.stockQty ?? 0
      if (currentQty > threshold) return sum
      const suggestedQty = Math.max(threshold * 2 - currentQty, threshold)
      return sum + suggestedQty * product.priceCents
    }, 0)

    return {
      ...supplier,
      itemsCovered: products.length,
      lowStockItems,
      outOfStockItems,
      reorderValueCents,
    } satisfies SupplierProfile
  })
})

const supplierFilterOptions = computed(() => [
  { value: 'all', label: 'All suppliers' },
  ...supplierProfiles.value.map((supplier) => ({ value: supplier.id, label: supplier.name })),
])

const reorderRows = computed(() => {
  return store.products
    .filter((product) => product.stockQty !== undefined)
    .filter((product) => {
      const risk = stockRisk(product)
      return risk === 'low' || risk === 'oos'
    })
    .map((product) => {
      const supplier = supplierForCategory(product.categoryId)
      const threshold = product.lowStockThreshold ?? 5
      const currentQty = product.stockQty ?? 0
      const suggestedQty = Math.max(threshold * 2 - currentQty, threshold)
      return {
        product,
        supplierId: supplier?.id ?? null,
        supplierName: supplier?.name ?? 'No supplier assigned',
        categoryName: categoryNameFor(product.categoryId),
        currentQty,
        threshold,
        suggestedQty,
        suggestedValueCents: suggestedQty * product.priceCents,
        status: stockRisk(product) as 'low' | 'oos',
        mark: store.reorderMarks.find((entry) => entry.productId === product.id) ?? null,
      } satisfies ReorderRow
    })
    .sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'oos' ? -1 : 1
      }
      return a.currentQty - b.currentQty
    })
})

const filteredSuppliers = computed(() => {
  const needle = searchQuery.value.trim().toLowerCase()

  return supplierProfiles.value.filter((supplier) => {
    if (!needle) return true
    return (
      supplier.name.toLowerCase().includes(needle)
      || supplier.contact.toLowerCase().includes(needle)
      || supplier.categoryIds.some((categoryId) => categoryNameFor(categoryId).toLowerCase().includes(needle))
    )
  })
})

const filteredReorderRows = computed(() => {
  const needle = searchQuery.value.trim().toLowerCase()

  return reorderRows.value.filter((row) => {
    if (riskFilter.value !== 'all' && row.status !== riskFilter.value) {
      return false
    }

    if (supplierFilter.value !== 'all' && row.supplierId !== supplierFilter.value) {
      return false
    }

    if (!needle) {
      return true
    }

    return (
      row.product.name.toLowerCase().includes(needle)
      || row.supplierName.toLowerCase().includes(needle)
      || row.categoryName.toLowerCase().includes(needle)
      || row.product.sku.toLowerCase().includes(needle)
    )
  })
})

const totalSuppliers = computed(() => store.suppliers.length)
const lowStockCount = computed(() => reorderRows.value.filter((row) => row.status === 'low').length)
const outOfStockCount = computed(() => reorderRows.value.filter((row) => row.status === 'oos').length)
const reorderValueCents = computed(() => reorderRows.value.reduce((sum, row) => sum + row.suggestedValueCents, 0))

function openMarkForm(row: ReorderRow) {
  restockingId.value = row.product.id
  restockQty.value = row.mark?.quantity ?? row.suggestedQty
}

function cancelMarkForm() {
  restockingId.value = null
}

async function submitMarkOrder(row: ReorderRow) {
  if (restockQty.value > 0) {
    await store.markReorder({
      productId: row.product.id,
      supplierId: row.supplierId,
      quantity: restockQty.value,
      userId: auth.currentUser?.id ?? null,
    })
  }
  restockingId.value = null
}

async function handleReceiveMark(mark: ReorderMark) {
  await store.receiveReorder(mark.id)
}

async function handleCancelMark(mark: ReorderMark) {
  await store.cancelReorderMark(mark.id)
}

// --- Supplier directory CRUD ---

const isSupplierFormOpen = ref(false)
const editingSupplier = ref<Supplier | null>(null)
const formName = ref('')
const formContact = ref('')
const formLeadTimeDays = ref('2')
const formOrderWindow = ref('')
const formCategoryIds = ref<string[]>([])
const formError = ref('')
const savingSupplier = ref(false)

function openAddSupplierForm() {
  editingSupplier.value = null
  formName.value = ''
  formContact.value = ''
  formLeadTimeDays.value = '2'
  formOrderWindow.value = ''
  formCategoryIds.value = []
  formError.value = ''
  isSupplierFormOpen.value = true
}

function openEditSupplierForm(supplier: Supplier) {
  editingSupplier.value = supplier
  formName.value = supplier.name
  formContact.value = supplier.contact
  formLeadTimeDays.value = String(supplier.leadTimeDays)
  formOrderWindow.value = supplier.orderWindow
  formCategoryIds.value = [...supplier.categoryIds]
  formError.value = ''
  isSupplierFormOpen.value = true
}

function closeSupplierForm() {
  isSupplierFormOpen.value = false
}

function toggleFormCategory(categoryId: string) {
  const index = formCategoryIds.value.indexOf(categoryId)
  if (index === -1) {
    formCategoryIds.value.push(categoryId)
  } else {
    formCategoryIds.value.splice(index, 1)
  }
}

async function submitSupplierForm() {
  formError.value = ''
  const leadTimeDays = Number(formLeadTimeDays.value)

  if (!formName.value.trim() || !formContact.value.trim()) {
    formError.value = 'Enter a supplier name and contact.'
    return
  }
  if (!Number.isFinite(leadTimeDays) || leadTimeDays < 0) {
    formError.value = 'Lead time must be 0 or more days.'
    return
  }

  savingSupplier.value = true
  try {
    const input = {
      name: formName.value.trim(),
      contact: formContact.value.trim(),
      leadTimeDays,
      orderWindow: formOrderWindow.value.trim(),
      // Plain-array copy — a reactive Vue array can't survive IndexedDB's
      // structured clone (DataCloneError), which the write path silently
      // swallows, so the save looked like it worked but never persisted.
      categoryIds: [...formCategoryIds.value],
    }

    if (editingSupplier.value) {
      await store.editSupplier({ ...editingSupplier.value, ...input })
    } else {
      await store.createSupplier(input)
    }
    closeSupplierForm()
  } finally {
    savingSupplier.value = false
  }
}

async function deleteSupplier() {
  if (!editingSupplier.value) return
  if (!window.confirm(`Remove ${editingSupplier.value.name}? Items in its categories will show as unassigned in the reorder queue.`)) return
  await store.removeSupplier(editingSupplier.value.id)
  closeSupplierForm()
}
</script>

<template>
  <div class="suppliers-page">
    <section class="suppliers-header">
      <div>
        <h1 class="suppliers-title">Suppliers</h1>
        <p class="suppliers-copy">
          Manage the vendors you buy from and the categories each one covers. The reorder queue below matches
          low/out-of-stock items to a supplier automatically once its categories are set.
        </p>
      </div>
      <button class="primary-button" type="button" @click="openAddSupplierForm">
        <Plus :size="15" />
        <span>Add Supplier</span>
      </button>
    </section>

    <section class="suppliers-kpis">
      <MetricCard label="Active Suppliers" :value="totalSuppliers.toLocaleString('en-PH')" />
      <MetricCard label="Low Stock SKUs" :value="lowStockCount.toLocaleString('en-PH')" />
      <MetricCard label="Out of Stock SKUs" :value="outOfStockCount.toLocaleString('en-PH')" />
      <MetricCard label="Suggested Reorder Value" :value="formatCurrency(reorderValueCents)" />
    </section>

    <section class="suppliers-grid">
      <ChartCard title="Supplier Directory" summary="The vendors you buy from, grouped by the categories they cover.">
        <div v-if="store.suppliers.length === 0" class="suppliers-empty">
          No suppliers yet — add one to start matching low-stock items to a vendor.
        </div>
        <div v-else class="suppliers-directory">
          <article v-for="supplier in filteredSuppliers" :key="supplier.id" class="supplier-card">
            <div class="supplier-card__head">
              <div class="supplier-card__icon">
                <Truck :size="18" />
              </div>
              <div class="supplier-card__head-text">
                <h3>{{ supplier.name }}</h3>
                <p>{{ supplier.contact }}</p>
              </div>
              <button class="icon-button icon-button--sm" type="button" :aria-label="`Edit ${supplier.name}`" @click="openEditSupplierForm(supplier)">
                <Pencil :size="14" />
              </button>
            </div>

            <div class="supplier-card__stats">
              <span>{{ supplier.itemsCovered }} items covered</span>
              <span>{{ supplier.leadTimeDays }} day lead time</span>
            </div>

            <div v-if="supplier.categoryIds.length" class="supplier-card__chips">
              <span v-for="categoryId in supplier.categoryIds" :key="categoryId" class="supplier-chip">
                {{ categoryNameFor(categoryId) }}
              </span>
            </div>
            <p v-else class="supplier-card__window">No categories assigned yet.</p>

            <div class="supplier-card__meta">
              <div>
                <strong>{{ supplier.lowStockItems + supplier.outOfStockItems }}</strong>
                <span>items needing attention</span>
              </div>
              <div>
                <strong>{{ formatCurrency(supplier.reorderValueCents) }}</strong>
                <span>suggested reorder</span>
              </div>
            </div>

            <p v-if="supplier.orderWindow" class="supplier-card__window">{{ supplier.orderWindow }}</p>
          </article>
        </div>
      </ChartCard>

      <ChartCard title="Purchase Snapshot" summary="Quick summary of reorder urgency by supplier coverage.">
        <div class="suppliers-snapshot">
          <div v-for="supplier in supplierProfiles" :key="supplier.id" class="suppliers-snapshot__row">
            <div class="suppliers-snapshot__label">
              <ClipboardList :size="15" />
              <span>{{ supplier.name }}</span>
            </div>
            <div class="suppliers-snapshot__meta">
              <span>{{ supplier.outOfStockItems }} OOS · {{ supplier.lowStockItems }} low</span>
              <strong>{{ formatCurrency(supplier.reorderValueCents) }}</strong>
            </div>
          </div>
        </div>
      </ChartCard>
    </section>

    <section class="suppliers-table-card">
      <div class="suppliers-table-card__head">
        <div>
          <h2>Reorder Queue</h2>
          <p>Low and out-of-stock items grouped into an actionable purchasing queue.</p>
        </div>

        <div class="suppliers-filters">
          <label class="suppliers-search">
            <Search :size="16" />
            <input v-model="searchQuery" type="search" placeholder="Search item, supplier, category, or SKU" />
          </label>

          <AutocompleteSelect
            v-model="riskFilter"
            class="suppliers-select"
            label="Filter by stock risk"
            :options="riskFilterOptions"
          />

          <AutocompleteSelect
            v-model="supplierFilter"
            class="suppliers-select"
            label="Filter by supplier"
            :options="supplierFilterOptions"
          />
        </div>
      </div>

      <table v-if="filteredReorderRows.length" class="suppliers-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Supplier</th>
            <th>Status</th>
            <th>Suggested Qty</th>
            <th>Reorder Value</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in filteredReorderRows" :key="row.product.id">
            <td>
              <div class="suppliers-item">
                <div class="suppliers-item__icon">
                  <Package :size="16" />
                </div>
                <div>
                  <strong>{{ row.product.name }}</strong>
                  <p>{{ row.categoryName }} · {{ row.product.sku }}</p>
                </div>
              </div>
            </td>
            <td>{{ row.supplierName }}</td>
            <td>
              <span class="suppliers-status" :class="row.status === 'oos' ? 'suppliers-status--oos' : 'suppliers-status--low'">
                {{ row.status === 'oos' ? 'Out of stock' : `${row.currentQty} left` }}
              </span>
              <p class="suppliers-threshold">threshold {{ row.threshold }}</p>
            </td>
            <td>{{ row.suggestedQty }}</td>
            <td>{{ formatCurrency(row.suggestedValueCents) }}</td>
            <td>
              <div class="suppliers-action">
                <template v-if="restockingId === row.product.id">
                  <input
                    v-model.number="restockQty"
                    class="suppliers-action__input"
                    type="number"
                    min="1"
                    step="1"
                    aria-label="Order quantity"
                    @keydown.enter.prevent="submitMarkOrder(row)"
                    @keydown.escape.prevent="cancelMarkForm"
                  >
                  <button class="segment-button suppliers-action__btn" type="button" @click="submitMarkOrder(row)">
                    <Check :size="13" />
                    Mark ordered
                  </button>
                  <button class="icon-button icon-button--sm" type="button" aria-label="Cancel" @click="cancelMarkForm">
                    <X :size="13" />
                  </button>
                </template>
                <template v-else-if="row.mark">
                  <div class="suppliers-ordered">
                    <span class="suppliers-ordered__tag">Ordered {{ row.mark.quantity }}</span>
                    <button class="segment-button suppliers-action__btn" type="button" @click="handleReceiveMark(row.mark)">
                      <Check :size="13" />
                      Receive
                    </button>
                    <button class="icon-button icon-button--sm" type="button" aria-label="Cancel order" @click="handleCancelMark(row.mark)">
                      <X :size="13" />
                    </button>
                  </div>
                </template>
                <button
                  v-else
                  class="segment-button suppliers-action__btn"
                  type="button"
                  @click="openMarkForm(row)"
                >
                  Mark as ordered
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="suppliers-empty">
        No reorder items match the current filters.
      </div>
    </section>

    <Teleport to="body">
      <div v-if="isSupplierFormOpen" class="sheet-overlay" @click.self="closeSupplierForm">
        <div
          class="sheet-panel suppliers-sheet"
          role="dialog"
          aria-modal="true"
          :aria-label="editingSupplier ? 'Edit supplier' : 'Add supplier'"
          tabindex="-1"
        >
          <div class="sheet-grabber" />

          <div class="sheet-scroll">
            <div class="panel-section">
              <p class="section-label">{{ editingSupplier ? 'Edit supplier' : 'Add supplier' }}</p>
              <h2 class="panel-title">{{ editingSupplier ? editingSupplier.name : 'New supplier' }}</h2>
            </div>

            <label class="settings-field">
              <span class="settings-row__label">Supplier name</span>
              <input v-model="formName" class="sheet-input" type="text" placeholder="e.g. Harbor Fresh Supply Co.">
            </label>

            <label class="settings-field">
              <span class="settings-row__label">Contact (email or phone)</span>
              <input v-model="formContact" class="sheet-input" type="text" placeholder="e.g. buyers@example.com">
            </label>

            <label class="settings-field">
              <span class="settings-row__label">Lead time (days)</span>
              <input v-model="formLeadTimeDays" class="sheet-input" inputmode="numeric" type="number" min="0" placeholder="e.g. 2">
            </label>

            <label class="settings-field">
              <span class="settings-row__label">Order window (optional)</span>
              <input v-model="formOrderWindow" class="sheet-input" type="text" placeholder="e.g. Mon / Thu cut-off">
            </label>

            <div class="settings-field">
              <span class="settings-row__label">Categories this supplier covers</span>
              <div class="suppliers-category-picker">
                <label v-for="category in store.categories" :key="category.id" class="suppliers-category-option">
                  <input
                    type="checkbox"
                    :checked="formCategoryIds.includes(category.id)"
                    @change="toggleFormCategory(category.id)"
                  >
                  <span>{{ category.name }}</span>
                </label>
                <p v-if="store.categories.length === 0" class="supplier-card__window">No categories yet — add products first.</p>
              </div>
            </div>

            <p v-if="formError" class="suppliers-form-error">{{ formError }}</p>

            <div class="suppliers-sheet__actions">
              <button v-if="editingSupplier" class="outline-danger-button" type="button" @click="deleteSupplier">
                <Trash2 :size="16" />
                <span>Delete supplier</span>
              </button>
              <button class="secondary-button" type="button" @click="closeSupplierForm">
                <X :size="16" />
                <span>Cancel</span>
              </button>
              <button class="primary-button" type="button" :disabled="savingSupplier" @click="submitSupplierForm">
                {{ savingSupplier ? 'Saving…' : editingSupplier ? 'Save changes' : 'Create supplier' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.suppliers-page {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-5);
}

.suppliers-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.suppliers-title {
  margin: 0;
  font: var(--type-title1);
}

.suppliers-copy {
  max-width: 72ch;
  margin: var(--space-2) 0 0;
  color: var(--text-secondary);
}

.suppliers-kpis,
.suppliers-grid {
  display: grid;
  gap: var(--space-4);
}

.suppliers-kpis {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.suppliers-grid {
  grid-template-columns: 1.35fr 1fr;
}

.suppliers-directory,
.suppliers-snapshot {
  display: grid;
  gap: var(--space-4);
}

.supplier-card,
.suppliers-table-card {
  padding: var(--space-5);
  border-radius: var(--radius-xl);
  border: 0.5px solid var(--separator);
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
}

.supplier-card {
  display: grid;
  gap: var(--space-4);
}

.supplier-card__head,
.suppliers-snapshot__row,
.suppliers-table-card__head,
.suppliers-filters,
.suppliers-item,
.suppliers-action {
  display: flex;
  align-items: center;
}

.supplier-card__head {
  gap: var(--space-3);
}

.supplier-card__head-text {
  flex: 1;
  min-width: 0;
}

.suppliers-table-card__head {
  justify-content: space-between;
  gap: var(--space-4);
}

.supplier-card__icon,
.suppliers-item__icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: var(--fill);
  color: var(--accent);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.supplier-card__head h3,
.suppliers-table-card__head h2 {
  margin: 0;
  font: var(--type-headline);
}

.supplier-card__head p,
.suppliers-table-card__head p,
.suppliers-item p,
.suppliers-threshold {
  margin: 4px 0 0;
  color: var(--text-secondary);
  font: var(--type-caption);
}

.supplier-card__stats,
.supplier-card__meta,
.supplier-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.supplier-card__stats span,
.supplier-card__window {
  color: var(--text-secondary);
  font: var(--type-caption);
}

.supplier-chip {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  background: var(--fill);
  color: var(--text-primary);
  font: var(--type-caption);
}

.supplier-card__meta {
  justify-content: space-between;
}

.supplier-card__meta div {
  display: grid;
  gap: 2px;
}

.supplier-card__meta strong,
.suppliers-snapshot__meta strong {
  font: var(--type-subhead);
  font-variant-numeric: tabular-nums;
}

.supplier-card__meta span,
.suppliers-snapshot__meta span {
  color: var(--text-secondary);
  font: var(--type-caption);
}

.suppliers-snapshot__row {
  justify-content: space-between;
  gap: var(--space-3);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--separator);
}

.suppliers-snapshot__row:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.suppliers-snapshot__label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-secondary);
}

.suppliers-snapshot__meta {
  display: grid;
  justify-items: end;
}

.suppliers-filters {
  gap: var(--space-3);
  flex-wrap: wrap;
}

.suppliers-search {
  min-width: min(100%, 340px);
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

.suppliers-search input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-primary);
}

.suppliers-select {
  width: 100%;
  min-width: 160px;
}

.suppliers-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: var(--space-4);
}

.suppliers-table th,
.suppliers-table td {
  padding: 14px 0;
  border-bottom: 1px solid var(--separator);
  text-align: left;
}

.suppliers-table th {
  color: var(--text-tertiary);
  font: var(--type-caption);
  font-weight: 600;
}

.suppliers-table td {
  color: var(--text-primary);
  font: var(--type-subhead);
}

.suppliers-item {
  gap: var(--space-3);
}

.suppliers-status {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  font: var(--type-caption);
  font-weight: 600;
}

.suppliers-status--low {
  background: color-mix(in srgb, var(--warning) 16%, transparent);
  color: var(--warning);
}

.suppliers-status--oos {
  background: color-mix(in srgb, var(--danger) 14%, transparent);
  color: var(--danger);
}

.suppliers-action {
  gap: var(--space-1);
}

.suppliers-action__btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-height: 30px;
  height: 30px;
  padding: 0 var(--space-2);
  font-size: 12px;
}

.suppliers-action__input {
  width: 64px;
  height: 30px;
  padding: 0 var(--space-2);
  border: 1px solid var(--separator);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  color: var(--text-primary);
  text-align: center;
}

.suppliers-empty {
  margin-top: var(--space-4);
  padding: var(--space-6) var(--space-4);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--fill) 78%, transparent);
  color: var(--text-secondary);
  text-align: center;
}

.suppliers-ordered {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.suppliers-ordered__tag {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 var(--space-2);
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  color: var(--accent);
  font: var(--type-caption);
  font-weight: 600;
  white-space: nowrap;
}

.suppliers-sheet {
  max-width: 480px;
}

.suppliers-sheet__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
}

.suppliers-form-error {
  margin: 0;
  color: var(--danger);
  font-weight: 600;
}

.suppliers-category-picker {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.suppliers-category-option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 var(--space-3);
  border: 1px solid var(--separator);
  border-radius: var(--radius-pill);
  background: var(--bg-elevated);
  color: var(--text-primary);
  font: var(--type-caption);
}

@media (max-width: 1100px) {
  .suppliers-kpis,
  .suppliers-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .suppliers-table-card__head {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 720px) {
  .suppliers-kpis,
  .suppliers-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .suppliers-filters,
  .supplier-card__head {
    flex-direction: column;
    align-items: stretch;
  }

  .suppliers-table {
    display: block;
    overflow-x: auto;
  }
}
</style>
