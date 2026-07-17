<script setup lang="ts">
import { ShoppingBasket } from '@lucide/vue'
import type { StorefrontCopy } from '@pos/web/storefront/copy'

defineProps<{ copy: StorefrontCopy }>()
const emit = defineEmits<{ start: [] }>()
</script>

<template>
  <section class="cta">
    <div class="cta__text">
      <h2 class="cta__title">{{ copy.ctaTitle }}</h2>
      <p class="cta__body">{{ copy.ctaBody }}</p>
      <button type="button" class="cta__button" @click="emit('start')">{{ copy.ctaButton }} &rarr;</button>
    </div>
    <ShoppingBasket :size="96" class="cta__icon" aria-hidden="true" />
  </section>
</template>

<style scoped>
.cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-6);
  margin-top: var(--space-12);
  padding: var(--space-8);
  border-radius: var(--radius-xl);
  background: color-mix(in srgb, var(--accent) 12%, var(--bg-elevated));
}

.cta__text {
  max-width: 460px;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.cta__title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}

.cta__body {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.cta__button {
  margin-top: var(--space-2);
  align-self: flex-start;
  padding: 12px 24px;
  border: none;
  border-radius: var(--radius-pill);
  background: var(--text-primary);
  color: var(--bg-elevated);
  font-weight: 800;
  font-size: 14px;
  cursor: pointer;
}

.cta__icon {
  flex-shrink: 0;
  color: var(--accent);
  opacity: 0.5;
}

@media (max-width: 640px) {
  .cta {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
