import { collection, getDocs, query, where } from 'firebase/firestore'
import { reactive } from 'vue'
import type { Category, Product } from '@pos/shared/index'
import { BUSINESS_MODE, ORG_SLUG, db } from '@pos/web/storefront/firebase'

interface FsCategory {
  name: string
}

interface FsProduct {
  categoryId: string | null
  sku: string
  barcode: string
  name: string
  priceCents: number
  taxRate: number | string
  productType: string
  imageUrl?: string
  unitLabel?: string
  isActive: boolean
  trackInventory: boolean
  businessModes: string[]
  stockQty: number | null
  lowStockThreshold: number | null
}

// Mirrors mapFsProduct in packages/data/src/firebase-sync.ts, but reads via a
// bare unauthenticated Firestore client instead of the staff sync session —
// see firebase.ts for why this can't reuse that authenticated code path.
function mapProduct(id: string, data: FsProduct): Product {
  const stockQty = data.trackInventory && data.stockQty != null ? Number(data.stockQty) : undefined
  return {
    id,
    categoryId: data.categoryId ?? 'uncategorized',
    sku: data.sku,
    barcode: data.barcode ?? '',
    name: data.name,
    priceCents: data.priceCents,
    taxRate: Number(data.taxRate),
    kind: data.productType === 'weighted' ? 'weighted' : 'standard',
    imageUrl: data.imageUrl,
    unitLabel: data.unitLabel,
    businessModes: (data.businessModes ?? []) as Product['businessModes'],
    outOfStock: data.isActive === false || (data.trackInventory && stockQty === 0),
    stockQty,
    lowStockThreshold: data.lowStockThreshold ?? undefined,
  }
}

export interface StorefrontCatalog {
  categories: Category[]
  products: Product[]
}

export async function loadStorefrontCatalog(): Promise<StorefrontCatalog> {
  const [categoriesSnap, productsSnap] = await Promise.all([
    getDocs(collection(db, 'organizations', ORG_SLUG, 'categories')),
    getDocs(
      query(
        collection(db, 'organizations', ORG_SLUG, 'products'),
        where('businessModes', 'array-contains', BUSINESS_MODE),
      ),
    ),
  ])

  const categories = categoriesSnap.docs.map((docSnap) => ({
    id: docSnap.id,
    name: (docSnap.data() as FsCategory).name,
  }))

  const products = productsSnap.docs
    .map((docSnap) => mapProduct(docSnap.id, docSnap.data() as FsProduct))
    .filter((product) => !product.outOfStock)

  return { categories, products }
}

interface StorefrontCatalogState extends StorefrontCatalog {
  loading: boolean
  error: string
}

// Module-level cache (same pattern as cart.ts) so the header nav and the
// catalog page can share one Firestore read instead of loading it twice.
const state = reactive<StorefrontCatalogState>({ categories: [], products: [], loading: true, error: '' })
let loadStarted = false

export function useStorefrontCatalog(): StorefrontCatalogState {
  if (!loadStarted) {
    loadStarted = true
    loadStorefrontCatalog()
      .then((catalog) => {
        state.categories = catalog.categories
        state.products = catalog.products
      })
      .catch(() => {
        state.error = "Couldn't load the menu — please refresh and try again."
      })
      .finally(() => {
        state.loading = false
      })
  }
  return state
}
