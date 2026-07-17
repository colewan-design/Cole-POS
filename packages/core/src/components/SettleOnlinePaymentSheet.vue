<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { formatCurrency, paymentMethodOptions, type OrderSummary, type PaymentMethod } from '@pos/shared/index'
import NumericKeypad from '@pos/core/components/NumericKeypad.vue'
import { usePosStore } from '@pos/core/stores/pos'
import { useSheetDrag } from '@pos/core/utils/sheetDrag'

const props = defineProps<{ order: OrderSummary }>()
const emit = defineEmits<{ close: []; settled: [] }>()
const store = usePosStore()

const { dragOffset, isDragging, isClosing, onPointerDown, onPointerMove, onPointerUp, onPointerCancel } = useSheetDrag({
  onDismiss: () => emit('close'),
})

const panelRef = ref<HTMLElement | null>(null)
const confirming = ref(false)
const errorMessage = ref('')
const paymentMethod = ref<PaymentMethod>('cash')
const tenderedInput = ref('')

const tenderedCents = computed(() => {
  if (!tenderedInput.value) return 0
  const [wholePartRaw, fractionPartRaw = ''] = tenderedInput.value.split('.')
  const wholePart = Number(wholePartRaw || '0')
  const fractionPart = fractionPartRaw.padEnd(2, '0').slice(0, 2)
  return wholePart * 100 + Number(fractionPart || '0')
})

const tenderedDisplay = computed(() => {
  if (!tenderedInput.value) return formatCurrency(0)
  const [wholePartRaw, fractionPart = ''] = tenderedInput.value.split('.')
  const wholeDisplay = new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(wholePartRaw || '0'))
  return tenderedInput.value.includes('.') ? `₱${wholeDisplay}.${fractionPart}` : `₱${wholeDisplay}`
})

const BILLS = [10000, 20000, 50000, 100000, 200000, 500000]
const quickCashAmounts = computed(() => BILLS.filter((b) => b >= props.order.totalCents).slice(0, 3))

const showChange = computed(() => tenderedCents.value > 0 && tenderedCents.value >= props.order.totalCents)
const changeCents = computed(() => Math.max(tenderedCents.value - props.order.totalCents, 0))

const canConfirm = computed(() => paymentMethod.value !== 'cash' || tenderedCents.value >= props.order.totalCents)

const confirmLabel = computed(() => {
  if (confirming.value) return 'Processing…'
  if (paymentMethod.value === 'cash') {
    if (tenderedCents.value === 0) return 'Enter amount to confirm'
    if (tenderedCents.value < props.order.totalCents) return 'Insufficient amount'
  }
  return 'Mark as paid'
})

function appendTenderDigit(digit: number) {
  if (paymentMethod.value !== 'cash') return
  if (tenderedInput.value.includes('.') && tenderedInput.value.split('.')[1]?.length >= 2) return
  tenderedInput.value += String(digit)
}

function appendTenderDecimal() {
  if (paymentMethod.value !== 'cash' || tenderedInput.value.includes('.')) return
  tenderedInput.value = tenderedInput.value ? `${tenderedInput.value}.` : '0.'
}

function backspaceTendered() {
  tenderedInput.value = tenderedInput.value.slice(0, -1)
}

function clearTendered() {
  tenderedInput.value = ''
}

function setTendered(amountCents: number) {
  tenderedInput.value = (amountCents / 100).toFixed(2)
}

async function handleConfirm() {
  if (!canConfirm.value || confirming.value) return
  confirming.value = true
  errorMessage.value = ''
  try {
    await store.settleOnlineOrderPayment(props.order.id, {
      paymentMethod: paymentMethod.value,
      tenderedCents: paymentMethod.value === 'cash' ? tenderedCents.value : props.order.totalCents,
      changeCents: changeCents.value,
    })
    emit('settled')
  } catch {
    errorMessage.value = 'Could not settle this order — check your connection and try again.'
  } finally {
    confirming.value = false
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
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
    <div
      class="sheet-overlay"
      :style="isDragging || isClosing ? { '--sheet-backdrop-opacity': String(Math.max(0, 1 - dragOffset / 400)) } : undefined"
      @click.self="emit('close')"
    >
      <div
        ref="panelRef"
        class="sheet-panel payment-sheet"
        :class="{ 'sheet-panel--dragging': isDragging }"
        :style="dragOffset ? { transform: `translateY(${dragOffset}px)` } : undefined"
        aria-label="Collect payment for online order"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
      >
        <button
          class="sheet-grabber-handle"
          type="button"
          aria-label="Drag down to close"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerCancel"
        >
          <span class="sheet-grabber" />
        </button>

        <div class="sheet-scroll">
          <div class="payment-sheet__columns">
            <div class="payment-sheet__col">
              <div class="panel-section">
                <p class="section-label">Online order &middot; {{ order.ticketNumber }}</p>
                <strong class="total-amount">{{ formatCurrency(order.totalCents) }}</strong>
              </div>

              <div class="panel-section customer-panel">
                <p class="section-label">Customer</p>
                <strong class="customer-panel__name">{{ order.guestContact?.name ?? order.customerName }}</strong>
                <span v-if="order.guestContact?.phone || order.guestContact?.email" class="customer-panel__contact">
                  {{ order.guestContact?.phone || order.guestContact?.email }}
                </span>
              </div>

              <div class="segmented-control">
                <button
                  v-for="method in paymentMethodOptions"
                  :key="method.value"
                  class="segment-button"
                  :class="{ active: paymentMethod === method.value }"
                  type="button"
                  @click="paymentMethod = method.value"
                >
                  {{ method.label }}
                </button>
              </div>

              <p v-if="errorMessage" class="customer-panel__error">{{ errorMessage }}</p>
            </div>

            <div class="payment-sheet__col">
              <div v-if="paymentMethod === 'cash'" class="cash-panel">
                <div class="cash-display">
                  <span class="cash-display__label">Tendered</span>
                  <strong>{{ tenderedDisplay }}</strong>
                </div>

                <div class="quick-cash" role="group" aria-label="Quick cash amounts">
                  <button class="quick-cash__btn" type="button" @click="setTendered(order.totalCents)">Exact</button>
                  <button
                    v-for="amount in quickCashAmounts"
                    :key="amount"
                    class="quick-cash__btn"
                    type="button"
                    @click="setTendered(amount)"
                  >{{ formatCurrency(amount) }}</button>
                </div>

                <NumericKeypad
                  @digit="appendTenderDigit"
                  @decimal="appendTenderDecimal"
                  @clear="clearTendered"
                  @backspace="backspaceTendered"
                />

                <div v-if="showChange" class="cash-change-row">
                  <span class="cash-change-row__label">Change</span>
                  <strong class="cash-change-row__amount">{{ formatCurrency(changeCents) }}</strong>
                </div>
              </div>

              <div v-else-if="paymentMethod === 'card'" class="payment-prompt">
                <div class="payment-prompt__icon" aria-hidden="true">💳</div>
                <p class="payment-prompt__text">Insert, tap, or swipe card</p>
                <p class="payment-prompt__sub">Waiting for terminal…</p>
              </div>

              <div v-else-if="paymentMethod === 'ewallet'" class="payment-prompt">
                <div class="payment-prompt__icon" aria-hidden="true">📱</div>
                <p class="payment-prompt__text">Scan QR or enter reference</p>
              </div>
            </div>
          </div>

          <button
            class="primary-button checkout-button"
            :disabled="!canConfirm || confirming"
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

@media (max-width: 720px) {
  .sheet-panel.payment-sheet {
    width: 100%;
    height: 100vh;
    height: 100dvh;
    max-width: none;
    max-height: none;
    border-radius: 0;
    padding-top: max(var(--space-3), env(safe-area-inset-top));
    padding-bottom: env(safe-area-inset-bottom);
  }
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
    grid-template-columns: minmax(0, 1fr);
  }
}

.customer-panel {
  display: grid;
  gap: var(--space-2);
}

.customer-panel__name {
  display: block;
  font: var(--type-body);
  font-weight: 600;
}

.customer-panel__contact {
  color: var(--text-secondary);
  font: var(--type-caption);
}

.customer-panel__error {
  margin: 0;
  color: var(--danger-600, #b42318);
  font: var(--type-caption);
}
</style>
