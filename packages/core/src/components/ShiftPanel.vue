<script setup lang="ts">
import { computed, ref } from 'vue'
import { Landmark, MinusCircle, PlusCircle, Wallet } from '@lucide/vue'
import { useAuthStore } from '@pos/core/stores/auth'
import { usePosStore } from '@pos/core/stores/pos'
import { formatCompactDate, formatCurrency } from '@pos/shared/index'

const auth = useAuthStore()
const store = usePosStore()

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
  } catch (error) {
    store.shiftError = error instanceof Error ? error.message : 'Unable to close shift.'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <section class="surface-panel shift-panel">
    <div class="shift-panel__header">
      <div>
        <p class="eyebrow">Shift control</p>
        <h2 class="panel-title">Cash flow</h2>
      </div>
      <div class="shift-panel__status" :class="{ 'shift-panel__status--open': store.activeShift }">
        <Wallet :size="16" />
        <span>{{ store.activeShift ? 'Shift open' : 'Shift closed' }}</span>
      </div>
    </div>

    <p v-if="store.shiftError" class="shift-panel__error">{{ store.shiftError }}</p>

    <div v-if="!store.activeShift" class="shift-panel__empty">
      <p>Open a shift before charging orders so cash sales and pay-ins/pay-outs stay tied to the right branch record.</p>
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
      <div class="shift-panel__meta">
        <div class="shift-metric">
          <span>Opened</span>
          <strong>{{ formatCompactDate(store.activeShift.openedAt) }}</strong>
        </div>
        <div class="shift-metric">
          <span>Expected cash</span>
          <strong>{{ formatCurrency(store.activeShift.expectedCashCents) }}</strong>
        </div>
      </div>

      <div class="shift-panel__grid">
        <article class="stat-card">
          <p class="stat-card__label">Opening float</p>
          <strong>{{ formatCurrency(store.activeShift.openingCashCents) }}</strong>
        </article>
        <article class="stat-card">
          <p class="stat-card__label">Cash sales</p>
          <strong>{{ formatCurrency(store.activeShift.cashSalesCents) }}</strong>
        </article>
        <article class="stat-card">
          <p class="stat-card__label">Pay-ins</p>
          <strong>{{ formatCurrency(store.activeShift.payInsCents) }}</strong>
        </article>
        <article class="stat-card">
          <p class="stat-card__label">Pay-outs</p>
          <strong>{{ formatCurrency(store.activeShift.payOutsCents) }}</strong>
        </article>
      </div>

      <div class="shift-actions">
        <label class="settings-field">
          <span class="settings-row__label">Cash movement amount</span>
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

      <div class="shift-close">
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
        <button class="primary-button shift-close__button" :disabled="isSaving" type="button" @click="handleCloseShift">
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
  </section>
</template>

<style scoped>
.shift-panel {
  display: grid;
  gap: 1rem;
}

.shift-panel__header,
.shift-panel__meta,
.shift-actions__buttons,
.shift-log__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.shift-panel__status {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 0.85rem;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.15);
  color: var(--text-secondary);
}

.shift-panel__status--open {
  background: rgba(16, 185, 129, 0.14);
  color: #047857;
}

.shift-panel__error {
  margin: 0;
  color: #b91c1c;
  font-weight: 600;
}

.shift-panel__empty,
.shift-panel__body,
.shift-actions,
.shift-close,
.shift-log {
  display: grid;
  gap: 0.9rem;
}

.shift-panel__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.shift-metric {
  display: grid;
  gap: 0.2rem;
}

.shift-metric span,
.shift-log__row p,
.shift-log__amount span {
  color: var(--text-secondary);
}

.shift-log__title {
  margin: 0;
  font-weight: 700;
}

.shift-log__row {
  padding: 0.85rem 1rem;
  border-radius: 1rem;
  background: rgba(148, 163, 184, 0.09);
}

.shift-log__row p {
  margin: 0.2rem 0 0;
}

.shift-log__amount {
  display: grid;
  justify-items: end;
  gap: 0.2rem;
}

@media (max-width: 720px) {
  .shift-panel__header,
  .shift-panel__meta,
  .shift-actions__buttons,
  .shift-log__row {
    align-items: stretch;
    flex-direction: column;
  }

  .shift-panel__grid {
    grid-template-columns: 1fr;
  }

  .shift-log__amount {
    justify-items: start;
  }
}
</style>
