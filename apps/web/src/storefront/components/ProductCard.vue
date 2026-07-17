<script setup lang="ts">
import { Heart, ShoppingBasket } from '@lucide/vue'
import type { Product } from '@pos/shared/index'
import { categoryTagVar, formatCurrency } from '@pos/shared/index'
import { useStorefrontCart } from '@pos/web/storefront/cart'
import { useStorefrontWishlist } from '@pos/web/storefront/wishlist'

const props = defineProps<{ product: Product; categoryName: string }>()

const cart = useStorefrontCart()
const wishlist = useStorefrontWishlist()

function quantity(): number {
  return cart.cartLines.value.find((line) => line.product.id === props.product.id)?.quantity ?? 0
}
</script>

<template>
  <div class="pc">
    <div class="pc__art">
      <img v-if="product.imageUrl" :src="product.imageUrl" :alt="product.name" loading="lazy" class="pc__image" />
      <ShoppingBasket v-else :size="28" />
      <button
        type="button"
        class="pc__love"
        :class="{ 'pc__love--active': wishlist.has(product.id) }"
        :title="wishlist.has(product.id) ? 'Remove from loved' : 'Add to loved'"
        @click="wishlist.toggle(product.id)"
      >
        <Heart :size="14" :fill="wishlist.has(product.id) ? 'currentColor' : 'none'" />
      </button>
    </div>
    <div class="pc__body">
      <span class="pc__tag" :style="{ '--tag': categoryTagVar(product.categoryId) }">{{ categoryName }}</span>
      <strong class="pc__name">{{ product.name }}</strong>
      <span class="pc__price">
        {{ formatCurrency(product.priceCents) }}<span v-if="product.unitLabel" class="pc__unit">{{ product.unitLabel }}</span>
      </span>
    </div>
    <div class="pc__actions">
      <button v-if="quantity() === 0" type="button" class="pc__add" @click="cart.add(product)">Add to Cart</button>
      <div v-else class="pc__stepper">
        <button type="button" aria-label="Remove one" @click="cart.decrement(product.id)">&minus;</button>
        <span>{{ quantity() }}</span>
        <button type="button" aria-label="Add one" @click="cart.add(product)">+</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pc {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--separator);
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  overflow: hidden;
}

.pc__art {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: var(--fill);
  color: var(--text-tertiary);
}

.pc__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pc__love {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: var(--text-secondary);
  cursor: pointer;
}

.pc__love--active {
  color: var(--danger);
}

.pc__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--space-3) var(--space-4) 2px;
}

.pc__tag {
  align-self: flex-start;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--tag) 18%, transparent);
  color: var(--tag);
  font-size: 11px;
  font-weight: 700;
}

.pc__name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.pc__price {
  font-size: 13px;
  color: var(--text-secondary);
}

.pc__unit {
  margin-left: 2px;
}

.pc__actions {
  padding: var(--space-3) var(--space-4) var(--space-4);
  margin-top: auto;
}

.pc__add {
  width: 100%;
  padding: 9px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--text-primary);
  color: var(--bg-elevated);
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
}

.pc__stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px;
  border-radius: var(--radius-md);
  background: var(--fill);
}

.pc__stepper button {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}

.pc__stepper span {
  font-weight: 700;
  font-size: 13px;
}
</style>
