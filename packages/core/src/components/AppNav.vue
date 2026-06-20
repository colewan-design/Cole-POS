<script setup lang="ts">
import { Bug, ChartColumn, Package, ReceiptText, Settings2, ShoppingBag } from '@lucide/vue'
import { computed } from 'vue'
import { appPageLabel, appPageKeys, type AppPageKey } from '@pos/shared/index'
import { useAuthStore } from '@pos/core/stores/auth'
import { usePosStore } from '@pos/core/stores/pos'

const emit = defineEmits<{ navigate: [] }>()
const store = usePosStore()
const auth = useAuthStore()
const lowStockCount = computed(() => store.lowStockProducts.length)

const navItems = computed(() =>
  appPageKeys
    .filter((page) => auth.canAccess(page))
    .map((page) => ({
      page,
      label: appPageLabel(page),
    })),
)

function iconFor(page: AppPageKey) {
  switch (page) {
    case 'register':
      return ShoppingBag
    case 'orders':
      return ReceiptText
    case 'products':
      return Package
    case 'analytics':
      return ChartColumn
    case 'settings':
      return Settings2
    case 'diagnostics':
      return Bug
  }
}

function pathFor(page: AppPageKey) {
  return page === 'register' ? '/' : `/${page}`
}
</script>

<template>
  <nav class="app-nav">
    <RouterLink
      v-for="item in navItems"
      :key="item.page"
      class="nav-link"
      :class="{ 'nav-link--badged': item.page === 'products' }"
      :to="pathFor(item.page)"
      @click="emit('navigate')"
    >
      <span v-if="item.page === 'products'" class="nav-link__icon-wrap">
        <component :is="iconFor(item.page)" :size="20" />
        <span v-if="lowStockCount > 0" class="nav-badge" :aria-label="`${lowStockCount} low stock`">{{ lowStockCount }}</span>
      </span>
      <component :is="iconFor(item.page)" v-else :size="20" />
      <span>{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.nav-link__icon-wrap {
  position: relative;
  display: inline-flex;
}

.nav-badge {
  position: absolute;
  top: -5px;
  right: -7px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 10px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
}
</style>
