import { createRouter, createWebHistory } from 'vue-router'
import AuthPage from '@pos/core/pages/AuthPage.vue'
import RegisterPage from '@pos/core/pages/RegisterPage.vue'
import OrdersPage from '@pos/core/pages/OrdersPage.vue'
import ProductsPage from '@pos/core/pages/ProductsPage.vue'
import SettingsPage from '@pos/core/pages/SettingsPage.vue'
import AnalyticsPage from '@pos/core/pages/AnalyticsPage.vue'
import DiagnosticsPage from '@pos/core/pages/DiagnosticsPage.vue'
import type { AppPageKey } from '@pos/shared/index'

declare module 'vue-router' {
  interface RouteMeta {
    publicOnly?: boolean
    pageKey?: AppPageKey
  }
}

export function createPosRouter() {
  return createRouter({
    history: createWebHistory('/app/'),
    routes: [
      { path: '/auth',        name: 'auth',        component: AuthPage, meta: { publicOnly: true } },
      { path: '/',            name: 'register',    component: RegisterPage, meta: { pageKey: 'register' } },
      { path: '/orders',      name: 'orders',      component: OrdersPage, meta: { pageKey: 'orders' } },
      { path: '/products',    name: 'products',    component: ProductsPage, meta: { pageKey: 'products' } },
      { path: '/analytics',   name: 'analytics',   component: AnalyticsPage, meta: { pageKey: 'analytics' } },
      { path: '/settings',    name: 'settings',    component: SettingsPage, meta: { pageKey: 'settings' } },
      { path: '/diagnostics', name: 'diagnostics', component: DiagnosticsPage, meta: { pageKey: 'diagnostics' } },
    ],
  })
}
