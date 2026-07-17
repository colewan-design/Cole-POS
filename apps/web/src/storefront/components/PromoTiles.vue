<script setup lang="ts">
import { Home, Percent, Truck } from '@lucide/vue'
import type { StorefrontCopy } from '@pos/web/storefront/copy'

defineProps<{ copy: StorefrontCopy }>()

const icons = [Percent, Truck, Home]
const tones = ['promo--green', 'promo--pink', 'promo--yellow']
</script>

<template>
  <section id="deals" class="promo">
    <article v-for="(card, index) in copy.promoCards" :key="card.title" class="promo__card" :class="tones[index]">
      <component :is="icons[index]" :size="22" class="promo__icon" />
      <strong class="promo__title">{{ card.title }}</strong>
      <p class="promo__body">{{ card.body }}</p>
    </article>
  </section>
</template>

<style scoped>
.promo {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-4);
  margin-top: var(--space-8);
}

.promo__card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  color: var(--text-primary);
}

.promo__icon {
  width: 40px;
  height: 40px;
  padding: 9px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.55);
}

.promo__title {
  font-size: 14.5px;
  font-weight: 800;
  line-height: 1.3;
}

.promo__body {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.promo--green {
  background: color-mix(in srgb, var(--success) 18%, var(--bg-elevated));
}

.promo--pink {
  background: color-mix(in srgb, var(--danger) 14%, var(--bg-elevated));
}

.promo--yellow {
  background: color-mix(in srgb, var(--warning) 20%, var(--bg-elevated));
}
</style>
