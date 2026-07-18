<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { ShieldCheck, Truck } from '@lucide/vue'
import { formatCurrency } from '@pos/shared/index'
import { useStorefrontCart } from '@pos/web/storefront/cart'
import { createOnlineOrder } from '@pos/web/storefront/firebase'

const cart = useStorefrontCart()
const router = useRouter()

const name = ref('')
const phone = ref('')
const email = ref('')
const submitting = ref(false)
const error = ref('')

const canSubmit = computed(
  () => cart.cartLines.value.length > 0 && name.value.trim().length > 0 && (phone.value.trim() || email.value.trim()),
)

async function handleSubmit() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  error.value = ''

  try {
    const result = await createOnlineOrder(
      cart.cartLines.value.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
      { name: name.value.trim(), phone: phone.value.trim() || undefined, email: email.value.trim() || undefined },
      { method: 'pickup' },
    )
    cart.clear()
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

    <div v-else class="checkout__layout">
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

        <div class="checkout__benefits">
          <div class="checkout__benefit">
            <ShieldCheck :size="17" />
            <span>Order goes directly to the store.</span>
          </div>
          <div class="checkout__benefit">
            <Truck :size="17" />
            <span>Pickup flow only — you pay when claiming the order.</span>
          </div>
        </div>
      </section>

      <form class="checkout__form" @submit.prevent="handleSubmit">
        <h2>Pickup details</h2>

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

        <p class="checkout__hint">Enter a phone or email so the store can contact you about pickup.</p>
        <p v-if="error" class="checkout__error">{{ error }}</p>

        <button class="checkout__submit" type="submit" :disabled="!canSubmit || submitting">
          {{ submitting ? 'Placing order…' : `Place order — ${formatCurrency(cart.totalCents.value)}` }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.checkout {
  display: grid;
  gap: var(--space-6);
}

.checkout__header {
  display: grid;
  gap: var(--space-1);
}

.checkout__eyebrow {
  margin: 0;
  color: var(--accent);
  font-size: 12.5px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.checkout__header h1 {
  margin: 0;
  font-size: 1.75rem;
  letter-spacing: -0.02em;
}

.checkout__header p:last-child {
  margin: 0;
  color: var(--text-secondary);
}

.checkout__empty {
  padding: var(--space-6);
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--separator);
  color: var(--text-secondary);
}

.checkout__empty a {
  color: var(--accent);
  font-weight: 700;
  text-decoration: none;
}

.checkout__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  align-items: start;
  gap: var(--space-6);
}

.checkout__lines,
.checkout__form {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--separator);
}

.checkout__form h2 {
  margin: 0 0 var(--space-1);
  font-size: 1.05rem;
}

.checkout__line {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: var(--space-3);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--separator);
}

.checkout__line strong,
.checkout__line p,
.checkout__line-side span,
.checkout__line-side button {
  display: block;
}

.checkout__line p {
  margin: 4px 0 0;
  color: var(--text-secondary);
  font-size: 13.5px;
}

.checkout__line-side {
  text-align: right;
}

.checkout__line-side span {
  color: var(--text-primary);
  font-weight: 800;
}

.checkout__line-side button {
  margin-top: 6px;
  border: none;
  background: transparent;
  color: var(--accent);
  font: 700 12.5px/1 inherit;
  cursor: pointer;
}

.checkout__summary-row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  color: var(--text-secondary);
  font-size: 14px;
}

.checkout__summary-row strong {
  color: var(--text-primary);
}

.checkout__summary-row--total {
  padding-top: var(--space-3);
  border-top: 1px solid var(--separator);
  color: var(--text-primary);
  font-size: 15.5px;
  font-weight: 800;
}

.checkout__summary-row--total strong {
  color: var(--accent);
  font-size: 1.2rem;
}

.checkout__benefits {
  display: grid;
  gap: var(--space-2);
  padding-top: var(--space-2);
}

.checkout__benefit {
  display: grid;
  grid-template-columns: 17px minmax(0, 1fr);
  gap: var(--space-2);
  align-items: start;
  color: var(--text-secondary);
  font-size: 13px;
}

.checkout__field {
  display: grid;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 700;
}

.checkout__field input {
  min-height: 42px;
  padding: 0 var(--space-3);
  border: 1px solid var(--separator);
  border-radius: var(--radius-md);
  background: var(--bg-base);
  color: var(--text-primary);
  font: 600 14px/1 inherit;
}

.checkout__field input:focus {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.checkout__hint {
  margin: -2px 0 0;
  color: var(--text-tertiary);
  font-size: 12.5px;
  line-height: 1.4;
}

.checkout__error {
  margin: 0;
  color: var(--danger);
  font-size: 13px;
  font-weight: 700;
}

.checkout__submit {
  min-height: 46px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--accent);
  color: var(--accent-text-on);
  font: 800 14.5px/1 inherit;
  cursor: pointer;
}

.checkout__submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 860px) {
  .checkout__layout {
    grid-template-columns: 1fr;
  }
}
</style>
