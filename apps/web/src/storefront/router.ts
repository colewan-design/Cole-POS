import { createRouter, createWebHistory } from 'vue-router'
import CatalogPage from '@pos/web/storefront/pages/CatalogPage.vue'
import CheckoutPage from '@pos/web/storefront/pages/CheckoutPage.vue'
import OrderStatusPage from '@pos/web/storefront/pages/OrderStatusPage.vue'

export function createStorefrontRouter() {
  return createRouter({
    history: createWebHistory('/store/'),
    routes: [
      { path: '/', name: 'catalog', component: CatalogPage },
      { path: '/checkout', name: 'checkout', component: CheckoutPage },
      { path: '/order/:orderId', name: 'order', component: OrderStatusPage, props: true },
    ],
  })
}
