<script setup lang="ts">
import { computed, onMounted } from 'vue'
import GroceryOrderPanel from '@pos/core/components/GroceryOrderPanel.vue'
import GroceryProductGrid from '@pos/core/components/GroceryProductGrid.vue'
import LowStockToast from '@pos/core/components/LowStockToast.vue'
import OrderPanel from '@pos/core/components/OrderPanel.vue'
import ProductGrid from '@pos/core/components/ProductGrid.vue'
import RestaurantOrderPanel from '@pos/core/components/RestaurantOrderPanel.vue'
import RestaurantProductGrid from '@pos/core/components/RestaurantProductGrid.vue'
import ShiftPanel from '@pos/core/components/ShiftPanel.vue'
import { usePosStore } from '@pos/core/stores/pos'

const store = usePosStore()

onMounted(() => {
  if (!store.isReady) {
    void store.initialize()
  }
})

const isGrocery = computed(() => store.settings.businessMode === 'grocery')
const isRestaurant = computed(() => store.settings.businessMode === 'restaurant')
</script>

<template>
  <div class="page-stack">
    <ShiftPanel />

    <div v-if="store.lastCompletedOrder" class="success-banner">
      Payment captured for ticket {{ store.lastCompletedOrder.ticketNumber }}.
    </div>

    <div v-if="store.lowStockAlert.length" class="register-toast-area">
      <LowStockToast />
    </div>

    <div class="register-layout">
      <RestaurantProductGrid v-if="isRestaurant" />
      <GroceryProductGrid v-else-if="isGrocery" />
      <ProductGrid v-else />
      <RestaurantOrderPanel v-if="isRestaurant" />
      <GroceryOrderPanel v-else-if="isGrocery" />
      <OrderPanel v-else />
    </div>
  </div>
</template>
