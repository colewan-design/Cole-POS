import { ref } from 'vue'

// Module-level so the header search field and the catalog page filter
// off the same value (same sharing pattern as cart.ts / catalog.ts).
const query = ref('')

export function useStorefrontSearch() {
  return { query }
}
