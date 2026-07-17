import { computed, reactive, ref } from 'vue'

// Local-only "Loved" list — the storefront never authenticates a customer
// (see firebase.ts), so there's no account to persist this against. It's
// session-scoped UI state, same spirit as the promo field on the register.
const loved = reactive(new Set<string>())
const showLovedOnly = ref(false)

export function useStorefrontWishlist() {
  function toggle(productId: string) {
    if (loved.has(productId)) loved.delete(productId)
    else loved.add(productId)
  }

  function has(productId: string): boolean {
    return loved.has(productId)
  }

  function toggleLovedOnly() {
    showLovedOnly.value = !showLovedOnly.value
  }

  const count = computed(() => loved.size)

  return { toggle, has, count, showLovedOnly, toggleLovedOnly }
}
