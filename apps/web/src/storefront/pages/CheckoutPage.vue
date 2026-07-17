<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
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
    )
    cart.clear()
    await router.push({ name: 'order', params: { orderId: result.orderId } })
  } catch {
    error.value = "Couldn't place your order — please check your details and try again."
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="checkout">
    <h1 class="checkout__title">Your order</h1>

    <p v-if="cart.cartLines.value.length === 0" class="checkout__empty">
      Your cart is empty. <RouterLink to="/">Browse the menu</RouterLink> to add something.
    </p>

    <template v-else>
      <ul class="checkout__lines">
        <li v-for="line in cart.cartLines.value" :key="line.product.id" class="checkout__line">
          <span class="checkout__line-name">{{ line.quantity }}&times; {{ line.product.name }}</span>
          <span class="checkout__line-price">{{ formatCurrency(line.product.priceCents * line.quantity) }}</span>
          <button type="button" class="checkout__line-remove" @click="cart.remove(line.product.id)">Remove</button>
        </li>
      </ul>

      <div class="checkout__totals">
        <div class="checkout__totals-row">
          <span>Subtotal</span>
          <span>{{ formatCurrency(cart.subtotalCents.value) }}</span>
        </div>
        <div class="checkout__totals-row">
          <span>Tax</span>
          <span>{{ formatCurrency(cart.taxCents.value) }}</span>
        </div>
        <div class="checkout__totals-row checkout__totals-row--total">
          <span>Total</span>
          <span>{{ formatCurrency(cart.totalCents.value) }}</span>
        </div>
        <p class="checkout__note">Pay when you pick up in store — no payment is collected online.</p>
      </div>

      <form class="checkout__form" @submit.prevent="handleSubmit">
        <label class="checkout__field">
          <span>Name</span>
          <input v-model="name" type="text" required placeholder="Your name" />
        </label>
        <label class="checkout__field">
          <span>Phone</span>
          <input v-model="phone" type="tel" placeholder="Phone number" />
        </label>
        <label class="checkout__field">
          <span>Email</span>
          <input v-model="email" type="email" placeholder="Email address" />
        </label>
        <p class="checkout__hint">We just need a phone or an email so the store can reach you.</p>

        <p v-if="error" class="checkout__error">{{ error }}</p>

        <button class="checkout__submit" type="submit" :disabled="!canSubmit || submitting">
          {{ submitting ? 'Placing order…' : `Place order — ${formatCurrency(cart.totalCents.value)}` }}
        </button>
      </form>
    </template>
  </div>
</template>

<style scoped>
.checkout__title {
  margin: 0 0 24px;
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.checkout__empty {
  color: #5b5f66;
}

.checkout__lines {
  list-style: none;
  margin: 0 0 24px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.checkout__line {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  background: #fff;
}

.checkout__line-name {
  flex: 1;
  font-weight: 600;
}

.checkout__line-remove {
  border: none;
  background: none;
  color: #b42318;
  font-size: 13px;
  cursor: pointer;
}

.checkout__totals {
  padding: 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  background: #fff;
  margin-bottom: 24px;
}

.checkout__totals-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  color: #5b5f66;
}

.checkout__totals-row--total {
  margin-top: 6px;
  padding-top: 10px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  color: #16181c;
  font-weight: 800;
  font-size: 1.1rem;
}

.checkout__note {
  margin: 12px 0 0;
  font-size: 13px;
  color: #5b5f66;
}

.checkout__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 420px;
}

.checkout__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #5b5f66;
}

.checkout__field input {
  padding: 12px 14px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 10px;
  font-size: 15px;
  font-family: inherit;
}

.checkout__hint {
  margin: 0;
  font-size: 12.5px;
  color: #8a8f98;
}

.checkout__error {
  margin: 0;
  color: #b42318;
  font-size: 14px;
}

.checkout__submit {
  margin-top: 8px;
  padding: 14px;
  border: none;
  border-radius: 10px;
  background: #ea5b1c;
  color: #fff;
  font-weight: 800;
  font-size: 15px;
  cursor: pointer;
}

.checkout__submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
