<script setup lang="ts">
import { Minus, Plus, Trash2, X } from '@lucide/vue'
import { computed, ref } from 'vue'
import { formatCurrency } from '@pos/shared/index'
import PaymentSheet from '@pos/core/components/PaymentSheet.vue'
import { usePosStore } from '@pos/core/stores/pos'

const store = usePosStore()
const showPayment = ref(false)

const taxRateLabel = computed(() => {
  if (store.subtotalCents === 0) {
    return '0%'
  }
  return `${((store.taxCents / store.subtotalCents) * 100).toFixed(2)}%`
})

async function confirmPayment() {
  await store.completeOrder()
  showPayment.value = false
}

async function openPayment() {
  if (store.cartLines.length === 0) {
    return
  }

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

    <div class="order-lines">
      <div v-if="store.cartLines.length === 0" class="empty-state">
        Select products to start the order.
      </div>

      <article v-for="line in store.cartLines" :key="line.product.id" class="order-line">
        <p class="order-line__name">{{ line.product.name }}</p>

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

        <button
          class="icon-button icon-button--sm"
          type="button"
          :aria-label="`Remove ${line.product.name}`"
          @click="store.removeLine(line.product.id)"
        >
          <X :size="14" />
        </button>
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
