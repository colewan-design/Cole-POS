<script setup lang="ts">
import { Check, ChevronDown, Coffee, LogOut, Menu, Search, ShoppingBasket, Store, UserCircle2, UtensilsCrossed } from '@lucide/vue'
import { computed, onMounted, onUnmounted, ref, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppNav from '@pos/core/components/AppNav.vue'
import { useAuthStore } from '@pos/core/stores/auth'
import { usePosStore } from '@pos/core/stores/pos'
import { businessModeLabel, type BusinessMode } from '@pos/shared/index'

const store = usePosStore()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const navOpen = ref(false)
const modeOpen = ref(false)
const modeButtonRef = ref<HTMLElement | null>(null)

const isGrocery = computed(() => store.settings.businessMode === 'grocery')
const isRestaurant = computed(() => store.settings.businessMode === 'restaurant')
const fallbackModeLabel = computed(() => businessModeLabel(store.settings.businessMode))
const modeLabel = computed(() => store.settings.businessName.trim() || fallbackModeLabel.value)
const showShellChrome = computed(() => route.name !== 'auth' && !!auth.currentUser)

function closeNav() {
  navOpen.value = false
}

function handleDocumentClick(e: MouseEvent) {
  if (modeOpen.value && !modeButtonRef.value?.contains(e.target as Node)) {
    modeOpen.value = false
  }
}

async function switchMode(mode: BusinessMode) {
  store.clearCart()
  await store.updateSettings({ ...store.settings, businessMode: mode })
  modeOpen.value = false
}

async function handleLogout() {
  closeNav()
  await auth.logout()
  await router.replace({ name: 'auth' })
}

onMounted(() => {
  if (!store.isReady) {
    void store.initialize()
  }
  if (!auth.isReady) {
    void auth.initialize()
  }
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})

watchEffect(() => {
  const appearance = store.settings.appearance
  if (appearance === 'light' || appearance === 'dark') {
    document.documentElement.dataset.theme = appearance
  } else {
    delete document.documentElement.dataset.theme
  }
})
</script>

<template>
  <div class="app-shell">
    <header v-if="showShellChrome" class="top-bar">
      <button class="icon-button" type="button" aria-label="Menu" @click="navOpen = !navOpen">
        <Menu :size="20" />
      </button>

      <div ref="modeButtonRef" class="brand-wrapper">
        <button
          class="brand-button"
          type="button"
          :aria-label="modeLabel"
          @click="modeOpen = !modeOpen"
        >
          <span
            class="brand-button__icon"
            :class="{
              'brand-button__icon--green': isGrocery,
              'brand-button__icon--orange': isRestaurant,
            }"
          >
            <img
              v-if="store.settings.businessImageUrl"
              class="brand-button__image"
              :src="store.settings.businessImageUrl"
              :alt="modeLabel"
            >
            <ShoppingBasket v-else-if="isGrocery" :size="16" />
            <UtensilsCrossed v-else-if="isRestaurant" :size="16" />
            <Store v-else :size="16" />
          </span>
          <span class="brand-button__name">{{ modeLabel }}</span>
          <ChevronDown :size="14" class="brand-button__chevron" />
        </button>

        <div v-if="modeOpen" class="mode-dropdown">
          <button
            class="mode-option"
            :class="{ active: store.settings.businessMode === 'coffee-shop' }"
            type="button"
            @click="switchMode('coffee-shop')"
          >
            <Coffee :size="16" />
            <span>Coffee Shop</span>
            <Check v-if="store.settings.businessMode === 'coffee-shop'" :size="14" class="mode-option__check" />
          </button>
          <button
            class="mode-option"
            :class="{ active: isGrocery }"
            type="button"
            @click="switchMode('grocery')"
          >
            <ShoppingBasket :size="16" />
            <span>Fresh Market</span>
            <Check v-if="isGrocery" :size="14" class="mode-option__check" />
          </button>
          <button
            class="mode-option"
            :class="{ active: isRestaurant }"
            type="button"
            @click="switchMode('restaurant')"
          >
            <UtensilsCrossed :size="16" />
            <span>Restaurant</span>
            <Check v-if="isRestaurant" :size="14" class="mode-option__check" />
          </button>
        </div>
      </div>

      <div class="top-bar__actions">
        <button class="icon-button" type="button" aria-label="Search">
          <Search :size="20" />
        </button>
        <div class="top-bar__user">
          <UserCircle2 :size="18" />
          <span>{{ auth.currentUser?.fullName }}</span>
        </div>
        <button class="icon-button" type="button" aria-label="Log out" @click="handleLogout">
          <LogOut :size="20" />
        </button>
      </div>

      <AppNav v-if="navOpen" class="app-nav--dropdown" @navigate="closeNav" />
    </header>

    <main class="shell-content">
      <RouterView />
    </main>
  </div>
</template>
