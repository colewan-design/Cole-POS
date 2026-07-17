import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue, type Transaction } from 'firebase-admin/firestore'

initializeApp()
const db = getFirestore()

// Kept in sync with packages/shared/src/index.ts's BusinessMode — online
// ordering only supports the modes that sell a fixed, cart-able catalog.
type OnlineBusinessMode = 'coffee-shop' | 'grocery' | 'restaurant'
const SUPPORTED_MODES: readonly OnlineBusinessMode[] = ['coffee-shop', 'grocery', 'restaurant']

interface RequestItem {
  productId: string
  quantity: number
}

interface GuestInput {
  name: string
  phone?: string
  email?: string
}

interface CreateOnlineOrderRequest {
  orgSlug: string
  storeCode: string
  businessMode: OnlineBusinessMode
  items: RequestItem[]
  guest: GuestInput
}

interface FsProduct {
  name: string
  priceCents: number
  taxRate: number | string
  businessModes: string[]
  isActive: boolean
  trackInventory: boolean
  stockQty: number | null
}

// Mirrors packages/shared/src/index.ts's calculateTax exactly — the whole
// point of this function is that the client never gets to set this number.
function calculateTax(amountCents: number, rate: number): number {
  return Math.round(amountCents * rate)
}

export const createOnlineOrder = onCall<CreateOnlineOrderRequest>(async (request) => {
  const data = request.data ?? ({} as CreateOnlineOrderRequest)
  const { orgSlug, storeCode, businessMode, items, guest } = data

  if (!orgSlug || !storeCode) {
    throw new HttpsError('invalid-argument', 'orgSlug and storeCode are required.')
  }
  if (!SUPPORTED_MODES.includes(businessMode)) {
    throw new HttpsError('invalid-argument', 'Online ordering is not available for this business.')
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpsError('invalid-argument', 'Cart is empty.')
  }
  if (!guest?.name?.trim() || (!guest.phone?.trim() && !guest.email?.trim())) {
    throw new HttpsError('invalid-argument', 'A name and a phone or email are required.')
  }

  const orgRef = db.doc(`organizations/${orgSlug}`)
  const storeRef = db.doc(`organizations/${orgSlug}/stores/${storeCode}`)
  const [orgSnap, storeSnap] = await Promise.all([orgRef.get(), storeRef.get()])
  if (!orgSnap.exists) {
    throw new HttpsError('not-found', `Organization '${orgSlug}' not found.`)
  }
  if (!storeSnap.exists) {
    throw new HttpsError('not-found', `Store '${storeCode}' not found under '${orgSlug}'.`)
  }

  const orderRef = storeRef.collection('orders').doc()
  const ticketNumber = orderRef.id.slice(0, 8).toUpperCase()

  const result = await db.runTransaction(async (tx: Transaction) => {
    // Reads first — Firestore transactions require every read before any write.
    const productRefs = items.map((item) => orgRef.collection('products').doc(item.productId))
    const productSnaps = await Promise.all(productRefs.map((ref) => tx.get(ref)))

    interface Line {
      productId: string
      name: string
      quantity: number
      unitPriceCents: number
      lineTotalCents: number
      trackInventory: boolean
    }
    const lines: Line[] = []
    let subtotalCents = 0
    let taxCents = 0

    productSnaps.forEach((snap, index) => {
      const item = items[index]
      const quantity = Number(item.quantity)

      if (!snap.exists || !Number.isFinite(quantity) || quantity <= 0) {
        throw new HttpsError('failed-precondition', `Product '${item.productId}' is not available.`)
      }

      const product = snap.data() as FsProduct
      // Mirrors mapFsProduct's derivation in packages/data/src/firebase-sync.ts:
      // there is no stored "outOfStock" field — it's !isActive || stockQty === 0.
      const outOfStock = product.isActive === false || (product.trackInventory && (product.stockQty ?? 0) === 0)

      if (outOfStock || !product.businessModes?.includes(businessMode)) {
        throw new HttpsError('failed-precondition', `'${product.name ?? item.productId}' is not available.`)
      }
      if (product.trackInventory && (product.stockQty ?? 0) < quantity) {
        throw new HttpsError('failed-precondition', `'${product.name}' doesn't have enough stock.`)
      }

      const lineSubtotal = Math.round(product.priceCents * quantity)
      const lineTax = calculateTax(lineSubtotal, Number(product.taxRate))
      subtotalCents += lineSubtotal
      taxCents += lineTax

      lines.push({
        productId: item.productId,
        name: product.name,
        quantity,
        unitPriceCents: product.priceCents,
        lineTotalCents: lineSubtotal,
        trackInventory: product.trackInventory,
      })
    })

    const totalCents = subtotalCents + taxCents

    // Writes.
    tx.set(orderRef, {
      ticketNumber,
      businessMode,
      orderType: 'takeaway',
      tableNumber: null,
      status: 'preparing',
      channel: 'online',
      paymentStatus: 'unpaid',
      paymentMethod: null,
      subtotalCents,
      taxCents,
      totalCents,
      tenderedCents: 0,
      changeCents: 0,
      customerId: null,
      guestContact: {
        name: guest.name.trim(),
        ...(guest.phone?.trim() ? { phone: guest.phone.trim() } : {}),
        ...(guest.email?.trim() ? { email: guest.email.trim() } : {}),
      },
      createdAt: FieldValue.serverTimestamp(),
      completedAt: FieldValue.serverTimestamp(),
    })

    lines.forEach((line, index) => {
      const itemRef = orderRef.collection('items').doc(`item-${index}`)
      tx.set(itemRef, {
        productId: line.productId,
        productName: line.name,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        lineTotalCents: line.lineTotalCents,
      })

      if (line.trackInventory) {
        tx.update(productRefs[index], { stockQty: FieldValue.increment(-line.quantity) })

        const invRef = storeRef.collection('inventoryLevels').doc(line.productId)
        tx.set(
          invRef,
          { qtyOnHand: FieldValue.increment(-line.quantity), updatedAt: FieldValue.serverTimestamp() },
          { merge: true },
        )

        const adjRef = storeRef.collection('inventoryAdjustments').doc()
        tx.set(adjRef, {
          productId: line.productId,
          orderId: orderRef.id,
          adjustmentType: 'sale',
          quantityDelta: -line.quantity,
          reason: `online-order:${ticketNumber}`,
          createdAt: FieldValue.serverTimestamp(),
        })
      }
    })

    return { orderId: orderRef.id, ticketNumber, totalCents }
  })

  return result
})
