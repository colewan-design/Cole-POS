<script setup lang="ts">
import { Minus, Pencil, Plus, ReceiptText, TicketPercent, Trash2, X } from '@lucide/vue'
import { computed, ref } from 'vue'
import { formatCurrency, paymentMethodOptions } from '@pos/shared/index'
import AutocompleteSelect from '@pos/core/components/AutocompleteSelect.vue'
import PaymentSheet from '@pos/core/components/PaymentSheet.vue'
import { usePosStore } from '@pos/core/stores/pos'
import { haptic, ImpactStyle } from '@pos/core/utils/haptics'

const store = usePosStore()
const showPayment = ref(false)
const editingCustomer = ref(false)
const promoCode = ref('')
const emit = defineEmits<{ 'payment-open': [] }>()

function clearPromo() {
  promoCode.value = ''
}

function adjustQty(productId: string, delta: 1 | -1) {
  if (delta > 0) store.increment(productId)
  else store.decrement(productId)
  haptic(ImpactStyle.Light)
}

const taxRateLabel = computed(() => {
  if (store.subtotalCents === 0) {
    return '0%'
  }
  return `${((store.taxCents / store.subtotalCents) * 100).toFixed(2)}%`
})

const nextOrderNumber = computed(() => String((store.activeShift?.orderCount ?? 0) + 1).padStart(3, '0'))

function onSelectCustomer(customerId: string) {
  store.setSelectedCustomer(customerId || null)
  editingCustomer.value = false
}

async function confirmPayment() {
  await store.completeOrder()
  showPayment.value = false
  haptic(ImpactStyle.Medium)
}

async function openPayment() {
  if (store.cartLines.length === 0) {
    return
  }

  await store.notePaymentSheetOpened()
  showPayment.value = true
  emit('payment-open')
}
</script>

<template>
  <aside class="order-panel">
    <div class="order-panel__header">
      <span class="order-panel__header-icon" aria-hidden="true"><ReceiptText :size="18" /></span>

      <div class="order-panel__customer">
        <AutocompleteSelect
          v-if="editingCustomer"
          :model-value="store.selectedCustomerId ?? ''"
          label="Select customer"
          :options="store.customerOptions"
          @update:model-value="onSelectCustomer"
        />
        <template v-else>
          <strong class="order-panel__customer-name" :class="{ 'order-panel__customer-name--placeholder': !store.selectedCustomerId }">{{ store.selectedCustomerName }}</strong>
          <span class="order-panel__order-number">Order Number: #{{ nextOrderNumber }}</span>
        </template>
      </div>

      <div class="order-panel__header-actions">
        <button
          class="icon-button icon-button--sm"
          type="button"
          :aria-label="editingCustomer ? 'Done editing customer' : 'Edit customer'"
          @click="editingCustomer = !editingCustomer"
        >
          <Pencil :size="16" />
        </button>
        <button
          class="icon-button icon-button--sm"
          type="button"
          :disabled="store.cartLines.length === 0"
          aria-label="Clear order"
          @click="store.clearCart"
        >
          <Trash2 :size="16" />
        </button>
      </div>
    </div>

    <div class="order-lines">
      <div v-if="store.cartLines.length === 0" class="empty-state">
        Select products to start the order.
      </div>

      <article v-for="line in store.cartLines" :key="line.product.id" class="order-line">
        <p class="order-line__name">{{ line.product.name }}</p>

        <div class="stepper">
          <button type="button" @click="adjustQty(line.product.id, -1)">
            <Minus :size="14" />
          </button>
          <span>{{ line.quantity }}</span>
          <button type="button" @click="adjustQty(line.product.id, 1)">
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

    <hr class="order-panel__tear" />

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

    <div class="order-panel__footer">
      <div class="order-panel__promo-row">
        <label class="order-panel__promo">
          <input v-model="promoCode" type="text" placeholder="Add Promo or Voucher" />
        </label>
        <button class="order-panel__promo-apply" type="button" aria-label="Clear promo code" @click="clearPromo">
          <TicketPercent :size="16" />
        </button>

        <AutocompleteSelect
          flat
          class="order-panel__payment-method"
          :model-value="store.paymentMethod"
          label="Payment method"
          :options="paymentMethodOptions"
          @update:model-value="store.setPaymentMethod"
        />
      </div>

      <button
        class="primary-button checkout-button"
        :disabled="store.cartLines.length === 0"
        type="button"
        @click="openPayment"
      >
        Place Order · {{ formatCurrency(store.totalCents) }}
      </button>
    </div>

    <PaymentSheet v-if="showPayment" @close="showPayment = false" @confirm="confirmPayment" />
  </aside>
</template>
