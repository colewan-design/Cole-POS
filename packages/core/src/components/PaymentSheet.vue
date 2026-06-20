<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { formatCurrency } from '@pos/shared/index'
import NumericKeypad from '@pos/core/components/NumericKeypad.vue'
import { usePosStore } from '@pos/core/stores/pos'

const emit = defineEmits<{ close: []; confirm: [] }>()
const store = usePosStore()

// Prevents a double-tap from firing two orders. Reset on unmount (dialog close).
const confirming = ref(false)

const paymentMethods = [
  { id: 'cash',    label: 'Cash' },
  { id: 'card',    label: 'Card' },
  { id: 'ewallet', label: 'E-wallet' },
] as const

// Philippine peso bill denominations in centavos
const BILLS = [10000, 20000, 50000, 100000, 200000, 500000]

// Show up to 3 bills that are >= total so the cashier can tap common denominations
const quickCashAmounts = computed(() =>
  BILLS.filter((b) => b >= store.totalCents).slice(0, 3),
)

const tenderedDisplay = computed(() => {
  if (!store.tenderedInput) {
    return formatCurrency(0)
  }

  const [wholePartRaw, fractionPart = ''] = store.tenderedInput.split('.')
  const wholePart = Number(wholePartRaw || '0')
  const wholeDisplay = new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(wholePart)

  return store.tenderedInput.includes('.') ? `₱${wholeDisplay}.${fractionPart}` : `₱${wholeDisplay}`
})

// Change only visible when tendered fully covers the total
const showChange = computed(
  () => store.tenderedCents > 0 && store.tenderedCents >= store.totalCents,
)

const confirmLabel = computed(() => {
  if (confirming.value) return 'Processing…'
  if (store.paymentMethod === 'cash') {
    if (store.tenderedCents === 0) return 'Enter amount to confirm'
    if (store.tenderedCents < store.totalCents) return 'Insufficient amount'
  }
  return 'Confirm payment'
})

function handleConfirm() {
  if (!store.canCheckout || confirming.value) return
  confirming.value = true
  emit('confirm')
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
    return
  }

  if (event.key === 'Enter' && store.canCheckout && !confirming.value) {
    event.preventDefault()
    handleConfirm()
    return
  }

  if (store.paymentMethod !== 'cash') return

  if (event.key >= '0' && event.key <= '9') {
    event.preventDefault()
    store.appendTenderDigit(Number(event.key))
    return
  }

  if (event.key === '.' || event.key === ',') {
    event.preventDefault()
    store.appendTenderDecimal()
    return
  }

  if (event.key === 'Backspace') {
    event.preventDefault()
    store.backspaceTendered()
    return
  }

  if (event.key.toLowerCase() === 'c') {
    event.preventDefault()
    store.clearTendered()
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <Teleport to="body">
    <div class="sheet-overlay" @click.self="emit('close')">
      <div class="sheet-panel">
        <div class="sheet-grabber" />

        <div class="sheet-scroll">
          <!-- Total due -->
          <div class="panel-section">
            <p class="section-label">Total due</p>
            <strong class="total-amount">{{ formatCurrency(store.totalCents) }}</strong>
          </div>

          <!-- Payment method tabs -->
          <div class="segmented-control">
            <button
              v-for="method in paymentMethods"
              :key="method.id"
              class="segment-button"
              :class="{ active: store.paymentMethod === method.id }"
              type="button"
              @click="store.setPaymentMethod(method.id)"
            >
              {{ method.label }}
            </button>
          </div>

          <!-- ── Cash ───────────────────────────────────────────────── -->
          <div v-if="store.paymentMethod === 'cash'" class="cash-panel">
            <!-- Tendered display -->
            <div class="cash-display">
              <span class="cash-display__label">Tendered</span>
              <strong>{{ tenderedDisplay }}</strong>
            </div>

            <!-- Quick-cash denomination shortcuts -->
            <div class="quick-cash" role="group" aria-label="Quick cash amounts">
              <button
                class="quick-cash__btn"
                type="button"
                @click="store.setTendered(store.totalCents)"
              >Exact</button>
              <button
                v-for="amount in quickCashAmounts"
                :key="amount"
                class="quick-cash__btn"
                type="button"
                @click="store.setTendered(amount)"
              >{{ formatCurrency(amount) }}</button>
            </div>

            <NumericKeypad
              @digit="store.appendTenderDigit"
              @decimal="store.appendTenderDecimal"
              @clear="store.clearTendered"
              @backspace="store.backspaceTendered"
            />

            <!-- Change — only shown when tendered ≥ total -->
            <div v-if="showChange" class="cash-change-row">
              <span class="cash-change-row__label">Change</span>
              <strong class="cash-change-row__amount">{{ formatCurrency(store.changeCents) }}</strong>
            </div>
          </div>

          <!-- ── Card ───────────────────────────────────────────────── -->
          <div v-else-if="store.paymentMethod === 'card'" class="payment-prompt">
            <div class="payment-prompt__icon" aria-hidden="true">💳</div>
            <p class="payment-prompt__text">Insert, tap, or swipe card</p>
            <p class="payment-prompt__sub">Waiting for terminal…</p>
          </div>

          <!-- ── E-wallet ────────────────────────────────────────────── -->
          <div v-else-if="store.paymentMethod === 'ewallet'" class="payment-prompt">
            <div class="payment-prompt__icon" aria-hidden="true">📱</div>
            <p class="payment-prompt__text">Scan QR or enter reference</p>
            <input
              class="sheet-input"
              type="text"
              placeholder="Reference number (optional)"
            />
          </div>

          <!-- Confirm button -->
          <button
            class="primary-button checkout-button"
            :disabled="!store.canCheckout || confirming"
            type="button"
            @click="handleConfirm"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
