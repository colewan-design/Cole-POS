import { Capacitor } from '@capacitor/core'
import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import CatalogPage from './pages/CatalogPage.vue'
import ProductDetailPage from './pages/ProductDetailPage.vue'
import CheckoutPage from './pages/CheckoutPage.vue'
import OrderStatusPage from './pages/OrderStatusPage.vue'
import HistoryPage from './pages/HistoryPage.vue'
import SettingsPage from './pages/SettingsPage.vue'

export function createStorefrontRouter() {
  const history = Capacitor.isNativePlatform()
    ? createWebHashHistory()
    : createWebHistory('/store/')

  return createRouter({
    history,
    routes: [
      { path: '/', name: 'catalog', component: CatalogPage },
      { path: '/product/:productId', name: 'product', component: ProductDetailPage, props: true },
      { path: '/checkout', name: 'checkout', component: CheckoutPage },
      { path: '/history', name: 'history', component: HistoryPage },
      { path: '/settings', name: 'settings', component: SettingsPage },
      { path: '/order/:orderId', name: 'order', component: OrderStatusPage, props: true },
    ],
  })
}
