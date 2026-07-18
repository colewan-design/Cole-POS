<script setup lang="ts">
import { ref } from 'vue'
import StorefrontApp from './StorefrontApp.vue'
import StoreCodeEntry from './components/StoreCodeEntry.vue'
import { useStorefrontPairing } from './pairing'

const pairing = useStorefrontPairing()
const ready = ref(false)

// Runs once during setup, before the first render — if a pairing already
// exists (from a previous launch, or the dev-mode default), apply it
// synchronously so StorefrontApp never mounts before ORG_SLUG/BUSINESS_MODE
// are set. See setStorefrontContext in @pos/web/storefront/firebase.
if (pairing.current.value) {
  pairing.apply(pairing.current.value)
  ready.value = true
}

function handlePaired() {
  ready.value = true
}
</script>

<template>
  <StoreCodeEntry v-if="!ready" @paired="handlePaired" />
  <StorefrontApp v-else />
</template>
