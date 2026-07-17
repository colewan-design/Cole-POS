<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { collection, doc, getDocs, onSnapshot } from 'firebase/firestore'
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

onMounted(async () => {
  const orderRef = doc(db, 'organizations', ORG_SLUG, 'stores', STORE_CODE, 'orders', props.orderId)

  // Items never change after checkout — a one-time read is enough.
  const itemsSnap = await getDocs(collection(orderRef, 'items'))
  items.value = itemsSnap.docs.map((itemDoc) => {
    const data = itemDoc.data() as { productId: string | null; productName: string; quantity: number; unitPriceCents: number; lineTotalCents: number }
    return {
      productId: data.productId ?? '',
      name: data.productName,
      quantity: data.quantity,
      unitPriceCents: data.unitPriceCents,
      lineTotalCents: data.lineTotalCents,
    }
  })

  // Status can change while this page is open (staff marking it ready/served),
  // so this one listens live — unlike the staff app's pull-only sync, this is
  // a single scoped doc a customer is actively watching.
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
    <template v-else-if="order">
      <p class="order-status__eyebrow">Order {{ order.ticketNumber }}</p>
      <h1 class="order-status__status">{{ orderStatusLabel(order.status) }}</h1>
      <p class="order-status__note">
        Pay <strong>{{ formatCurrency(order.totalCents) }}</strong> when you pick up in store.
      </p>

      <ul class="order-status__items">
        <li v-for="item in items" :key="item.productId" class="order-status__item">
          <span>{{ item.quantity }}&times; {{ item.name }}</span>
          <span>{{ formatCurrency(item.lineTotalCents) }}</span>
        </li>
      </ul>

      <RouterLink to="/" class="order-status__back">Order something else</RouterLink>
    </template>
    <p v-else class="order-status__state">Loading order…</p>
  </div>
</template>

<style scoped>
.order-status__eyebrow {
  margin: 0 0 4px;
  color: #8a8f98;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.order-status__status {
  margin: 0 0 12px;
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.order-status__note {
  margin: 0 0 28px;
  color: #5b5f66;
}

.order-status__items {
  list-style: none;
  margin: 0 0 28px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.order-status__item {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  background: #fff;
}

.order-status__back {
  color: #ea5b1c;
  font-weight: 700;
  text-decoration: none;
}

.order-status__state {
  color: #5b5f66;
}
</style>
