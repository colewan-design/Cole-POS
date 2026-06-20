<script setup lang="ts">
import { ChefHat, GlassWater, IceCreamCone, PackageSearch, Soup } from '@lucide/vue'
import { computed, reactive } from 'vue'
import { formatCurrency } from '@pos/shared/index'
import { usePosStore } from '@pos/core/stores/pos'

const store = usePosStore()

const visibleCategories = computed(() => [
  { id: 'all', name: 'All' },
  ...store.categories.filter((category) =>
    store.products.some(
      (product) =>
        product.categoryId === category.id &&
        product.businessModes.includes(store.settings.businessMode),
    ),
  ),
])

const categoryIcons: Record<string, typeof Soup> = {
  starters: Soup,
  mains: ChefHat,
  desserts: IceCreamCone,
  beverages: GlassWater,
}

function iconFor(categoryId: string) {
  return categoryIcons[categoryId] ?? ChefHat
}

const failedImages = reactive<Record<string, boolean>>({})

function markImageFailed(productId: string) {
  failedImages[productId] = true
}
</script>

<template>
  <section class="surface-panel">
    <div class="panel-header">
      <div>
        <p class="eyebrow">Menu</p>
        <h1 class="panel-title">Fast register</h1>
      </div>

      <div class="toolbar-controls">
        <label class="search-field">
          <PackageSearch :size="18" />
          <input
            :value="store.search"
            placeholder="Search menu items"
            type="search"
            @input="store.setSearch(($event.target as HTMLInputElement).value)"
          />
        </label>
      </div>
    </div>

    <div class="category-tabs">
      <button
        v-for="category in visibleCategories"
        :key="category.id"
        class="category-tab"
        :class="{ active: store.selectedCategoryId === category.id }"
        type="button"
        @click="store.setCategory(category.id)"
      >
        {{ category.name }}
      </button>
    </div>

    <div class="product-grid">
      <button
        v-for="product in store.filteredProducts"
        :key="product.id"
        class="product-card"
        :disabled="product.outOfStock"
        type="button"
        @click="store.addProduct(product.id)"
      >
        <div class="product-card__art">
          <img
            v-if="product.imageUrl && !failedImages[product.id]"
            :src="product.imageUrl"
            :alt="product.name"
            loading="lazy"
            @error="markImageFailed(product.id)"
          />
          <component :is="iconFor(product.categoryId)" v-else :size="32" />
        </div>
        <div class="product-card__meta">
          <p class="product-card__eyebrow">{{ product.sku }}</p>
          <p class="product-card__name">{{ product.name }}</p>
          <p class="product-card__price">{{ formatCurrency(product.priceCents) }}</p>
        </div>
      </button>
    </div>
  </section>
</template>
