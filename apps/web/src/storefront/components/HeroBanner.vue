<script setup lang="ts">
import { ShoppingBasket } from '@lucide/vue'
import type { BusinessMode, Product } from '@pos/shared/index'
import { formatCurrency } from '@pos/shared/index'
import type { StorefrontCopy } from '@pos/web/storefront/copy'
import { iconForCategory } from '@pos/web/storefront/icons'

const props = defineProps<{
  copy: StorefrontCopy
  businessMode: BusinessMode
  featuredProduct: Product | null
  featuredCategoryName: string
}>()

const emit = defineEmits<{ shopNow: [] }>()

const gradients: Record<string, string> = {
  grocery: 'linear-gradient(135deg, #0f5c3d 0%, #1c8c5c 55%, #2fae74 100%)',
  'coffee-shop': 'linear-gradient(135deg, #2c1a0e 0%, #5c3a1e 55%, #8a5a2e 100%)',
  restaurant: 'linear-gradient(135deg, #4a1414 0%, #8a2e20 55%, #b8502f 100%)',
}

const gradient = gradients[props.businessMode] ?? gradients.grocery
</script>

<template>
  <section class="hero" :style="{ background: gradient }">
    <div class="hero__content">
      <span class="hero__eyebrow">{{ copy.heroEyebrow }}</span>
      <h1 class="hero__title">{{ copy.heroTitle }}</h1>
      <p class="hero__sub">{{ copy.heroSub }}</p>
      <button type="button" class="hero__cta" @click="emit('shopNow')">{{ copy.heroCta }} &rarr;</button>
    </div>

    <div class="hero__art" aria-hidden="true">
      <span class="hero__blob hero__blob--1"></span>
      <span class="hero__blob hero__blob--2"></span>
      <component :is="iconForCategory(featuredCategoryName)" :size="120" class="hero__art-icon" />
    </div>

    <div v-if="featuredProduct" class="hero__featured">
      <div class="hero__featured-art">
        <img
          v-if="featuredProduct.imageUrl"
          :src="featuredProduct.imageUrl"
          :alt="featuredProduct.name"
          class="hero__featured-image"
        />
        <ShoppingBasket v-else :size="28" />
      </div>
      <div class="hero__featured-body">
        <span class="hero__featured-label">{{ copy.featuredLabel }}</span>
        <strong class="hero__featured-name">{{ featuredProduct.name }}</strong>
        <span class="hero__featured-price">
          {{ formatCurrency(featuredProduct.priceCents) }}<span v-if="featuredProduct.unitLabel">{{ featuredProduct.unitLabel }}</span>
        </span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-8);
  min-height: 380px;
  margin-top: var(--space-6);
  padding: var(--space-10) var(--space-10) var(--space-16);
  border-radius: var(--radius-xl);
  overflow: hidden;
  color: #f2fbf6;
}

.hero__content {
  position: relative;
  z-index: 2;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.hero__eyebrow {
  display: inline-flex;
  align-self: flex-start;
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  background: rgba(255, 255, 255, 0.16);
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.hero__title {
  margin: 0;
  font-size: clamp(2rem, 4.5vw, 3.25rem);
  font-weight: 800;
  line-height: 1.08;
  letter-spacing: -0.02em;
  white-space: pre-line;
  background: linear-gradient(180deg, #ffffff 0%, #cdf3de 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero__sub {
  margin: 0;
  max-width: 400px;
  color: rgba(242, 251, 246, 0.86);
  font-size: 15px;
  line-height: 1.5;
}

.hero__cta {
  margin-top: var(--space-2);
  align-self: flex-start;
  padding: 12px 24px;
  border: none;
  border-radius: var(--radius-pill);
  background: #ffffff;
  color: #0f5c3d;
  font-weight: 800;
  font-size: 14px;
  cursor: pointer;
}

.hero__art {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 12%;
  opacity: 0.9;
}

.hero__art-icon {
  color: rgba(255, 255, 255, 0.22);
}

.hero__blob {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
}

.hero__blob--1 {
  width: 280px;
  height: 280px;
  right: -60px;
  top: -60px;
}

.hero__blob--2 {
  width: 200px;
  height: 200px;
  right: 120px;
  bottom: -80px;
}

.hero__featured {
  position: absolute;
  z-index: 3;
  right: var(--space-8);
  bottom: var(--space-8);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-5) var(--space-3) var(--space-3);
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-lg);
  color: var(--text-primary);
}

.hero__featured-art {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  background: var(--fill);
  color: var(--text-tertiary);
  overflow: hidden;
  flex-shrink: 0;
}

.hero__featured-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero__featured-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hero__featured-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-tertiary);
}

.hero__featured-name {
  font-size: 14px;
  font-weight: 700;
}

.hero__featured-price {
  font-size: 13px;
  color: var(--text-secondary);
}

@media (max-width: 720px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
    padding: var(--space-8) var(--space-6) var(--space-16);
  }

  .hero__featured {
    left: var(--space-6);
    right: var(--space-6);
  }
}
</style>
