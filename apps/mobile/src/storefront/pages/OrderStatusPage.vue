<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { collection, doc, getDocs, onSnapshot } from 'firebase/firestore'
import { CheckCircle2, Clock3, MapPin, ReceiptText } from '@lucide/vue'
import { formatCurrency, orderStatusLabel, type OrderItemSummary, type OrderStatus } from '@pos/shared/index'
import { ORG_SLUG, STORE_CODE, STORE_ADDRESS, db } from '@pos/web/storefront/firebase'

const props = defineProps<{ orderId: string }>()

interface TrackedOrder {
  ticketNumber: string
  status: OrderStatus
  totalCents: number
  paymentStatus?: string
  paymentMethod?: string
  fulfillmentMethod?: 'pickup' | 'delivery'
  deliveryAddress?: string | null
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

    const data = snap.data() as {
      ticketNumber: string
      status: OrderStatus
      totalCents: number
      paymentStatus?: string
      paymentMethod?: string
      fulfillmentMethod?: 'pickup' | 'delivery'
      deliveryAddress?: string | null
    }
    order.value = {
      ticketNumber: data.ticketNumber,
      status: data.status,
      totalCents: data.totalCents,
      paymentStatus: data.paymentStatus,
      paymentMethod: data.paymentMethod,
      fulfillmentMethod: data.fulfillmentMethod,
      deliveryAddress: data.deliveryAddress,
    }
  })
})

onUnmounted(() => unsubscribe?.())

const fulfillmentLabel = computed(() => (order.value?.fulfillmentMethod === 'delivery' ? 'Delivery' : 'Pickup'))
const fulfillmentDetail = computed(() =>
  order.value?.fulfillmentMethod === 'delivery'
    ? `Delivering to ${order.value.deliveryAddress}`
    : `Ready for pickup at ${STORE_ADDRESS || 'the store'}`,
)
const paymentLabel = computed(() => (order.value?.paymentMethod === 'ewallet' ? 'GCash' : 'Cash'))
</script>

<template>
  <div class="order-status">
    <p v-if="notFound" class="order-status__state">We couldn't find that order.</p>
    <p v-else-if="!order" class="order-status__state">Loading your order...</p>

    <template v-else>
      <section class="order-status__hero">
        <div class="order-status__icon">
          <CheckCircle2 :size="28" />
        </div>
        <p class="order-status__eyebrow">Order {{ order.ticketNumber }}</p>
        <h1>{{ orderStatusLabel(order.status) }}</h1>
        <p class="order-status__copy">
          Your order is saved in the store queue. Please prepare
          <strong>{{ formatCurrency(order.totalCents) }}</strong>
          in {{ paymentLabel }}.
        </p>
      </section>

      <section class="order-status__details">
        <div class="order-status__detail">
          <Clock3 :size="18" />
          <div>
            <strong>Status update</strong>
            <span>Open this page anytime to watch the live kitchen/store progress.</span>
          </div>
        </div>
        <div class="order-status__detail">
          <MapPin :size="18" />
          <div>
            <strong>{{ fulfillmentLabel }}</strong>
            <span>{{ fulfillmentDetail }}</span>
          </div>
        </div>
        <div class="order-status__detail">
          <ReceiptText :size="18" />
          <div>
            <strong v-if="order.paymentStatus === 'paid'">Payment confirmed</strong>
            <strong v-else>Payment</strong>
            <span v-if="order.paymentStatus === 'paid'">
              The store has confirmed your {{ paymentLabel }} payment for this order.
            </span>
            <span v-else>
              No online charge was collected —
              {{ order.paymentMethod === 'ewallet' ? 'the store will confirm your GCash payment' : 'pay in cash' }}
              when your order is claimed{{ order.fulfillmentMethod === 'delivery' ? ' or delivered' : '' }}.
            </span>
          </div>
        </div>
      </section>

      <section class="order-status__items">
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
  display: grid;
  gap: 14px;
}

.order-status__state {
  padding: 48px 16px;
  text-align: center;
  color: #6b7280;
}

.order-status__hero,
.order-status__details,
.order-status__items {
  padding: 18px;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.06);
}

.order-status__hero {
  display: grid;
  gap: 10px;
  background: linear-gradient(135deg, #FDEFE0 0%, #ffffff 72%);
}

.order-status__icon {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  background: #F3811F;
  color: #fff;
}

.order-status__eyebrow {
  margin: 0;
  color: #F3811F;
  font-size: 0.84rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.order-status__hero h1 {
  margin: 0;
  font-size: 1.7rem;
  line-height: 1.04;
  letter-spacing: -0.03em;
}

.order-status__copy {
  margin: 0;
  color: #4b5563;
  line-height: 1.55;
}

.order-status__details {
  display: grid;
  gap: 12px;
}

.order-status__detail {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  color: #4b5563;
}

.order-status__detail strong,
.order-status__detail span {
  display: block;
}

.order-status__detail strong {
  color: #111827;
  margin-bottom: 4px;
}

.order-status__items {
  display: grid;
  gap: 10px;
}

.order-status__item {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.order-status__item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.order-status__item span {
  display: block;
  margin-top: 5px;
  color: #6b7280;
  font-size: 0.88rem;
}

.order-status__back {
  justify-self: start;
  padding: 12px 16px;
  border-radius: 999px;
  background: #FDECD9;
  color: #F3811F;
  text-decoration: none;
  font-weight: 800;
}
</style>
