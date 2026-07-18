import { ref } from 'vue'

// Local-only order history so the History tab has somewhere to go — same
// spirit as wishlist.ts, since the storefront never authenticates a
// customer and has no server-side order list to fetch by identity.
const STORAGE_KEY = 'sf_order_history'
const MAX_ENTRIES = 20

export interface OrderHistoryEntry {
  orderId: string
  ticketNumber: string
  totalCents: number
  placedAt: string
}

function load(): OrderHistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as OrderHistoryEntry[]) : []
  } catch {
    return []
  }
}

const entries = ref<OrderHistoryEntry[]>(load())

export function useStorefrontOrderHistory() {
  function remember(order: { orderId: string; ticketNumber: string; totalCents: number }) {
    entries.value = [{ ...order, placedAt: new Date().toISOString() }, ...entries.value].slice(0, MAX_ENTRIES)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.value))
  }

  return { entries, remember }
}
