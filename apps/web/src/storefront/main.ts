import { createApp } from 'vue'
import '@pos/core/styles/tokens.css'
import StorefrontApp from '@pos/web/storefront/StorefrontApp.vue'
import { createStorefrontRouter } from '@pos/web/storefront/router'

const app = createApp(StorefrontApp)
app.use(createStorefrontRouter())
app.mount('#store-app')
