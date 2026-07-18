<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { collection, doc, getDocs, onSnapshot } from 'firebase/firestore'
import { CheckCircle2, Clock3, ReceiptText } from '@lucide/vue'
import { formatCurrency, orderStatusLabel, type OrderItemSummary, type OrderStatus } from '@pos/shared/index'
import { ORG_SLUG, STORE_CODE, db } from '@pos/web/storefront/firebase'

const props = defineProps<{ orderId: string }>()

interface TrackedOrder {
  ticketNumber: string
  status: OrderStatus
  totalCents: number
  paymentStatus?: string
}

const order = ref<TrackedOrder | null>(null)
const items = ref<OrderItemSummary[]>([])
const notFound = ref(false)
let unsubscribe: (() => void) | null = null

onMounted(() => {
  const orderRef = doc(db, 'organizations', ORG_SLUG, 'stores', STORE_CODE, 'orders', props.orderId)

  // Fetched independently of the status listener below: a failure here (flaky
  // network, a since-deleted order) must not stop the live status listener
  // from attaching — the customer still needs to see status updates even if
  // the item list can't be shown.
  getDocs(collection(orderRef, 'items'))
    .then((itemsSnap) => {
      items.value = itemsSnap.docs.map((itemDoc) => {
        const data = itemDoc.data() as {
          productId: string | null
          productName: string
          quantity: number
          unitPriceCents: number
          lineTotalCents: number
        }
        return {
          productId: data.productId ?? '',
          name: data.productName,
          quantity: data.quantity,
          unitPriceCents: data.unitPriceCents,
          lineTotalCents: data.lineTotalCents,
        }
      })
    })
    .catch((err) => console.error('Failed to load order items:', err))

  unsubscribe = onSnapshot(orderRef, (snap) => {
    if (!snap.exists()) {
      notFound.value = true
      return
    }

    const data = snap.data() as { ticketNumber: string; status: OrderStatus; totalCents: number; paymentStatus?: string }
    order.value = {
      ticketNumber: data.ticketNumber,
      status: data.status,
      totalCents: data.totalCents,
      paymentStatus: data.paymentStatus,
    }
  })
})

onUnmounted(() => unsubscribe?.())
</script>

<template>
  <div class="order-status">
    <p v-if="notFound" class="order-status__state">We couldn't find that order.</p>
    <p v-else-if="!order" class="order-status__state">Loading your order…</p>

    <template v-else>
      <section class="order-status__hero">
        <div class="order-status__icon">
          <CheckCircle2 :size="26" />
        </div>
        <p class="order-status__eyebrow">Order {{ order.ticketNumber }}</p>
        <h1>{{ orderStatusLabel(order.status) }}</h1>
        <p class="order-status__copy">
          Your order is saved in the store queue. Please prepare
          <strong>{{ formatCurrency(order.totalCents) }}</strong>
          for pickup payment.
        </p>
      </section>

      <section class="order-status__details">
        <div class="order-status__detail">
          <Clock3 :size="17" />
          <div>
            <strong>Status update</strong>
            <span>Open this page anytime to watch the live kitchen/store progress.</span>
          </div>
        </div>
        <div class="order-status__detail">
          <ReceiptText :size="17" />
          <div>
            <strong v-if="order.paymentStatus === 'paid'">Payment confirmed</strong>
            <strong v-else>Awaiting payment confirmation</strong>
            <span v-if="order.paymentStatus === 'paid'">The store has confirmed your payment for this order.</span>
            <span v-else>No online charge was collected. Pay in person, and the store will confirm here once received.</span>
          </div>
        </div>
      </section>

      <section class="order-status__items">
        <h2>Items</h2>
        <article v-for="item in items" :key="`${item.productId}-${item.name}`" class="order-status__item">
          <div>
            <strong>{{ item.name }}</strong>
            <span>{{ item.quantity }} x {{ formatCurrency(item.unitPriceCents) }}</span>
          </div>
          <strong>{{ formatCurrency(item.lineTotalCents) }}</strong>
        </article>
      </section>

      <RouterLink to="/" class="order-status__back">Continue shopping</RouterLink>
    </template>
  </div>
</template>

<style scoped>
.order-status {
  max-width: 620px;
  margin: 0 auto;
  display: grid;
  gap: var(--space-4);
}

.order-status__state {
  padding: 96px 16px;
  text-align: center;
  color: var(--text-secondary);
}

.order-status__hero,
.order-status__details,
.order-status__items {
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--separator);
}

.order-status__hero {
  display: grid;
  gap: var(--space-2);
}

.order-status__icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-md);
  background: var(--accent);
  color: var(--accent-text-on);
}

.order-status__eyebrow {
  margin: 0;
  color: var(--accent);
  font-size: 12.5px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.order-status__hero h1 {
  margin: 0;
  font-size: 1.6rem;
  letter-spacing: -0.02em;
}

.order-status__copy {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.55;
}

.order-status__details {
  display: grid;
  gap: var(--space-3);
}

.order-status__detail {
  display: grid;
  grid-template-columns: 17px minmax(0, 1fr);
  gap: var(--space-2);
  align-items: start;
  color: var(--text-secondary);
}

.order-status__detail strong,
.order-status__detail span {
  display: block;
}

.order-status__detail strong {
  color: var(--text-primary);
  margin-bottom: 2px;
}

.order-status__items {
  display: grid;
  gap: var(--space-3);
}

.order-status__items h2 {
  margin: 0;
  font-size: 1rem;
}

.order-status__item {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: var(--space-3);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--separator);
}

.order-status__item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.order-status__item span {
  display: block;
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 13px;
}

.order-status__back {
  justify-self: start;
  padding: 11px var(--space-4);
  border-radius: var(--radius-pill);
  background: var(--fill);
  color: var(--accent);
  text-decoration: none;
  font-weight: 700;
  font-size: 13.5px;
}
</style>
