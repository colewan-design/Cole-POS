<script setup lang="ts">
import { computed, ref } from 'vue'
import { BUSINESS_MODE } from '@pos/web/storefront/firebase'
import { useStorefrontCatalog } from '@pos/web/storefront/catalog'
import { useStorefrontSearch } from '@pos/web/storefront/search'
import { useStorefrontWishlist } from '@pos/web/storefront/wishlist'
import { storefrontCopy } from '@pos/web/storefront/copy'
import HeroBanner from '@pos/web/storefront/components/HeroBanner.vue'
import PromoTiles from '@pos/web/storefront/components/PromoTiles.vue'
import CategoryGrid from '@pos/web/storefront/components/CategoryGrid.vue'
import ProductGridSection from '@pos/web/storefront/components/ProductGridSection.vue'
import FinalCta from '@pos/web/storefront/components/FinalCta.vue'

const catalog = useStorefrontCatalog()
const { query } = useStorefrontSearch()
const wishlist = useStorefrontWishlist()
const copy = storefrontCopy(BUSINESS_MODE)

const selectedCategoryId = ref<string | null>(null)

function categoryNameFor(categoryId: string): string {
  return catalog.categories.find((category) => category.id === categoryId)?.name ?? 'Uncategorized'
}

function countFor(categoryId: string): number {
  return catalog.products.filter((product) => product.categoryId === categoryId).length
}

const visibleProducts = computed(() => {
  let items = catalog.products
  const q = query.value.trim().toLowerCase()
  if (q) items = items.filter((product) => product.name.toLowerCase().includes(q))
  if (wishlist.showLovedOnly.value) items = items.filter((product) => wishlist.has(product.id))
  return items
})

const featuredProduct = computed(() => catalog.products[0] ?? null)
const featuredCategoryName = computed(() =>
  featuredProduct.value ? categoryNameFor(featuredProduct.value.categoryId) : '',
)

const mostSelling = computed(() => visibleProducts.value.slice(0, 5))
const freshPicks = computed(() => {
  const rest = visibleProducts.value.slice(5)
  const base = rest.length > 0 ? rest : visibleProducts.value
  return selectedCategoryId.value ? base.filter((product) => product.categoryId === selectedCategoryId.value) : base
})

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div class="catalog">
    <p v-if="catalog.loading" class="catalog__state">Loading menu…</p>
    <p v-else-if="catalog.error" class="catalog__state catalog__state--error">{{ catalog.error }}</p>
    <p v-else-if="catalog.products.length === 0" class="catalog__state">Nothing available to order right now.</p>

    <template v-else>
      <HeroBanner
        :copy="copy"
        :business-mode="BUSINESS_MODE"
        :featured-product="featuredProduct"
        :featured-category-name="featuredCategoryName"
        @shop-now="scrollToSection('categories')"
      />

      <PromoTiles :copy="copy" />

      <CategoryGrid
        :categories="catalog.categories"
        :count-for="countFor"
        :selected-id="selectedCategoryId"
        @select="(id) => (selectedCategoryId = id)"
      />

      <p v-if="wishlist.showLovedOnly.value" class="catalog__filter-note">
        Showing only your loved items — {{ visibleProducts.length }} match{{ visibleProducts.length === 1 ? '' : 'es' }}.
      </p>
      <p v-else-if="query.trim()" class="catalog__filter-note">
        {{ visibleProducts.length }} result{{ visibleProducts.length === 1 ? '' : 's' }} for “{{ query }}”
      </p>

      <ProductGridSection :title="copy.mostSellingTitle" :products="mostSelling" :category-name-for="categoryNameFor" />

      <ProductGridSection :title="copy.picksTitle" :products="freshPicks" :category-name-for="categoryNameFor" />

      <FinalCta :copy="copy" @start="scrollToSection('top')" />
    </template>
  </div>
</template>

<style scoped>
.catalog {
  padding-bottom: var(--space-16);
}

.catalog__state {
  padding: var(--space-16) 0;
  text-align: center;
  color: var(--text-secondary);
}

.catalog__state--error {
  color: var(--danger);
}

.catalog__filter-note {
  margin: var(--space-4) 0 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}
</style>
