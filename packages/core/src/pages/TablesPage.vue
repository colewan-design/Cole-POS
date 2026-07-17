<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Plus, Search, Trash2, X } from '@lucide/vue'
import AutocompleteSelect from '@pos/core/components/AutocompleteSelect.vue'
import { usePosStore } from '@pos/core/stores/pos'
import { tableStatusLabel, type RestaurantTable, type TableStatus } from '@pos/shared/index'

const store = usePosStore()

onMounted(() => {
  if (!store.isReady) {
    void store.initialize()
  }
})

const FLOORS = ['1st Floor', '2nd Floor', '3rd Floor']
const statuses: TableStatus[] = ['available', 'served', 'reserved']

const activeFloor = ref(FLOORS[0])
const searchQuery = ref('')

const floorTables = computed(() => store.tables.filter((table) => table.floor === activeFloor.value))

const filteredTables = computed(() => {
  const needle = searchQuery.value.trim().toLowerCase()
  if (!needle) return floorTables.value
  return floorTables.value.filter(
    (table) =>
      table.label.toLowerCase().includes(needle) ||
      (table.guestName ?? '').toLowerCase().includes(needle),
  )
})

function capacityGroupLabel(capacity: number, allCapacities: number[]) {
  if (allCapacities.length > 1 && capacity === allCapacities[allCapacities.length - 1]) {
    return `Max ${capacity} Persons`
  }
  if (capacity === allCapacities[0]) {
    return `${capacity} Persons Table`
  }
  return `${capacity} Persons`
}

const capacityGroups = computed(() => {
  const capacities = Array.from(new Set(floorTables.value.map((table) => table.capacity))).sort((a, b) => a - b)
  return capacities
    .map((capacity) => ({
      capacity,
      label: capacityGroupLabel(capacity, capacities),
      tables: filteredTables.value.filter((table) => table.capacity === capacity),
    }))
    .filter((group) => group.tables.length > 0)
})

function formatSeatedAt(value: string | null) {
  if (!value) return '----'
  return new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(value))
}

function guestSummary(table: RestaurantTable) {
  if (!table.guestName) return '0 Guest'
  const count = table.guestCount ?? 0
  return `${table.guestName}: ${count} Guest${count === 1 ? '' : 's'}`
}

const isSheetOpen = ref(false)
const editingTable = ref<RestaurantTable | null>(null)
const formFloor = ref(FLOORS[0])
const formCapacity = ref('')
const formLabel = ref('')
const formStatus = ref<TableStatus>('available')
const formGuestName = ref('')
const formGuestCount = ref('')
const formError = ref('')
const savingTable = ref(false)

function openAddSheet() {
  editingTable.value = null
  formFloor.value = activeFloor.value
  formCapacity.value = ''
  formLabel.value = ''
  formError.value = ''
  isSheetOpen.value = true
}

function openEditSheet(table: RestaurantTable) {
  editingTable.value = table
  formStatus.value = table.status
  formGuestName.value = table.guestName ?? ''
  formGuestCount.value = table.guestCount ? String(table.guestCount) : ''
  formError.value = ''
  isSheetOpen.value = true
}

function closeSheet() {
  isSheetOpen.value = false
}

async function saveTable() {
  formError.value = ''

  if (editingTable.value) {
    const nextStatus = formStatus.value
    savingTable.value = true
    try {
      await store.editTable({
        ...editingTable.value,
        status: nextStatus,
        guestName: nextStatus === 'available' ? null : formGuestName.value.trim() || null,
        guestCount: nextStatus === 'available' ? null : Number(formGuestCount.value) || null,
        seatedAt: nextStatus === 'available' ? null : editingTable.value.seatedAt ?? new Date().toISOString(),
      })
      closeSheet()
    } finally {
      savingTable.value = false
    }
    return
  }

  const capacity = Number(formCapacity.value)
  if (!formFloor.value || !capacity || capacity <= 0) {
    formError.value = 'Choose a floor and enter a capacity greater than 0.'
    return
  }

  savingTable.value = true
  try {
    await store.createTable({
      floor: formFloor.value,
      capacity,
      label: formLabel.value.trim() || `T-${String(store.tables.length + 1).padStart(2, '0')}`,
    })
    closeSheet()
  } finally {
    savingTable.value = false
  }
}

async function deleteTable() {
  if (!editingTable.value) return
  if (!window.confirm(`Delete ${editingTable.value.label}? This can't be undone.`)) return
  await store.removeTable(editingTable.value.id)
  closeSheet()
}
</script>

<template>
  <div class="tables-page">
    <section class="tables-header">
      <div>
        <h1 class="tables-title">Tables</h1>
        <p class="tables-copy">Track which tables are free, served, or reserved across your floors.</p>
      </div>
      <button class="primary-button" type="button" @click="openAddSheet">
        <Plus :size="15" />
        <span>Add Table</span>
      </button>
    </section>

    <div v-if="store.settings.businessMode !== 'restaurant'" class="empty-state">
      Tables are only used in Restaurant mode. Switch business mode in Settings to use this page.
    </div>

    <template v-else>
      <div class="tables-toolbar">
        <label class="psearch tables-toolbar__search">
          <Search :size="16" class="psearch__icon" aria-hidden="true" />
          <input
            v-model="searchQuery"
            class="psearch__input"
            type="search"
            placeholder="Search table or guest…"
            aria-label="Search tables"
          />
        </label>

        <div class="segmented-control" role="group" aria-label="Filter by floor">
          <button
            v-for="floor in FLOORS"
            :key="floor"
            class="segment-button"
            :class="{ active: activeFloor === floor }"
            type="button"
            @click="activeFloor = floor"
          >{{ floor }}</button>
        </div>
      </div>

      <div v-if="capacityGroups.length === 0" class="empty-state">
        No tables on {{ activeFloor }} yet. Add one to get started.
      </div>

      <section v-for="group in capacityGroups" :key="group.capacity" class="tables-group">
        <h2 class="tables-group__title">{{ group.label }}</h2>
        <div class="tables-grid">
          <button
            v-for="table in group.tables"
            :key="table.id"
            class="table-card"
            :class="`table-card--${table.status}`"
            type="button"
            @click="openEditSheet(table)"
          >
            <span class="table-card__label">{{ table.label }}</span>
            <span class="table-card__status">{{ tableStatusLabel(table.status) }}</span>
            <span class="table-card__guest">{{ guestSummary(table) }}</span>
            <span class="table-card__time">{{ formatSeatedAt(table.seatedAt) }}</span>
          </button>
        </div>
      </section>

      <footer class="tables-legend">
        <span class="tables-legend__item">
          <i class="tables-legend__dot tables-legend__dot--available" />Available
        </span>
        <span class="tables-legend__item">
          <i class="tables-legend__dot tables-legend__dot--served" />Served
        </span>
        <span class="tables-legend__item">
          <i class="tables-legend__dot tables-legend__dot--reserved" />Reserved
        </span>
      </footer>
    </template>

    <Teleport to="body">
      <div v-if="isSheetOpen" class="sheet-overlay" @click.self="closeSheet">
        <div
          class="sheet-panel tables-sheet"
          role="dialog"
          aria-modal="true"
          :aria-label="editingTable ? 'Edit table' : 'Add table'"
          tabindex="-1"
        >
          <div class="sheet-grabber" />

          <div class="sheet-scroll">
            <div class="panel-section">
              <p class="section-label">{{ editingTable ? 'Edit table' : 'Add table' }}</p>
              <h2 class="panel-title">{{ editingTable ? editingTable.label : 'New table' }}</h2>
            </div>

            <template v-if="!editingTable">
              <AutocompleteSelect
                v-model="formFloor"
                label="Floor"
                :options="FLOORS.map((floor) => ({ value: floor, label: floor }))"
              />
              <label class="settings-field">
                <span class="settings-row__label">Capacity (max persons)</span>
                <input v-model="formCapacity" class="sheet-input" inputmode="numeric" type="number" min="1" placeholder="e.g. 4">
              </label>
              <label class="settings-field">
                <span class="settings-row__label">Label (optional)</span>
                <input v-model="formLabel" class="sheet-input" type="text" placeholder="e.g. T-01">
              </label>
            </template>

            <template v-else>
              <div class="segmented-control" role="group" aria-label="Table status">
                <button
                  v-for="status in statuses"
                  :key="status"
                  class="segment-button"
                  :class="{ active: formStatus === status }"
                  type="button"
                  @click="formStatus = status"
                >{{ tableStatusLabel(status) }}</button>
              </div>

              <template v-if="formStatus !== 'available'">
                <label class="settings-field">
                  <span class="settings-row__label">Guest name</span>
                  <input v-model="formGuestName" class="sheet-input" type="text" placeholder="Guest name">
                </label>
                <label class="settings-field">
                  <span class="settings-row__label">Guest count</span>
                  <input v-model="formGuestCount" class="sheet-input" inputmode="numeric" type="number" min="1" placeholder="e.g. 2">
                </label>
              </template>
            </template>

            <p v-if="formError" class="shift-panel__error">{{ formError }}</p>

            <div class="tables-sheet__actions">
              <button v-if="editingTable" class="outline-danger-button" type="button" @click="deleteTable">
                <Trash2 :size="16" />
                <span>Delete table</span>
              </button>
              <button class="secondary-button" type="button" @click="closeSheet">
                <X :size="16" />
                <span>Cancel</span>
              </button>
              <button class="primary-button" type="button" :disabled="savingTable" @click="saveTable">
                {{ savingTable ? 'Saving…' : editingTable ? 'Save changes' : 'Create table' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.tables-page {
  display: grid;
  gap: var(--space-5);
}

.tables-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.tables-title {
  margin: 0;
  font: var(--type-title1);
}

.tables-copy {
  margin: var(--space-1) 0 0;
  color: var(--text-secondary);
  font: var(--type-body);
}

.tables-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}

.tables-toolbar__search {
  flex: 1;
  min-width: 220px;
}

.tables-group__title {
  margin: 0 0 var(--space-3);
  color: var(--text-secondary);
  font: var(--type-subhead);
  font-weight: 600;
}

.tables-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--space-3);
}

.table-card {
  display: grid;
  gap: 6px;
  padding: var(--space-3) var(--space-4);
  border: 0.5px solid var(--separator);
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  text-align: left;
  transition:
    transform var(--dur-fast) var(--ease-out),
    box-shadow var(--dur-fast) var(--ease-out);
}

.table-card:hover {
  transform: scale(0.985);
  box-shadow: var(--shadow-sm);
}

.table-card__label {
  font: var(--type-subhead);
  font-weight: 700;
}

.table-card__status {
  justify-self: start;
  padding: 2px var(--space-2);
  border-radius: var(--radius-pill);
  font: var(--type-caption);
  font-weight: 700;
}

.table-card--available .table-card__label,
.table-card--available .table-card__status {
  color: var(--text-tertiary);
}

.table-card--available .table-card__status {
  background: var(--fill);
}

.table-card--served .table-card__label,
.table-card--served .table-card__status {
  color: var(--accent);
}

.table-card--served .table-card__status {
  background: color-mix(in srgb, var(--accent) 16%, transparent);
}

.table-card--reserved .table-card__label,
.table-card--reserved .table-card__status {
  color: var(--danger);
}

.table-card--reserved .table-card__status {
  background: color-mix(in srgb, var(--danger) 16%, transparent);
}

.table-card__guest,
.table-card__time {
  overflow: hidden;
  color: var(--text-secondary);
  font: var(--type-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tables-legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  padding-top: var(--space-3);
  border-top: 0.5px solid var(--separator);
  color: var(--text-secondary);
  font: var(--type-caption);
}

.tables-legend__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tables-legend__dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-pill);
  background: var(--text-tertiary);
}

.tables-legend__dot--served {
  background: var(--accent);
}

.tables-legend__dot--reserved {
  background: var(--danger);
}

.tables-sheet {
  max-width: 480px;
}

.tables-sheet__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
}
</style>
