<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { ChevronDown, Heart, Search, ShoppingBag, User } from '@lucide/vue'
import { businessModeLabel } from '@pos/shared/index'
import { BUSINESS_MODE } from '@pos/web/storefront/firebase'
import { useStorefrontCart } from '@pos/web/storefront/cart'
import { useStorefrontCatalog } from '@pos/web/storefront/catalog'
import { useStorefrontSearch } from '@pos/web/storefront/search'
import { useStorefrontWishlist } from '@pos/web/storefront/wishlist'
import { storefrontCopy } from '@pos/web/storefront/copy'

const { itemCount } = useStorefrontCart()
const { count: lovedCount, showLovedOnly, toggleLovedOnly } = useStorefrontWishlist()
const { query } = useStorefrontSearch()
const catalog = useStorefrontCatalog()
const copy = storefrontCopy(BUSINESS_MODE)

const categoriesOpen = ref(false)
const dropdownEl = ref<HTMLElement | null>(null)
const dropdownTriggerEl = ref<HTMLElement | null>(null)
const dropdownPanelEl = ref<HTMLElement | null>(null)
const dropdownPos = ref({ top: 0, left: 0 })

// Teleported to <body> (see template) so the panel can't be clipped by
// storefront__nav-scroll's overflow-x: auto — per the CSS overflow spec,
// pairing overflow-x: auto with overflow-y: visible on the same element
// computes overflow-y to auto too, which was clipping the panel.
function updateDropdownPos() {
  const rect = dropdownTriggerEl.value?.getBoundingClientRect()
  if (!rect) return
  dropdownPos.value = { top: rect.bottom + 10, left: rect.left }
}

function toggleCategories() {
  categoriesOpen.value = !categoriesOpen.value
  if (categoriesOpen.value) updateDropdownPos()
}

function scrollToSection(id: string) {
  categoriesOpen.value = false
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function handleOutsideClick(event: MouseEvent) {
  if (!categoriesOpen.value) return
  const target = event.target as Node
  if (dropdownEl.value?.contains(target) || dropdownPanelEl.value?.contains(target)) return
  categoriesOpen.value = false
}

function handleReposition() {
  if (categoriesOpen.value) updateDropdownPos()
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
  window.addEventListener('resize', handleReposition)
  window.addEventListener('scroll', handleReposition, true)
})
onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
  window.removeEventListener('resize', handleReposition)
  window.removeEventListener('scroll', handleReposition, true)
})
</script>

<template>
  <div class="storefront">
    <header class="storefront__header">
      <div class="storefront__header-inner">
        <div class="storefront__topbar">
          <RouterLink to="/" class="storefront__brand">
            Cole POS <span class="storefront__brand-mode">&middot; {{ businessModeLabel(BUSINESS_MODE) }}</span>
          </RouterLink>

          <label class="storefront__search">
            <Search :size="16" />
            <input v-model="query" type="search" placeholder="Search products..." />
          </label>

          <div class="storefront__utility">
            <button
              type="button"
              class="storefront__icon-btn"
              :class="{ 'storefront__icon-btn--active': showLovedOnly }"
              title="Show loved items"
              @click="toggleLovedOnly(); scrollToSection('categories')"
            >
              <Heart :size="18" :fill="lovedCount > 0 ? 'currentColor' : 'none'" />
              <span v-if="lovedCount > 0" class="storefront__icon-count">{{ lovedCount }}</span>
            </button>
            <RouterLink to="/checkout" class="storefront__icon-btn" title="Cart">
              <ShoppingBag :size="18" />
              <span v-if="itemCount > 0" class="storefront__icon-count">{{ itemCount }}</span>
            </RouterLink>
            <button type="button" class="storefront__login" title="Coming soon">
              <User :size="15" />
              Login/Signup
            </button>
          </div>
        </div>

        <div class="storefront__nav-scroll">
          <nav class="storefront__nav">
            <div class="storefront__nav-primary">
              <a href="#top" class="storefront__nav-link" @click.prevent="scrollToSection('top')">Shop</a>
              <div class="storefront__nav-dropdown" ref="dropdownEl">
                <button ref="dropdownTriggerEl" type="button" class="storefront__nav-link" @click="toggleCategories">
                  Categories <ChevronDown :size="14" />
                </button>
                <Teleport to="body">
                  <div
                    v-if="categoriesOpen"
                    ref="dropdownPanelEl"
                    class="storefront__dropdown-panel"
                    :style="{ top: `${dropdownPos.top}px`, left: `${dropdownPos.left}px` }"
                  >
                    <p v-if="catalog.categories.length === 0" class="storefront__dropdown-empty">No categories yet</p>
                    <button
                      v-for="category in catalog.categories"
                      :key="category.id"
                      type="button"
                      class="storefront__dropdown-item"
                      @click="scrollToSection('categories')"
                    >
                      {{ category.name }}
                    </button>
                  </div>
                </Teleport>
              </div>
              <a href="#deals" class="storefront__nav-link" @click.prevent="scrollToSection('deals')">Deals</a>
              <a href="#categories" class="storefront__nav-link" @click.prevent="scrollToSection('categories')">{{
                copy.navFourthLabel
              }}</a>
              <button type="button" class="storefront__nav-link">About</button>
            </div>
            <div class="storefront__nav-secondary">
              <button type="button" class="storefront__nav-link storefront__nav-link--muted">Policy</button>
              <button type="button" class="storefront__nav-link storefront__nav-link--muted">FAQ's</button>
              <button type="button" class="storefront__nav-link storefront__nav-link--muted">Help &amp; Support</button>
            </div>
          </nav>
        </div>
      </div>
    </header>

    <main id="top" class="storefront__main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.storefront {
  min-height: 100vh;
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font-sans);
}

.storefront__header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--separator);
}

.storefront__header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-6);
  overflow: visible;
}

.storefront__topbar {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-6);
  padding: var(--space-4) 0;
}

.storefront__brand {
  flex-shrink: 0;
  font-weight: 800;
  font-size: 1.05rem;
  letter-spacing: -0.01em;
  color: var(--text-primary);
  text-decoration: none;
  white-space: nowrap;
}

.storefront__brand-mode {
  font-weight: 500;
  color: var(--text-secondary);
}

.storefront__search {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  padding: 9px var(--space-4);
  border-radius: var(--radius-pill);
  background: var(--fill);
  color: var(--text-tertiary);
}

.storefront__search input {
  flex: 1;
  min-width: 0;
  border: none;
  background: none;
  outline: none;
  font-size: 14px;
  font-family: inherit;
  color: var(--text-primary);
}

.storefront__utility {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
  flex-shrink: 0;
}

.storefront__icon-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid var(--separator);
  border-radius: 50%;
  background: var(--bg-elevated);
  color: var(--text-primary);
  text-decoration: none;
  cursor: pointer;
}

.storefront__icon-btn--active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.storefront__icon-count {
  position: absolute;
  top: -4px;
  right: -4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: var(--radius-pill);
  background: var(--accent);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

.storefront__login {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px var(--space-4);
  border: none;
  border-radius: var(--radius-pill);
  background: var(--text-primary);
  color: var(--bg-elevated);
  font-family: inherit;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}

.storefront__nav-scroll {
  overflow-x: auto;
  overflow-y: visible;
  padding: var(--space-2) 0 var(--space-3);
}

.storefront__nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  min-width: max-content;
  position: relative;
}

.storefront__nav-primary,
.storefront__nav-secondary {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  flex-shrink: 0;
}

.storefront__nav-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: none;
  padding: 0;
  color: var(--text-primary);
  font-family: inherit;
  font-weight: 600;
  font-size: 13.5px;
  text-decoration: none;
  cursor: pointer;
  white-space: nowrap;
}

.storefront__nav-link--muted {
  color: var(--text-tertiary);
  font-weight: 500;
  font-size: 12.5px;
}

.storefront__nav-dropdown {
  position: relative;
  overflow: visible;
}

.storefront__dropdown-panel {
  position: fixed;
  z-index: 30;
  display: flex;
  flex-direction: column;
  min-width: 180px;
  padding: var(--space-2);
  border: 1px solid var(--separator);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-lg);
}

.storefront__dropdown-empty {
  margin: 0;
  padding: var(--space-2) var(--space-3);
  color: var(--text-tertiary);
  font-size: 13px;
}

.storefront__dropdown-item {
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: var(--radius-sm);
  background: none;
  text-align: left;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
}

.storefront__dropdown-item:hover {
  background: var(--fill);
}

.storefront__main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-6) var(--space-16);
}

@media (max-width: 720px) {
  .storefront__header-inner {
    padding: 0 var(--space-4);
  }

  .storefront__topbar {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  .storefront__search {
    order: 3;
    flex-basis: 100%;
  }
}
</style>
