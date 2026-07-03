<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { formatCurrency } from '@pos/shared/index'
import NumericKeypad from '@pos/core/components/NumericKeypad.vue'
import { usePosStore } from '@pos/core/stores/pos'

const emit = defineEmits<{ close: []; confirm: [] }>()
const store = usePosStore()

// Prevents a double-tap from firing two orders. Reset on unmount (dialog close).
const confirming = ref(false)
const panelRef = ref<HTMLElement | null>(null)
const creatingCustomer = ref(false)
const customerName = ref('')
const customerPhone = ref('')
const customerEmail = ref('')
const customerError = ref('')

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

function resetCustomerDraft() {
  customerName.value = ''
  customerPhone.value = ''
  customerEmail.value = ''
  customerError.value = ''
}

async function handleCreateCustomer() {
  const name = customerName.value.trim()
  if (!name) {
    customerError.value = 'Enter a customer name or keep the sale as Guest.'
    return
  }

  customerError.value = ''
  await store.createCustomer({
    name,
    phone: customerPhone.value,
    email: customerEmail.value,
  })
  creatingCustomer.value = false
  resetCustomerDraft()
}

function cancelCreateCustomer() {
  creatingCustomer.value = false
  resetCustomerDraft()
}

function handleConfirm() {
  if (!store.canCheckout || confirming.value) return
  confirming.value = true
  emit('confirm')
}

function handleKeydown(event: KeyboardEvent) {
  const target = event.target
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return
  }

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

  if (
    (event.key >= '0' && event.key <= '9')
    || (event.code.startsWith('Numpad') && /\d$/.test(event.code))
  ) {
    event.preventDefault()
    const rawDigit = event.key >= '0' && event.key <= '9'
      ? event.key
      : event.code.slice('Numpad'.length)
    store.appendTenderDigit(Number(rawDigit))
    return
  }

  if (event.key === '.' || event.key === ',' || event.code === 'NumpadDecimal') {
    event.preventDefault()
    store.appendTenderDecimal()
    return
  }

  if (event.key === 'Backspace' || event.key === 'Delete') {
    event.preventDefault()
    if (event.key === 'Delete') {
      store.clearTendered()
      return
    }

    store.backspaceTendered()
    return
  }

  if (event.key.toLowerCase() === 'c') {
    event.preventDefault()
    store.clearTendered()
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  await nextTick()
  panelRef.value?.focus()
})
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <Teleport to="body">
    <div class="sheet-overlay" @click.self="emit('close')">
      <div
        ref="panelRef"
        class="sheet-panel payment-sheet"
        aria-label="Payment dialog"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
      >
        <div class="sheet-grabber" />

        <div class="sheet-scroll">
          <div class="payment-sheet__columns">
            <div class="payment-sheet__col">
              <!-- Total due -->
              <div class="panel-section">
                <p class="section-label">Total due</p>
                <strong class="total-amount">{{ formatCurrency(store.totalCents) }}</strong>
              </div>

              <div class="panel-section customer-panel">
                <div class="customer-panel__header">
                  <div>
                    <p class="section-label">Customer</p>
                    <strong class="customer-panel__name">{{ store.selectedCustomerName }}</strong>
                  </div>
                  <button
                    class="secondary-button customer-panel__action"
                    type="button"
                    @click="creatingCustomer ? cancelCreateCustomer() : (creatingCustomer = true)"
                  >
                    {{ creatingCustomer ? 'Close form' : 'New customer' }}
                  </button>
                </div>

                <select
                  :value="store.selectedCustomerId ?? ''"
                  class="sheet-input"
                  aria-label="Select customer"
                  @change="store.setSelectedCustomer(($event.target as HTMLSelectElement).value || null)"
                >
                  <option value="">Guest</option>
                  <option v-for="customer in store.customers" :key="customer.id" :value="customer.id">
                    {{ customer.name }}
                  </option>
                </select>

                <div v-if="creatingCustomer" class="customer-panel__form">
                  <input
                    v-model="customerName"
                    class="sheet-input"
                    type="text"
                    placeholder="Customer name"
                  />
                  <input
                    v-model="customerPhone"
                    class="sheet-input"
                    type="tel"
                    placeholder="Phone number (optional)"
                  />
                  <input
                    v-model="customerEmail"
                    class="sheet-input"
                    type="email"
                    placeholder="Email (optional)"
                  />
                  <p v-if="customerError" class="customer-panel__error">{{ customerError }}</p>
                  <div class="customer-panel__actions">
                    <button class="secondary-button" type="button" @click="cancelCreateCustomer">
                      Cancel
                    </button>
                    <button class="primary-button" type="button" @click="handleCreateCustomer">
                      Save customer
                    </button>
                  </div>
                </div>
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
            </div>

            <div class="payment-sheet__col">
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
            </div>
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

<style scoped>
.payment-sheet {
  max-width: 700px;
}

.payment-sheet__columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-5);
  align-items: start;
}

.payment-sheet__col {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
}

@media (max-width: 720px) {
  .payment-sheet__columns {
    grid-template-columns: 1fr;
  }
}

.customer-panel {
  display: grid;
  gap: var(--space-3);
}

.customer-panel__header,
.customer-panel__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.customer-panel__header {
  align-items: flex-end;
}

.customer-panel__name {
  display: block;
  font: var(--type-body);
  font-weight: 600;
}

.customer-panel__action {
  min-height: 36px;
  padding: 0 var(--space-3);
}

.customer-panel__form {
  display: grid;
  gap: var(--space-2);
}

.customer-panel__error {
  margin: 0;
  color: var(--danger-600, #b42318);
  font: var(--type-caption);
}
</style>
