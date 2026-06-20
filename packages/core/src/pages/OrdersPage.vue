<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { businessModeLabel, formatCompactDate, formatCurrency } from '@pos/shared/index'
import { usePosStore } from '@pos/core/stores/pos'

const store = usePosStore()

onMounted(() => {
  if (!store.isReady) {
    void store.initialize()
  }
})

const recentOrders = computed(() => store.orders.slice(0, 20))
const revenueCents = computed(() => store.orders.reduce((sum, order) => sum + order.totalCents, 0))
const averageTicketCents = computed(() =>
  store.orders.length > 0 ? Math.round(revenueCents.value / store.orders.length) : 0,
)
const cashOrders = computed(() => store.orders.filter((order) => order.paymentMethod === 'cash').length)
const digitalOrders = computed(() => store.orders.filter((order) => order.paymentMethod !== 'cash').length)
</script>

<template>
  <section class="surface-panel page-stack">
    <div class="panel-header">
      <div>
        <p class="eyebrow">Sales history</p>
        <h1 class="panel-title">Recent orders</h1>
      </div>
      <div class="order-badge">{{ store.orders.length }} orders</div>
    </div>

    <div class="orders-summary">
      <article class="summary-card">
        <p class="summary-card__label">Gross sales</p>
        <strong>{{ formatCurrency(revenueCents) }}</strong>
      </article>
      <article class="summary-card">
        <p class="summary-card__label">Average ticket</p>
        <strong>{{ formatCurrency(averageTicketCents) }}</strong>
      </article>
      <article class="summary-card">
        <p class="summary-card__label">Cash / digital</p>
        <strong>{{ cashOrders }} / {{ digitalOrders }}</strong>
      </article>
    </div>

    <div class="history-list">
      <div v-if="recentOrders.length === 0" class="empty-state">
        No completed orders yet. Finish a checkout from the register and it will appear here.
      </div>

      <article v-for="order in recentOrders" :key="order.id" class="history-row">
        <div>
          <p class="history-row__ticket">Ticket {{ order.ticketNumber }}</p>
          <p class="history-row__meta">{{ formatCompactDate(order.createdAt) }} · {{ order.paymentMethod }}</p>
        </div>
        <div class="history-row__items">
          {{ order.items.map((item) => `${item.quantity}x ${item.name}`).join(', ') }}
        </div>
        <div class="history-row__aside">
          <span class="history-row__mode">{{ businessModeLabel(order.businessMode) }}</span>
          <strong class="history-row__total">{{ formatCurrency(order.totalCents) }}</strong>
        </div>
      </article>
    </div>
  </section>
</template>
