<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Clock, Minus, PlusCircle } from '@lucide/vue'
import { nextOrderStatus, orderStatusLabel, type OrderSummary } from '@pos/shared/index'
import { usePosStore } from '@pos/core/stores/pos'
import SettleOnlinePaymentSheet from '@pos/core/components/SettleOnlinePaymentSheet.vue'

const store = usePosStore()
const isOpen = ref(false)
const settlingOrder = ref<OrderSummary | null>(null)

onMounted(() => {
  if (store.isReady) void store.refreshOnlineOrders()
})

const trackedOrders = computed(() =>
  [...store.orders, ...store.onlineOrders]
    .filter((order) => order.businessMode === store.settings.businessMode)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8),
)

function orderTypeLabel(order: OrderSummary) {
  return order.orderType === 'dine_in' ? 'Dine In' : 'Take Away'
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(value))
}

function isUnpaidOnline(order: OrderSummary) {
  return order.channel === 'online' && order.paymentStatus === 'unpaid'
}

function handleCardClick(order: OrderSummary) {
  if (isUnpaidOnline(order)) {
    settlingOrder.value = order
    return
  }
  advanceStatus(order)
}

function advanceStatus(order: OrderSummary) {
  if (order.status === 'served') return
  void store.updateOrderStatus(order.id, nextOrderStatus(order.status))
}
</script>

<template>
  <div class="track-order" :class="{ 'track-order--open': isOpen }">
    <div class="track-order__wrapper">
      <button
        class="track-order__toggle"
        type="button"
        :aria-expanded="isOpen"
        :aria-label="isOpen ? 'Minimize track order' : 'Maximize track order'"
        @click="isOpen = !isOpen"
      >
        <span>Track Order</span>
        <Minus v-if="isOpen" :size="14" class="track-order__toggle-icon" />
        <PlusCircle v-else :size="14" class="track-order__toggle-icon" />
      </button>

      <div v-if="isOpen" class="track-order__panel">
        <div v-if="trackedOrders.length === 0" class="empty-state track-order__empty">
          No orders to track yet.
        </div>
        <div v-else class="track-order__list">
          <button
            v-for="order in trackedOrders"
            :key="order.id"
            class="track-order__card"
            :class="[`track-order__card--${order.status}`, { 'track-order__card--unpaid': isUnpaidOnline(order) }]"
            type="button"
            :aria-label="isUnpaidOnline(order)
              ? `${order.customerName}, online order awaiting payment. Tap to collect payment.`
              : `${order.customerName}, ${orderStatusLabel(order.status)}. Tap to advance status.`"
            @click="handleCardClick(order)"
          >
            <div class="track-order__card-top">
              <strong class="track-order__name">{{ order.customerName }}</strong>
              <span v-if="isUnpaidOnline(order)" class="track-order__status track-order__status--unpaid">Collect payment</span>
              <span v-else class="track-order__status">{{ orderStatusLabel(order.status) }}</span>
            </div>
            <div class="track-order__card-bottom">
              <span class="track-order__meta">
                <template v-if="order.channel === 'online'">Online &middot; </template>
                <template v-if="order.tableNumber">Table {{ order.tableNumber }} &middot; </template>{{ orderTypeLabel(order) }}
              </span>
              <span class="track-order__time">
                <Clock :size="12" />
                {{ formatTime(order.createdAt) }}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>

    <SettleOnlinePaymentSheet
      v-if="settlingOrder"
      :order="settlingOrder"
      @close="settlingOrder = null"
      @settled="settlingOrder = null"
    />
  </div>
</template>

<style scoped>
.track-order {
  position: absolute;
  left: 20px;
  right: 20px;
  bottom: 20px;
  z-index: 15;
}

.track-order__wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 0.5px solid var(--separator);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  box-shadow: var(--shadow-lg);
}

.track-order__toggle {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: var(--space-2);
  border: none;
  padding: 0;
  background: transparent;
  color: var(--text-primary);
  font: var(--type-subhead);
  font-weight: 700;
  transition: opacity var(--dur-fast) var(--ease-out);
}

.track-order__toggle:hover {
  opacity: 0.7;
}

.track-order__toggle-icon {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  color: var(--accent);
}

.track-order__panel {
  width: 100%;
}

.track-order__empty {
  min-width: 260px;
}

.track-order__list {
  display: flex;
  gap: var(--space-3);
  overflow-x: auto;
  padding: var(--space-1) var(--space-1) var(--space-2);
  scroll-snap-type: x proximity;
}

.track-order__card {
  flex: none;
  scroll-snap-align: start;
  display: grid;
  gap: var(--space-2);
  width: 220px;
  padding: var(--space-3) var(--space-4);
  border: 0.5px solid var(--separator);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
  text-align: left;
  transition:
    transform var(--dur-fast) var(--ease-out),
    box-shadow var(--dur-fast) var(--ease-out);
}

.track-order__card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.track-order__card--served {
  opacity: 0.72;
}

.track-order__card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.track-order__name {
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
  font: var(--type-subhead);
  font-weight: 700;
}

.track-order__status {
  flex: none;
  padding: 2px var(--space-2);
  border-radius: var(--radius-pill);
  font: var(--type-caption);
  font-weight: 700;
  white-space: nowrap;
}

.track-order__card--preparing .track-order__status {
  background: color-mix(in srgb, var(--warning) 16%, transparent);
  color: var(--warning);
}

.track-order__card--ready .track-order__status {
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  color: var(--accent);
}

.track-order__card--served .track-order__status {
  background: color-mix(in srgb, var(--success) 16%, transparent);
  color: var(--success);
}

.track-order__status--unpaid {
  background: color-mix(in srgb, var(--danger-600, #b42318) 16%, transparent);
  color: var(--danger-600, #b42318);
}

.track-order__card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  color: var(--text-secondary);
  font: var(--type-caption);
}

.track-order__meta {
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track-order__time {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

@media (max-width: 1024px) {
  .track-order {
    display: none;
  }
}
</style>
