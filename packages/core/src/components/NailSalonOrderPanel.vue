<script setup lang="ts">
import { Minus, Plus, Trash2 } from '@lucide/vue'
import { computed, ref } from 'vue'
import { formatCurrency } from '@pos/shared/index'
import PaymentSheet from '@pos/core/components/PaymentSheet.vue'
import { usePosStore } from '@pos/core/stores/pos'

const store = usePosStore()
const showPayment = ref(false)

const taxRateLabel = computed(() => {
  if (store.subtotalCents === 0) return '0%'
  return `${((store.taxCents / store.subtotalCents) * 100).toFixed(2)}%`
})

async function confirmPayment() {
  await store.completeOrder()
  showPayment.value = false
}

async function openPayment() {
  if (store.cartLines.length === 0) return
  await store.notePaymentSheetOpened()
  showPayment.value = true
}
</script>

<template>
  <aside class="order-panel">
    <div class="order-panel__header">
      <h2 class="panel-title">Current order</h2>
      <button
        class="icon-button"
        type="button"
        :disabled="store.cartLines.length === 0"
        aria-label="Clear order"
        @click="store.clearCart"
      >
        <Trash2 :size="18" />
      </button>
    </div>

    <div class="order-type-toggle">
      <button
        class="order-type-btn"
        :class="{ active: store.orderType === 'dine_in' }"
        type="button"
        @click="store.setOrderType('dine_in')"
      >
        Walk-in
      </button>
      <button
        class="order-type-btn"
        :class="{ active: store.orderType === 'takeaway' }"
        type="button"
        @click="store.setOrderType('takeaway')"
      >
        Appointment
      </button>
    </div>

    <div class="order-lines">
      <div v-if="store.cartLines.length === 0" class="empty-state">
        Select services to start the order.
      </div>

      <article v-for="line in store.cartLines" :key="line.product.id" class="order-line">
        <div class="order-line__body">
          <p class="order-line__name">{{ line.product.name }}</p>
        </div>

        <div class="stepper">
          <button type="button" @click="store.decrement(line.product.id)">
            <Minus :size="14" />
          </button>
          <span>{{ line.quantity }}</span>
          <button type="button" @click="store.increment(line.product.id)">
            <Plus :size="14" />
          </button>
        </div>

        <div class="order-line__total">{{ formatCurrency(line.subtotalCents) }}</div>
      </article>
    </div>

    <div class="totals-card">
      <div class="totals-row">
        <span>Subtotal</span>
        <strong>{{ formatCurrency(store.subtotalCents) }}</strong>
      </div>
      <div class="totals-row">
        <span>Tax ({{ taxRateLabel }})</span>
        <strong>{{ formatCurrency(store.taxCents) }}</strong>
      </div>
      <div class="totals-row totals-row--grand">
        <span>Total</span>
        <strong class="total-amount">{{ formatCurrency(store.totalCents) }}</strong>
      </div>
    </div>

    <button
      class="primary-button checkout-button"
      :disabled="store.cartLines.length === 0"
      type="button"
      @click="openPayment"
    >
      Charge {{ formatCurrency(store.totalCents) }}
    </button>

    <PaymentSheet v-if="showPayment" @close="showPayment = false" @confirm="confirmPayment" />
  </aside>
</template>

<style scoped>
.order-type-toggle {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-bottom: 0.5px solid var(--separator);
}

.order-type-btn {
  flex: 1;
  padding: var(--space-2) var(--space-3);
  border: 1.5px solid var(--separator);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-secondary);
  font: var(--type-subhead);
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}

.order-type-btn.active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  color: var(--accent);
  font-weight: 600;
}

.order-line {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-bottom: 0.5px solid var(--separator);
}

.order-line:last-child {
  border-bottom: none;
}

.order-line__body {
  min-width: 0;
}

.order-line__name {
  margin: 0;
  font: var(--type-subhead);
  font-weight: 600;
}
</style>
