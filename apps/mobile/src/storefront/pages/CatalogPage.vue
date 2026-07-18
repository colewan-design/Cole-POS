<script setup lang="ts">
import { computed, ref } from 'vue'
import { Search } from '@lucide/vue'
import { useStorefrontCatalog } from '@pos/web/storefront/catalog'
import { useStorefrontSearch } from '@pos/web/storefront/search'
import { useStorefrontWishlist } from '@pos/web/storefront/wishlist'
import { storefrontCopy } from '@pos/web/storefront/copy'
import { iconForCategory } from '@pos/web/storefront/icons'
import { BUSINESS_MODE } from '@pos/web/storefront/firebase'
import ProductCard from '../components/ProductCard.vue'

const catalog = useStorefrontCatalog()
const { query } = useStorefrontSearch()
const wishlist = useStorefrontWishlist()
const copy = storefrontCopy(BUSINESS_MODE)

const selectedCategoryId = ref<string | null>(null)

function categoryNameFor(categoryId: string): string {
  return catalog.categories.find((category) => category.id === categoryId)?.name ?? 'Mixed Picks'
}

const filteredProducts = computed(() => {
  let items = catalog.products
  const needle = query.value.trim().toLowerCase()
  if (needle) {
    items = items.filter((product) =>
      [product.name, categoryNameFor(product.categoryId)].some((value) => value.toLowerCase().includes(needle)),
    )
  }
  if (wishlist.showLovedOnly.value) {
    items = items.filter((product) => wishlist.has(product.id))
  }
  if (selectedCategoryId.value) {
    items = items.filter((product) => product.categoryId === selectedCategoryId.value)
  }
  return items
})

const categories = computed(() =>
  catalog.categories.filter((category) => catalog.products.some((product) => product.categoryId === category.id)),
)

const featuredProduct = computed(() => catalog.products[0] ?? null)
const promo = computed(() => copy.promoCards[0])

function toggleCategory(categoryId: string) {
  selectedCategoryId.value = selectedCategoryId.value === categoryId ? null : categoryId
}
</script>

<template>
  <div class="catalog">
    <p v-if="catalog.loading" class="catalog__state">Loading products...</p>
    <p v-else-if="catalog.error" class="catalog__state catalog__state--error">{{ catalog.error }}</p>
    <p v-else-if="catalog.products.length === 0" class="catalog__state">No products are available right now.</p>

    <template v-else>
      <header class="catalog__greeting">
        <h1>Hi <strong>there</strong>!</h1>
      </header>

      <label class="catalog__search">
        <Search :size="20" />
        <input v-model="query" type="search" placeholder="Find what you want..." />
      </label>

      <section v-if="promo" class="catalog__promo">
        <div class="catalog__promo-copy">
          <p class="catalog__promo-title">{{ promo.title }}</p>
          <p class="catalog__promo-body">{{ promo.body }}</p>
        </div>
        <img
          v-if="featuredProduct?.imageUrl"
          :src="featuredProduct.imageUrl"
          :alt="featuredProduct.name"
          class="catalog__promo-image"
        />
      </section>

      <section v-if="categories.length > 0" class="catalog__categories">
        <button
          v-for="category in categories"
          :key="category.id"
          type="button"
          class="cat-icon"
          :class="{ 'cat-icon--active': selectedCategoryId === category.id }"
          @click="toggleCategory(category.id)"
        >
          <span class="cat-icon__circle">
            <component :is="iconForCategory(category.name)" :size="24" />
          </span>
          <span class="cat-icon__label">{{ category.name }}</span>
        </button>
      </section>

      <p v-if="wishlist.showLovedOnly.value" class="catalog__result-note">Showing your liked products only.</p>
      <p v-else-if="query.trim()" class="catalog__result-note">
        {{ filteredProducts.length }} result{{ filteredProducts.length === 1 ? '' : 's' }} for "{{ query.trim() }}"
      </p>

      <section class="catalog__products">
        <h2 class="catalog__products-title">Top Products</h2>
        <p v-if="filteredProducts.length === 0" class="catalog__state">No products match your filters.</p>
        <div v-else class="catalog__grid">
          <ProductCard
            v-for="product in filteredProducts"
            :key="product.id"
            :product="product"
            :category-name="categoryNameFor(product.categoryId)"
          />
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.catalog {
  display: grid;
  gap: 18px;
}

.catalog__state {
  padding: 48px 16px;
  text-align: center;
  color: #8a8b90;
}

.catalog__state--error {
  color: #e11d48;
}

.catalog__greeting h1 {
  margin: 0;
  color: #1f2430;
  font-size: 1.7rem;
  font-weight: 500;
  letter-spacing: -0.01em;
}

.catalog__greeting h1 strong {
  font-weight: 800;
}

.catalog__search {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  height: 52px;
  border-radius: 999px;
  background: #ffffff;
  color: #8a8b90;
  box-shadow: 0 8px 20px rgba(31, 36, 48, 0.05);
}

.catalog__search input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: #1f2430;
  font: 500 0.96rem/1.2 inherit;
}

.catalog__search input::placeholder {
  color: #b7b4ad;
}

.catalog__promo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px;
  border-radius: 24px;
  background: linear-gradient(135deg, #2f9e5c 0%, #24824a 100%);
  color: #fff;
  overflow: hidden;
}

.catalog__promo-copy {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.catalog__promo-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  line-height: 1.25;
}

.catalog__promo-body {
  margin: 0;
  color: rgba(255, 255, 255, 0.86);
  font-size: 0.82rem;
  line-height: 1.4;
}

.catalog__promo-image {
  flex-shrink: 0;
  width: 88px;
  height: 88px;
  border-radius: 18px;
  object-fit: cover;
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.2);
}

.catalog__categories {
  display: flex;
  gap: 18px;
  overflow-x: auto;
  padding: 2px 2px 4px;
}

.catalog__categories::-webkit-scrollbar {
  display: none;
}

.cat-icon {
  display: grid;
  justify-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  flex-shrink: 0;
}

.cat-icon__circle {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 999px;
  background: #f2efe9;
  color: #f3811f;
}

.cat-icon--active .cat-icon__circle {
  background: #f3811f;
  color: #fff;
}

.cat-icon__label {
  color: #6b6f76;
  font-size: 0.76rem;
  font-weight: 600;
  white-space: nowrap;
}

.cat-icon--active .cat-icon__label {
  color: #1f2430;
  font-weight: 800;
}

.catalog__result-note {
  margin: -8px 2px 0;
  color: #8a8b90;
  font-size: 0.86rem;
  font-weight: 600;
}

.catalog__products {
  display: grid;
  gap: 14px;
}

.catalog__products-title {
  margin: 0;
  color: #1f2430;
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.catalog__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
</style>
