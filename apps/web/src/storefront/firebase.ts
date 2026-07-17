import { initializeApp, getApps, getApp } from 'firebase/app'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions'
import type { BusinessMode } from '@pos/shared/index'

// Unauthenticated Firebase client for the public storefront — deliberately
// separate from packages/data/src/firebase-sync.ts, which is coupled to the
// staff app's authenticated sync session (Auth, outbox, local cache). The
// storefront only ever reads the public catalog and calls the
// createOnlineOrder Cloud Function; it never signs in and never writes
// Firestore directly.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const db = getFirestore(app)
const functions = getFunctions(app)

// Local-only escape hatch to point the storefront at `firebase emulators:start`
// instead of the real project — never active in a production build.
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
}

export const ORG_SLUG: string = import.meta.env.VITE_POS_ORGANIZATION_SLUG
export const STORE_CODE: string = import.meta.env.VITE_POS_STORE_CODE
// The physical store's business mode is fixed per storefront deployment —
// unlike the staff app, the storefront has no authenticated way to read the
// store's settings doc (Firestore rules keep that staff-only), so it's
// configured directly via env instead.
export const BUSINESS_MODE = import.meta.env.VITE_POS_BUSINESS_MODE as BusinessMode

export interface CreateOnlineOrderItem {
  productId: string
  quantity: number
}

export interface CreateOnlineOrderGuest {
  name: string
  phone?: string
  email?: string
}

export interface CreateOnlineOrderResult {
  orderId: string
  ticketNumber: string
  totalCents: number
}

const createOnlineOrderCallable = httpsCallable<
  { orgSlug: string; storeCode: string; businessMode: BusinessMode; items: CreateOnlineOrderItem[]; guest: CreateOnlineOrderGuest },
  CreateOnlineOrderResult
>(functions, 'createOnlineOrder')

export async function createOnlineOrder(
  items: CreateOnlineOrderItem[],
  guest: CreateOnlineOrderGuest,
): Promise<CreateOnlineOrderResult> {
  const response = await createOnlineOrderCallable({
    orgSlug: ORG_SLUG,
    storeCode: STORE_CODE,
    businessMode: BUSINESS_MODE,
    items,
    guest,
  })
  return response.data
}
