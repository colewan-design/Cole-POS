import { createPosApp } from '@pos/core/app/createPosApp'
import { createBrowserPosRepository } from '@pos/data/index'

const repository = createBrowserPosRepository({
  sync: {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
    organizationSlug: import.meta.env.VITE_POS_ORGANIZATION_SLUG,
    storeCode: import.meta.env.VITE_POS_STORE_CODE,
    pairingCode: import.meta.env.VITE_POS_PAIRING_CODE,
    deviceName: import.meta.env.VITE_POS_DEVICE_NAME,
    platform: 'web',
    appVersion: import.meta.env.VITE_POS_APP_VERSION ?? '0.1.0',
  },
})
const app = createPosApp({ repository })

app.mount('#app')
