import type { VercelRequest, VercelResponse } from '@vercel/node'
import { FieldValue, type Transaction } from 'firebase-admin/firestore'
import { ApiError, getDb, setCorsHeaders } from './_lib/admin'

// Ported from functions/src/index.ts's createOnlineOrder (Firebase Cloud
// Function) to a Vercel serverless function — the project stayed on
// Firebase's free Spark plan, which can't deploy Cloud Functions (that
// requires the paid Blaze plan). Logic is unchanged; only the transport
// (onCall/HttpsError -> plain HTTP + ApiError) and hosting differ.

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

interface FulfillmentInput {
  method: 'pickup' | 'delivery'
  address?: string
}

interface CreateOnlineOrderRequest {
  orgSlug: string
  storeCode: string
  businessMode: OnlineBusinessMode
  items: RequestItem[]
  guest: GuestInput
  fulfillment: FulfillmentInput
  paymentMethod?: 'cash' | 'ewallet'
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

function calculateTax(amountCents: number, rate: number): number {
  return Math.round(amountCents * rate)
}

async function createOnlineOrder(data: CreateOnlineOrderRequest) {
  const { orgSlug, storeCode, businessMode, items, guest, fulfillment, paymentMethod } = data

  if (!orgSlug || !storeCode) {
    throw new ApiError(400, 'orgSlug and storeCode are required.')
  }
  if (!SUPPORTED_MODES.includes(businessMode)) {
    throw new ApiError(400, 'Online ordering is not available for this business.')
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'Cart is empty.')
  }
  if (!guest?.name?.trim() || (!guest.phone?.trim() && !guest.email?.trim())) {
    throw new ApiError(400, 'A name and a phone or email are required.')
  }
  if (fulfillment?.method !== 'pickup' && fulfillment?.method !== 'delivery') {
    throw new ApiError(400, 'A fulfillment method of pickup or delivery is required.')
  }
  if (fulfillment.method === 'delivery' && !fulfillment.address?.trim()) {
    throw new ApiError(400, 'A delivery address is required.')
  }
  if (paymentMethod !== undefined && paymentMethod !== 'cash' && paymentMethod !== 'ewallet') {
    throw new ApiError(400, 'paymentMethod must be cash or ewallet.')
  }

  const db = getDb()
  const orgRef = db.doc(`organizations/${orgSlug}`)
  const storeRef = db.doc(`organizations/${orgSlug}/stores/${storeCode}`)
  const [orgSnap, storeSnap] = await Promise.all([orgRef.get(), storeRef.get()])
  if (!orgSnap.exists) {
    throw new ApiError(404, `Organization '${orgSlug}' not found.`)
  }
  if (!storeSnap.exists) {
    throw new ApiError(404, `Store '${storeCode}' not found under '${orgSlug}'.`)
  }

  const orderRef = storeRef.collection('orders').doc()
  const ticketNumber = orderRef.id.slice(0, 8).toUpperCase()

  return db.runTransaction(async (tx: Transaction) => {
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
        throw new ApiError(409, `Product '${item.productId}' is not available.`)
      }

      const product = snap.data() as FsProduct
      // Mirrors mapFsProduct's derivation in packages/data/src/firebase-sync.ts:
      // there is no stored "outOfStock" field — it's !isActive || stockQty === 0.
      const outOfStock = product.isActive === false || (product.trackInventory && (product.stockQty ?? 0) === 0)

      if (outOfStock || !product.businessModes?.includes(businessMode)) {
        throw new ApiError(409, `'${product.name ?? item.productId}' is not available.`)
      }
      if (product.trackInventory && (product.stockQty ?? 0) < quantity) {
        throw new ApiError(409, `'${product.name}' doesn't have enough stock.`)
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
      paymentMethod: paymentMethod ?? 'cash',
      fulfillmentMethod: fulfillment.method,
      deliveryAddress: fulfillment.method === 'delivery' ? fulfillment.address!.trim() : null,
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
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' })
    return
  }

  try {
    const result = await createOnlineOrder((req.body ?? {}) as CreateOnlineOrderRequest)
    res.status(200).json(result)
  } catch (err) {
    if (err instanceof ApiError) {
      res.status(err.status).json({ error: err.message })
      return
    }
    console.error('create-online-order failed:', err)
    res.status(500).json({ error: 'Something went wrong placing your order.' })
  }
}
