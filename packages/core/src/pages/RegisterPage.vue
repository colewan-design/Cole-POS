<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Printer } from '@lucide/vue'
import GroceryOrderPanel from '@pos/core/components/GroceryOrderPanel.vue'
import GroceryProductGrid from '@pos/core/components/GroceryProductGrid.vue'
import LowStockToast from '@pos/core/components/LowStockToast.vue'
import NailSalonOrderPanel from '@pos/core/components/NailSalonOrderPanel.vue'
import NailSalonProductGrid from '@pos/core/components/NailSalonProductGrid.vue'
import OrderPanel from '@pos/core/components/OrderPanel.vue'
import ProductGrid from '@pos/core/components/ProductGrid.vue'
import RestaurantOrderPanel from '@pos/core/components/RestaurantOrderPanel.vue'
import RestaurantProductGrid from '@pos/core/components/RestaurantProductGrid.vue'
import ShiftPanel from '@pos/core/components/ShiftPanel.vue'
import { usePosStore } from '@pos/core/stores/pos'
import { printReceipt } from '@pos/core/utils/receipt'

const store = usePosStore()

onMounted(() => {
  if (!store.isReady) {
    void store.initialize()
  }
})

const isGrocery = computed(() => store.settings.businessMode === 'grocery')
const isRestaurant = computed(() => store.settings.businessMode === 'restaurant')
const isNailSalon = computed(() => store.settings.businessMode === 'nail-salon')

function handlePrintReceipt() {
  if (!store.lastCompletedOrder) return
  printReceipt(store.lastCompletedOrder, {
    name: store.settings.businessName,
    imageUrl: store.settings.businessImageUrl,
  })
}
</script>

<template>
  <div class="page-stack">
    <ShiftPanel />

    <div v-if="store.lastCompletedOrder" class="success-banner register-success-banner">
      <span>Payment captured for ticket {{ store.lastCompletedOrder.ticketNumber }}.</span>
      <button class="secondary-button register-success-banner__print" type="button" @click="handlePrintReceipt">
        <Printer :size="15" />
        <span>Print receipt</span>
      </button>
    </div>

    <div v-if="store.lowStockAlert.length" class="register-toast-area">
      <LowStockToast />
    </div>

    <div class="register-layout">
      <RestaurantProductGrid v-if="isRestaurant" />
      <GroceryProductGrid v-else-if="isGrocery" />
      <NailSalonProductGrid v-else-if="isNailSalon" />
      <ProductGrid v-else />
      <RestaurantOrderPanel v-if="isRestaurant" />
      <GroceryOrderPanel v-else-if="isGrocery" />
      <NailSalonOrderPanel v-else-if="isNailSalon" />
      <OrderPanel v-else />
    </div>
  </div>
</template>

<style scoped>
.register-success-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.register-success-banner__print {
  flex: none;
  min-height: 36px;
  padding: 0 var(--space-3);
}
</style>
