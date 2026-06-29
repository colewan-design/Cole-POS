import { createRouter, createWebHistory } from 'vue-router'
import AuthPage from '@pos/core/pages/AuthPage.vue'
import DashboardPage from '@pos/core/pages/DashboardPage.vue'
import RegisterPage from '@pos/core/pages/RegisterPage.vue'
import OrdersPage from '@pos/core/pages/OrdersPage.vue'
import ProductsPage from '@pos/core/pages/ProductsPage.vue'
import SalesPage from '@pos/core/pages/SalesPage.vue'
import SettingsPage from '@pos/core/pages/SettingsPage.vue'
import WorkspacePage from '@pos/core/pages/WorkspacePage.vue'
import InventoryPage from '@pos/core/pages/InventoryPage.vue'
import DiagnosticsPage from '@pos/core/pages/DiagnosticsPage.vue'
import EmployeesPage from '@pos/core/pages/EmployeesPage.vue'
import CustomersPage from '@pos/core/pages/CustomersPage.vue'
import SuppliersPage from '@pos/core/pages/SuppliersPage.vue'
import ReportsPage from '@pos/core/pages/ReportsPage.vue'
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
      { path: '/',            redirect: { name: 'dashboard' } },
      { path: '/dashboard',   name: 'dashboard',   component: DashboardPage, meta: { pageKey: 'dashboard' } },
      { path: '/sales',       name: 'sales',       component: SalesPage, meta: { pageKey: 'sales' } },
      { path: '/orders',      name: 'orders',      component: OrdersPage, meta: { pageKey: 'orders' } },
      { path: '/products',    name: 'products',    component: ProductsPage, meta: { pageKey: 'products' } },
      { path: '/customers',   name: 'customers',   component: CustomersPage, meta: { pageKey: 'customers' } },
      { path: '/suppliers',   name: 'suppliers',   component: SuppliersPage, meta: { pageKey: 'suppliers' } },
      { path: '/employees',   name: 'employees',   component: EmployeesPage, meta: { pageKey: 'employees' } },
      { path: '/inventory',   name: 'inventory',   component: InventoryPage, meta: { pageKey: 'inventory' } },
      { path: '/reports',     name: 'reports',     component: ReportsPage, meta: { pageKey: 'reports' } },
      { path: '/integrations',name: 'integrations',component: WorkspacePage, meta: { pageKey: 'integrations' }, props: { title: 'Integrations', description: 'Connect third-party services, payment providers, and delivery channels.' } },
      { path: '/register',    name: 'register',    component: RegisterPage, meta: { pageKey: 'register' } },
      { path: '/settings',    name: 'settings',    component: SettingsPage, meta: { pageKey: 'settings' } },
      { path: '/diagnostics', name: 'diagnostics', component: DiagnosticsPage, meta: { pageKey: 'diagnostics' } },
    ],
  })
}
