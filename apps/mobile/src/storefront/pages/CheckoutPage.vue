<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { ShieldCheck, Truck } from '@lucide/vue'
import { formatCurrency } from '@pos/shared/index'
import { useStorefrontCart } from '@pos/web/storefront/cart'
import { createOnlineOrder, STORE_ADDRESS } from '@pos/web/storefront/firebase'
import { useStorefrontOrderHistory } from '../orderHistory'

const cart = useStorefrontCart()
const orderHistory = useStorefrontOrderHistory()
const router = useRouter()

const name = ref('')
const phone = ref('')
const email = ref('')
const fulfillmentMethod = ref<'pickup' | 'delivery'>('pickup')
const deliveryAddress = ref('')
const paymentMethod = ref<'cash' | 'ewallet'>('cash')
const submitting = ref(false)
const error = ref('')

const canSubmit = computed(
  () =>
    cart.cartLines.value.length > 0 &&
    name.value.trim().length > 0 &&
    (phone.value.trim() || email.value.trim()) &&
    (fulfillmentMethod.value === 'pickup' || deliveryAddress.value.trim().length > 0),
)

async function handleSubmit() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  error.value = ''

  try {
    const result = await createOnlineOrder(
      cart.cartLines.value.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
      { name: name.value.trim(), phone: phone.value.trim() || undefined, email: email.value.trim() || undefined },
      {
        method: fulfillmentMethod.value,
        address: fulfillmentMethod.value === 'delivery' ? deliveryAddress.value.trim() : undefined,
      },
      paymentMethod.value,
    )
    cart.clear()
    orderHistory.remember({ orderId: result.orderId, ticketNumber: result.ticketNumber, totalCents: result.totalCents })
    await router.push({ name: 'order', params: { orderId: result.orderId } })
  } catch {
    error.value = "Couldn't place your order right now. Please check your details and try again."
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="checkout">
    <header class="checkout__header">
      <p class="checkout__eyebrow">Cart</p>
      <h1>Your order summary</h1>
      <p>Review items, leave pickup contact details, and confirm your store order.</p>
    </header>

    <p v-if="cart.cartLines.value.length === 0" class="checkout__empty">
      Your cart is empty. <RouterLink to="/">Browse the store</RouterLink> to add products.
    </p>

    <template v-else>
      <section class="checkout__lines">
        <article v-for="line in cart.cartLines.value" :key="line.product.id" class="checkout__line">
          <div>
            <strong>{{ line.product.name }}</strong>
            <p>{{ line.quantity }} x {{ formatCurrency(line.product.priceCents) }}</p>
          </div>
          <div class="checkout__line-side">
            <span>{{ formatCurrency(line.product.priceCents * line.quantity) }}</span>
            <button type="button" @click="cart.remove(line.product.id)">Remove</button>
          </div>
        </article>
      </section>

      <section class="checkout__benefits">
        <div class="checkout__benefit">
          <ShieldCheck :size="18" />
          <span>Order goes directly to the store.</span>
        </div>
        <div class="checkout__benefit">
          <Truck :size="18" />
          <span>You pay when the order is claimed or delivered — nothing is charged now.</span>
        </div>
      </section>

      <section class="checkout__fulfillment">
        <p class="checkout__section-label">How do you want it?</p>
        <div class="checkout__segmented">
          <button
            type="button"
            class="checkout__segment"
            :class="{ 'checkout__segment--active': fulfillmentMethod === 'pickup' }"
            @click="fulfillmentMethod = 'pickup'"
          >
            Pickup
          </button>
          <button
            type="button"
            class="checkout__segment"
            :class="{ 'checkout__segment--active': fulfillmentMethod === 'delivery' }"
            @click="fulfillmentMethod = 'delivery'"
          >
            Delivery
          </button>
        </div>

        <p v-if="fulfillmentMethod === 'pickup'" class="checkout__pickup-note">
          Pickup at: <strong>{{ STORE_ADDRESS || 'the store' }}</strong>
        </p>
        <label v-else class="checkout__field">
          <span>Delivery address</span>
          <textarea v-model="deliveryAddress" rows="2" required placeholder="House/unit no., street, barangay, city" />
        </label>
      </section>

      <section class="checkout__fulfillment">
        <p class="checkout__section-label">How will you pay?</p>
        <div class="checkout__segmented">
          <button
            type="button"
            class="checkout__segment"
            :class="{ 'checkout__segment--active': paymentMethod === 'cash' }"
            @click="paymentMethod = 'cash'"
          >
            Cash
          </button>
          <button
            type="button"
            class="checkout__segment"
            :class="{ 'checkout__segment--active': paymentMethod === 'ewallet' }"
            @click="paymentMethod = 'ewallet'"
          >
            GCash
          </button>
        </div>
        <p v-if="paymentMethod === 'ewallet'" class="checkout__pickup-note">
          The store will confirm your GCash payment when your order is claimed or delivered.
        </p>
      </section>

      <section class="checkout__summary">
        <div class="checkout__summary-row">
          <span>Subtotal</span>
          <strong>{{ formatCurrency(cart.subtotalCents.value) }}</strong>
        </div>
        <div class="checkout__summary-row">
          <span>Tax</span>
          <strong>{{ formatCurrency(cart.taxCents.value) }}</strong>
        </div>
        <div class="checkout__summary-row checkout__summary-row--total">
          <span>Total</span>
          <strong>{{ formatCurrency(cart.totalCents.value) }}</strong>
        </div>
      </section>

      <form class="checkout__form" @submit.prevent="handleSubmit">
        <label class="checkout__field">
          <span>Full name</span>
          <input v-model="name" type="text" required placeholder="Juan Dela Cruz" />
        </label>
        <label class="checkout__field">
          <span>Phone</span>
          <input v-model="phone" type="tel" placeholder="09xx xxx xxxx" />
        </label>
        <label class="checkout__field">
          <span>Email</span>
          <input v-model="email" type="email" placeholder="you@example.com" />
        </label>

        <p class="checkout__hint">Enter a phone or email so the store can contact you about your order.</p>
        <p v-if="error" class="checkout__error">{{ error }}</p>

        <button class="checkout__submit" type="submit" :disabled="!canSubmit || submitting">
          {{ submitting ? 'Placing order...' : `Place order - ${formatCurrency(cart.totalCents.value)}` }}
        </button>
      </form>
    </template>
  </div>
</template>

<style scoped>
.checkout {
  display: grid;
  gap: 14px;
}

.checkout__header {
  padding: 10px 4px 2px;
}

.checkout__eyebrow {
  margin: 0 0 6px;
  color: #F3811F;
  font-size: 0.82rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.checkout__header h1 {
  margin: 0;
  font-size: 1.55rem;
  line-height: 1.05;
  letter-spacing: -0.03em;
}

.checkout__header p:last-child {
  margin: 10px 0 0;
  color: #6b7280;
  line-height: 1.5;
}

.checkout__empty {
  padding: 18px;
  border-radius: 20px;
  background: #fff;
  color: #6b7280;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.06);
}

.checkout__empty a {
  color: #F3811F;
  font-weight: 700;
  text-decoration: none;
}

.checkout__lines,
.checkout__benefits,
.checkout__summary,
.checkout__form {
  display: grid;
  gap: 10px;
  padding: 16px;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.06);
}

.checkout__line {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.checkout__line:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.checkout__line strong,
.checkout__line p,
.checkout__line-side span,
.checkout__line-side button {
  display: block;
}

.checkout__line p {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 0.9rem;
}

.checkout__line-side {
  text-align: right;
}

.checkout__line-side span {
  color: #111827;
  font-weight: 800;
}

.checkout__line-side button {
  margin-top: 8px;
  border: none;
  background: transparent;
  color: #F3811F;
  font: 700 0.84rem/1 inherit;
}

.checkout__benefit {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  color: #4b5563;
  font-size: 0.9rem;
}

.checkout__fulfillment {
  display: grid;
  gap: 10px;
  padding: 16px;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.06);
}

.checkout__section-label {
  margin: 0;
  color: #111827;
  font-size: 0.9rem;
  font-weight: 800;
}

.checkout__segmented {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 4px;
  border-radius: 14px;
  background: #f3f4f6;
}

.checkout__segment {
  min-height: 40px;
  border: none;
  border-radius: 11px;
  background: transparent;
  color: #6b7280;
  font: 700 0.9rem/1 inherit;
}

.checkout__segment--active {
  background: #fff;
  color: #F3811F;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
}

.checkout__pickup-note {
  margin: 0;
  color: #4b5563;
  font-size: 0.86rem;
  line-height: 1.5;
}

.checkout__pickup-note strong {
  color: #111827;
}

.checkout__field textarea {
  padding: 12px 14px;
  border: 1px solid rgba(17, 24, 39, 0.12);
  border-radius: 14px;
  background: #fff;
  color: #111827;
  font: 600 0.94rem/1.4 inherit;
  resize: vertical;
}

.checkout__summary-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #4b5563;
  font-size: 0.94rem;
}

.checkout__summary-row strong {
  color: #111827;
}

.checkout__summary-row--total {
  padding-top: 10px;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
  color: #111827;
  font-size: 1rem;
  font-weight: 800;
}

.checkout__summary-row--total strong {
  color: #F3811F;
  font-size: 1.16rem;
}

.checkout__field {
  display: grid;
  gap: 7px;
  color: #4b5563;
  font-size: 0.86rem;
  font-weight: 700;
}

.checkout__field input {
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid rgba(17, 24, 39, 0.12);
  border-radius: 14px;
  background: #fff;
  color: #111827;
  font: 600 0.94rem/1 inherit;
}

.checkout__hint {
  margin: 2px 0 0;
  color: #6b7280;
  font-size: 0.84rem;
  line-height: 1.45;
}

.checkout__error {
  margin: 0;
  color: #e11d48;
  font-size: 0.9rem;
  font-weight: 700;
}

.checkout__submit {
  min-height: 50px;
  border: none;
  border-radius: 16px;
  background: #F3811F;
  color: #fff;
  font: 800 1rem/1 inherit;
}

.checkout__submit:disabled {
  opacity: 0.5;
}
</style>
