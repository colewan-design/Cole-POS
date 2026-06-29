import { createPosApp } from '@pos/core/app/createPosApp'
import { createBrowserPosRepository } from '@pos/data/index'

const repository = createBrowserPosRepository({
  sync: {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    organizationSlug: import.meta.env.VITE_POS_ORGANIZATION_SLUG,
    storeCode: import.meta.env.VITE_POS_STORE_CODE,
    deviceName: import.meta.env.VITE_POS_DEVICE_NAME,
    platform: 'web',
    appVersion: import.meta.env.VITE_POS_APP_VERSION ?? '0.1.0',
  },
})
const app = createPosApp({ repository })

app.mount('#app')
