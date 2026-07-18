<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStorefrontCatalog } from '@pos/web/storefront/catalog'
import { useStorefrontSearch } from '@pos/web/storefront/search'
import { useStorefrontWishlist } from '@pos/web/storefront/wishlist'
import { storefrontCopy } from '@pos/web/storefront/copy'
import { BUSINESS_MODE } from '@pos/web/storefront/firebase'
import HeroBanner from '@pos/web/storefront/components/HeroBanner.vue'
import CategoryGrid from '@pos/web/storefront/components/CategoryGrid.vue'
import PromoTiles from '@pos/web/storefront/components/PromoTiles.vue'
import ProductGridSection from '@pos/web/storefront/components/ProductGridSection.vue'
import FinalCta from '@pos/web/storefront/components/FinalCta.vue'

const catalog = useStorefrontCatalog()
const { query } = useStorefrontSearch()
const wishlist = useStorefrontWishlist()
const router = useRouter()
const copy = storefrontCopy(BUSINESS_MODE)

const selectedCategoryId = ref<string | null>(null)

function categoryNameFor(categoryId: string): string {
  return catalog.categories.find((category) => category.id === categoryId)?.name ?? 'Mixed Picks'
}

function categoryCount(categoryId: string): number {
  return catalog.products.filter((product) => product.categoryId === categoryId).length
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

const mostSelling = computed(() => filteredProducts.value.slice(0, 4))
const picks = computed(() => filteredProducts.value.slice(4))

const featuredProduct = computed(() => catalog.products[0] ?? null)
const featuredCategoryName = computed(() => categoryNameFor(featuredProduct.value?.categoryId ?? ''))

function scrollToProducts() {
  document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function goToCheckout() {
  void router.push({ name: 'checkout' })
}
</script>

<template>
  <div class="catalog">
    <p v-if="catalog.loading" class="catalog__state">Loading products…</p>
    <p v-else-if="catalog.error" class="catalog__state catalog__state--error">{{ catalog.error }}</p>
    <p v-else-if="catalog.products.length === 0" class="catalog__state">No products are available right now.</p>

    <template v-else>
      <HeroBanner
        :copy="copy"
        :business-mode="BUSINESS_MODE"
        :featured-product="featuredProduct"
        :featured-category-name="featuredCategoryName"
        @shop-now="scrollToProducts"
      />

      <CategoryGrid
        :categories="categories"
        :count-for="categoryCount"
        :selected-id="selectedCategoryId"
        @select="(id) => (selectedCategoryId = id)"
      />

      <p v-if="wishlist.showLovedOnly.value" class="catalog__result-note">Showing your wishlist only.</p>
      <p v-else-if="query.trim()" class="catalog__result-note">
        {{ filteredProducts.length }} result{{ filteredProducts.length === 1 ? '' : 's' }} for "{{ query.trim() }}"
      </p>

      <PromoTiles :copy="copy" />

      <ProductGridSection :title="copy.mostSellingTitle" :products="mostSelling" :category-name-for="categoryNameFor" />
      <ProductGridSection
        :title="copy.picksTitle"
        :products="picks.length > 0 ? picks : mostSelling"
        :category-name-for="categoryNameFor"
      />

      <FinalCta :copy="copy" @start="goToCheckout" />
    </template>
  </div>
</template>

<style scoped>
.catalog__state {
  padding: 96px 16px;
  text-align: center;
  color: var(--text-secondary);
}

.catalog__state--error {
  color: var(--danger);
}

.catalog__result-note {
  margin: var(--space-2) 2px 0;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
}
</style>
