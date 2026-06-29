<script setup lang="ts">
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  Package,
  Plug,
  ReceiptText,
  ShoppingCart,
  Truck,
  UserCircle2,
  Users,
} from '@lucide/vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { usePosStore } from '@pos/core/stores/pos'

const emit = defineEmits<{ navigate: [] }>()
const route = useRoute()
const store = usePosStore()

const navItems = computed(() => [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { page: 'register', label: 'Register', icon: ShoppingCart, to: '/register' },
  { page: 'sales', label: 'Sales', icon: BarChart3, to: '/sales' },
  { page: 'orders', label: 'Orders', icon: ReceiptText, to: '/orders' },
  { page: 'products', label: 'Products', icon: Package, to: '/products' },
  { page: 'customers', label: 'Customers', icon: Users, to: '/customers' },
  { page: 'suppliers', label: 'Suppliers', icon: Truck, to: '/suppliers' },
  { page: 'employees', label: 'Employees', icon: UserCircle2, to: '/employees' },
  { page: 'inventory', label: 'Inventory', icon: Boxes, to: '/inventory' },
  { page: 'reports', label: 'Reports', icon: ShoppingCart, to: '/reports' },
  { page: 'integrations', label: 'Integrations', icon: Plug, to: '/integrations' },
])

function isActive(path: string) {
  return route.path === path
}
</script>

<template>
  <nav class="workspace-nav">
    <div class="workspace-nav__brand">
      <div class="workspace-nav__brand-mark">C</div>
      <div>
        <strong>ColePOS</strong>
        <p>{{ store.settings.businessName || 'Smart POS Solutions' }}</p>
      </div>
    </div>

    <RouterLink
      v-for="item in navItems"
      :key="item.page"
      class="workspace-nav__link"
      :class="{ 'workspace-nav__link--active': isActive(item.to) }"
      :to="item.to"
      @click="emit('navigate')"
    >
      <component :is="item.icon" :size="18" />
      <span>{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.workspace-nav {
  display: grid;
  gap: var(--space-2);
}

.workspace-nav__brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
  padding: var(--space-2) 0 var(--space-4);
  border-bottom: 1px solid var(--separator);
}

.workspace-nav__brand-mark {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--accent), var(--accent-pressed));
  color: var(--accent-text-on);
  display: grid;
  place-items: center;
  font: 700 1.1rem/1 var(--font-brand, var(--font-sans));
}

.workspace-nav__brand strong {
  display: block;
  font: var(--type-headline);
}

.workspace-nav__brand p {
  margin: 2px 0 0;
  color: var(--text-secondary);
  font: var(--type-caption);
}

.workspace-nav__link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 44px;
  padding: 0 var(--space-3);
  border-radius: 14px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}

.workspace-nav__link:hover {
  background: var(--fill);
  color: var(--text-primary);
}

.workspace-nav__link--active {
  background: linear-gradient(135deg, var(--accent), var(--accent-pressed));
  color: var(--accent-text-on);
  box-shadow: 0 12px 24px color-mix(in srgb, var(--accent) 22%, transparent);
}
</style>
