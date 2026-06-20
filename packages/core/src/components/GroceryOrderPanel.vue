<script setup lang="ts">
import { Minus, Plus, Trash2 } from '@lucide/vue'
import { computed, reactive, ref } from 'vue'
import { formatCurrency } from '@pos/shared/index'
import PaymentSheet from '@pos/core/components/PaymentSheet.vue'
import { usePosStore } from '@pos/core/stores/pos'

const store = usePosStore()
const showPayment = ref(false)
const failedThumbs = reactive<Record<string, boolean>>({})

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
      <h2 class="panel-title">Current Order</h2>
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
        <div class="order-line__thumb">
          <img
            v-if="line.product.imageUrl && !failedThumbs[line.product.id]"
            :src="line.product.imageUrl"
            :alt="line.product.name"
            loading="lazy"
            @error="failedThumbs[line.product.id] = true"
          />
        </div>

        <div class="order-line__body">
          <p class="order-line__name">{{ line.product.name }}</p>
          <p v-if="line.product.kind === 'weighted'" class="order-line__meta">
            {{ line.quantity }} kg &times; {{ formatCurrency(line.product.priceCents) }}/kg
          </p>
        </div>

        <div v-if="line.product.kind !== 'weighted'" class="stepper">
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
        <span>TOTAL</span>
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
.order-line {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-bottom: 0.5px solid var(--separator);
}

.order-line:last-child {
  border-bottom: none;
}

.order-line__thumb {
  flex: none;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--fill);
}

.order-line__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.order-line__body {
  flex: 1;
  min-width: 0;
}

.order-line__name {
  margin: 0;
  font: var(--type-subhead);
  font-weight: 600;
}

.order-line__meta {
  margin: 2px 0 0;
  color: var(--text-secondary);
  font: var(--type-caption);
}

.order-line__total {
  flex: none;
  font: var(--type-headline);
  font-variant-numeric: tabular-nums;
}
</style>
