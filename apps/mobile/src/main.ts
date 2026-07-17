import { createPosApp } from '@pos/core/app/createPosApp'
import { createBrowserPosRepository } from '@pos/data/index'

const repository = createBrowserPosRepository({
  sync: {
    firebaseConfig: {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    },
    organizationSlug: import.meta.env.VITE_POS_ORGANIZATION_SLUG,
    storeCode: import.meta.env.VITE_POS_STORE_CODE,
    deviceName: import.meta.env.VITE_POS_DEVICE_NAME,
    platform: 'android',
    appVersion: import.meta.env.VITE_POS_APP_VERSION ?? '0.1.0',
  },
})
const app = createPosApp({ repository })

app.mount('#app')
