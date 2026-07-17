import { computed, reactive } from 'vue'
import { calculateTax, type Product } from '@pos/shared/index'

interface CartLine {
  product: Product
  quantity: number
}

// Module-level (not per-component) so the cart persists as the customer
// navigates between the catalog and checkout pages. Totals shown here are
// for the customer's convenience only — createOnlineOrder in firebase.ts
// recomputes the authoritative subtotal/tax/total server-side from the real
// product prices, exactly as packages/core/src/stores/pos.ts's cart does for
// the in-person register.
const lines = reactive(new Map<string, CartLine>())

export function useStorefrontCart() {
  function add(product: Product) {
    const existing = lines.get(product.id)
    lines.set(product.id, { product, quantity: (existing?.quantity ?? 0) + 1 })
  }

  function decrement(productId: string) {
    const existing = lines.get(productId)
    if (!existing) return
    if (existing.quantity <= 1) {
      lines.delete(productId)
      return
    }
    lines.set(productId, { ...existing, quantity: existing.quantity - 1 })
  }

  function remove(productId: string) {
    lines.delete(productId)
  }

  function clear() {
    lines.clear()
  }

  const cartLines = computed(() => Array.from(lines.values()))
  const itemCount = computed(() => cartLines.value.reduce((sum, line) => sum + line.quantity, 0))
  const subtotalCents = computed(() =>
    cartLines.value.reduce((sum, line) => sum + Math.round(line.product.priceCents * line.quantity), 0),
  )
  const taxCents = computed(() =>
    cartLines.value.reduce(
      (sum, line) => sum + calculateTax(Math.round(line.product.priceCents * line.quantity), line.product.taxRate),
      0,
    ),
  )
  const totalCents = computed(() => subtotalCents.value + taxCents.value)

  return { cartLines, itemCount, subtotalCents, taxCents, totalCents, add, decrement, remove, clear }
}
