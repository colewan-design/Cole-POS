<script setup lang="ts">
import { computed, ref } from 'vue'
import { Landmark, MinusCircle, PlusCircle, Wallet } from '@lucide/vue'
import { useAuthStore } from '@pos/core/stores/auth'
import { usePosStore } from '@pos/core/stores/pos'
import { formatCompactDate, formatCurrency } from '@pos/shared/index'

const auth = useAuthStore()
const store = usePosStore()

const isManageOpen = ref(false)
const openingCashInput = ref('')
const movementAmountInput = ref('')
const movementReason = ref('')
const closingCashInput = ref('')
const isSaving = ref(false)

const currentUserId = computed(() => {
  const userId = auth.currentUser?.id
  return userId && userId !== '__guest__' ? userId : null
})

function parseCurrencyInput(value: string): number {
  const normalized = value.trim().replace(/,/g, '')
  if (!normalized) {
    return 0
  }

  const amount = Number(normalized)
  if (!Number.isFinite(amount) || amount < 0) {
    return 0
  }

  return Math.round(amount * 100)
}

async function handleOpenShift() {
  isSaving.value = true
  try {
    await store.openShift(parseCurrencyInput(openingCashInput.value), currentUserId.value)
    openingCashInput.value = ''
    store.clearShiftError()
    isManageOpen.value = false
  } catch (error) {
    store.shiftError = error instanceof Error ? error.message : 'Unable to open shift.'
  } finally {
    isSaving.value = false
  }
}

async function handleMovement(type: 'pay_in' | 'pay_out') {
  isSaving.value = true
  try {
    await store.addCashMovement(
      type,
      parseCurrencyInput(movementAmountInput.value),
      movementReason.value.trim() || undefined,
      currentUserId.value,
    )
    movementAmountInput.value = ''
    movementReason.value = ''
    store.clearShiftError()
  } catch (error) {
    store.shiftError = error instanceof Error ? error.message : 'Unable to record cash movement.'
  } finally {
    isSaving.value = false
  }
}

async function handleCloseShift() {
  isSaving.value = true
  try {
    await store.closeShift(parseCurrencyInput(closingCashInput.value), currentUserId.value)
    closingCashInput.value = ''
    store.clearShiftError()
    isManageOpen.value = false
  } catch (error) {
    store.shiftError = error instanceof Error ? error.message : 'Unable to close shift.'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <section class="shift-strip">
    <div class="shift-strip__status" :class="{ 'shift-strip__status--open': store.activeShift }">
      <Wallet :size="14" />
      <span>{{ store.activeShift ? 'Shift open' : 'Shift closed' }}</span>
    </div>

    <div v-if="store.activeShift" class="shift-strip__meta">
      <span>Opened {{ formatCompactDate(store.activeShift.openedAt) }}</span>
      <span class="shift-strip__divider">·</span>
      <span>Expected cash {{ formatCurrency(store.activeShift.expectedCashCents) }}</span>
    </div>
    <p v-else class="shift-strip__meta">Open a shift to start charging orders.</p>

    <button class="segment-button shift-strip__action" type="button" @click="isManageOpen = true">
      {{ store.activeShift ? 'Manage shift' : 'Open shift' }}
    </button>
  </section>

  <Teleport to="body">
    <div v-if="isManageOpen" class="sheet-overlay" @click.self="isManageOpen = false">
      <div class="sheet-panel" role="dialog" aria-modal="true" aria-label="Shift management" tabindex="-1">
        <div class="sheet-grabber" />

        <div class="sheet-scroll">
          <div class="panel-section">
            <p class="section-label">Shift control</p>
            <h2 class="panel-title">Cash flow</h2>
          </div>

          <p v-if="store.shiftError" class="shift-panel__error">{{ store.shiftError }}</p>

          <div v-if="!store.activeShift" class="shift-section">
            <p class="settings-row__description">
              Open a shift before charging orders so cash sales and pay-ins/pay-outs stay tied to the right
              branch record.
            </p>
            <label class="settings-field">
              <span class="settings-row__label">Opening cash</span>
              <input
                v-model="openingCashInput"
                class="sheet-input"
                inputmode="decimal"
                placeholder="0.00"
                type="text"
              >
            </label>
            <button class="primary-button" :disabled="isSaving" type="button" @click="handleOpenShift">
              Open shift
            </button>
          </div>

          <div v-else class="shift-panel__body">
            <div class="shift-chip-row">
              <article class="shift-chip">
                <span>Opening float</span>
                <strong>{{ formatCurrency(store.activeShift.openingCashCents) }}</strong>
              </article>
              <article class="shift-chip">
                <span>Cash sales</span>
                <strong>{{ formatCurrency(store.activeShift.cashSalesCents) }}</strong>
              </article>
              <article class="shift-chip">
                <span>Pay-ins</span>
                <strong>{{ formatCurrency(store.activeShift.payInsCents) }}</strong>
              </article>
              <article class="shift-chip">
                <span>Pay-outs</span>
                <strong>{{ formatCurrency(store.activeShift.payOutsCents) }}</strong>
              </article>
            </div>

            <div class="shift-section">
              <p class="section-label">Record cash movement</p>
              <label class="settings-field">
                <span class="settings-row__label">Amount</span>
                <input
                  v-model="movementAmountInput"
                  class="sheet-input"
                  inputmode="decimal"
                  placeholder="0.00"
                  type="text"
                >
              </label>
              <label class="settings-field">
                <span class="settings-row__label">Reason</span>
                <input
                  v-model="movementReason"
                  class="sheet-input"
                  maxlength="255"
                  placeholder="Petty cash, supplies, safe drop..."
                  type="text"
                >
              </label>
              <div class="shift-actions__buttons">
                <button class="secondary-button" :disabled="isSaving" type="button" @click="handleMovement('pay_in')">
                  <PlusCircle :size="16" />
                  <span>Pay in</span>
                </button>
                <button class="secondary-button" :disabled="isSaving" type="button" @click="handleMovement('pay_out')">
                  <MinusCircle :size="16" />
                  <span>Pay out</span>
                </button>
              </div>
            </div>

            <div class="shift-section shift-section--close">
              <p class="section-label">End of day</p>
              <label class="settings-field">
                <span class="settings-row__label">Counted cash</span>
                <input
                  v-model="closingCashInput"
                  class="sheet-input"
                  inputmode="decimal"
                  :placeholder="(store.activeShift.expectedCashCents / 100).toFixed(2)"
                  type="text"
                >
              </label>
              <button class="outline-danger-button" :disabled="isSaving" type="button" @click="handleCloseShift">
                <Landmark :size="16" />
                <span>Close shift</span>
              </button>
            </div>

            <div v-if="store.activeShift.movements.length" class="shift-log">
              <p class="shift-log__title">Recent cash movements</p>
              <div
                v-for="movement in store.activeShift.movements.slice(0, 5)"
                :key="movement.id"
                class="shift-log__row"
              >
                <div>
                  <strong>{{ movement.movementType === 'pay_in' ? 'Pay in' : 'Pay out' }}</strong>
                  <p>{{ movement.reason || 'No reason provided' }}</p>
                </div>
                <div class="shift-log__amount">
                  <strong>{{ formatCurrency(movement.amountCents) }}</strong>
                  <span>{{ formatCompactDate(movement.createdAt) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.shift-strip {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 0.5px solid var(--separator);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
}

.shift-strip__status {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.15);
  color: var(--text-secondary);
  font: var(--type-caption);
  font-weight: 700;
}

.shift-strip__status--open {
  background: color-mix(in srgb, var(--success) 16%, transparent);
  color: var(--success);
}

.shift-strip__meta {
  display: flex;
  flex: 1;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--text-secondary);
  font: var(--type-caption);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.shift-strip__divider {
  color: var(--text-tertiary);
}

.shift-strip__action {
  flex: none;
}

.shift-panel__error {
  margin: 0;
  color: var(--danger);
  font-weight: 600;
}

.shift-panel__body {
  display: grid;
  gap: var(--space-4);
}

.shift-chip-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
}

.shift-chip {
  display: grid;
  gap: 2px;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--fill) 70%, transparent);
}

.shift-chip span {
  color: var(--text-secondary);
  font: var(--type-caption);
}

.shift-chip strong {
  font: var(--type-subhead);
  font-variant-numeric: tabular-nums;
}

.shift-section {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 0.5px solid var(--separator);
  border-radius: var(--radius-lg);
}

.shift-actions__buttons {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.shift-actions__buttons .secondary-button {
  flex: 1;
}

.shift-log {
  display: grid;
  gap: 0.9rem;
}

.shift-log__title {
  margin: 0;
  font-weight: 700;
}

.shift-log__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-radius: 1rem;
  background: rgba(148, 163, 184, 0.09);
}

.shift-log__row p {
  margin: 0.2rem 0 0;
  color: var(--text-secondary);
}

.shift-log__amount {
  display: grid;
  justify-items: end;
  gap: 0.2rem;
}

.shift-log__amount span {
  color: var(--text-secondary);
}

@media (max-width: 720px) {
  .shift-strip {
    flex-wrap: wrap;
  }

  .shift-strip__meta {
    order: 3;
    flex-basis: 100%;
    white-space: normal;
  }

  .shift-chip-row {
    grid-template-columns: 1fr;
  }

  .shift-log__row {
    align-items: stretch;
    flex-direction: column;
  }

  .shift-log__amount {
    justify-items: start;
  }
}
</style>
