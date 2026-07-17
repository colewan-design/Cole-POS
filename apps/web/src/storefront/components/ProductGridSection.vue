<script setup lang="ts">
import type { Product } from '@pos/shared/index'
import ProductCard from '@pos/web/storefront/components/ProductCard.vue'

defineProps<{
  title: string
  products: Product[]
  categoryNameFor: (categoryId: string) => string
}>()
</script>

<template>
  <section class="grid-section">
    <h2 class="section-title">{{ title }}</h2>
    <p v-if="products.length === 0" class="grid-section__empty">Nothing here yet.</p>
    <div v-else class="grid-section__grid">
      <ProductCard v-for="product in products" :key="product.id" :product="product" :category-name="categoryNameFor(product.categoryId)" />
    </div>
  </section>
</template>

<style scoped>
.grid-section {
  margin-top: var(--space-10);
}

.section-title {
  margin: 0 0 var(--space-4);
  font-size: 1.3rem;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.grid-section__empty {
  color: var(--text-secondary);
  font-size: 14px;
}

.grid-section__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-4);
}
</style>
