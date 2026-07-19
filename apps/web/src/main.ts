import { createPosApp } from '@pos/core/app/createPosApp'
import { clearLocalPosCache, createBrowserPosRepository } from '@pos/data/index'
import { defaultSettings } from '@pos/shared/index'
import { consumePendingInitialSettings, readStaffTenant } from '@pos/web/tenantBinding'

// The local cache (packages/data's storageKeys — session, users, roles,
// settings, catalog, ...) is one global bucket per browser, not partitioned
// per organization/store. A browser that only ever uses the build-time
// VITE_POS_ORGANIZATION_SLUG/STORE_CODE tenant never needs this — it's the
// same tenant forever. But once a browser opts into multi-tenancy (signs up
// or pairs via /signup), switching which tenant it's bound to must wipe
// that cache first, or a stale session/catalog from whatever tenant this
// browser used previously leaks into the new one.
const CACHE_OWNER_KEY = 'pos_cache_tenant_owner'

async function bootstrap() {
  const boundTenant = readStaffTenant()
  const organizationSlug = boundTenant?.organizationSlug ?? import.meta.env.VITE_POS_ORGANIZATION_SLUG
  const storeCode = boundTenant?.storeCode ?? import.meta.env.VITE_POS_STORE_CODE

  if (boundTenant) {
    const activeTenantId = `${organizationSlug}/${storeCode}`
    const cachedTenantId = window.localStorage.getItem(CACHE_OWNER_KEY)
    if (cachedTenantId !== activeTenantId) {
      await clearLocalPosCache()
      window.localStorage.setItem(CACHE_OWNER_KEY, activeTenantId)
    }
  }

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
      organizationSlug,
      storeCode,
      deviceName: import.meta.env.VITE_POS_DEVICE_NAME,
      platform: 'web',
      appVersion: import.meta.env.VITE_POS_APP_VERSION ?? '0.1.0',
    },
  })

  // One business per store owner, for now: seed the store's settings from
  // what they entered on the signup form, so they don't land on empty
  // defaults and have to redo it in Settings. Queued by
  // src/onboarding/OnboardingPage.vue only on signup (never on pairing an
  // existing store), and applied at most once.
  const pendingSettings = consumePendingInitialSettings()
  if (pendingSettings) {
    await repository.saveSettings({
      ...defaultSettings,
      businessName: pendingSettings.businessName,
      businessMode: pendingSettings.businessMode,
      pairingCode: pendingSettings.pairingCode,
      syncMode: 'online-sync',
    })
  }

  const app = createPosApp({ repository })
  app.mount('#app')
}

void bootstrap()
