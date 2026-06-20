<script setup lang="ts">
import { AlertTriangle, X } from '@lucide/vue'
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePosStore } from '@pos/core/stores/pos'

const store = usePosStore()
const router = useRouter()
const timer = ref<ReturnType<typeof setTimeout> | null>(null)

function dismiss() {
  if (timer.value) clearTimeout(timer.value)
  store.clearLowStockAlert()
}

function viewProducts() {
  dismiss()
  void router.push('/products')
}

onMounted(() => {
  timer.value = setTimeout(dismiss, 8000)
})

onUnmounted(() => {
  if (timer.value) clearTimeout(timer.value)
})
</script>

<template>
  <div class="low-stock-toast" role="alert" aria-live="polite">
    <div class="low-stock-toast__icon">
      <AlertTriangle :size="18" />
    </div>
    <div class="low-stock-toast__body">
      <p class="low-stock-toast__title">Low stock alert</p>
      <ul class="low-stock-toast__list">
        <li v-for="product in store.lowStockAlert" :key="product.id">
          <span class="low-stock-toast__name">{{ product.name }}</span>
          <span v-if="product.stockQty === 0" class="low-stock-toast__badge low-stock-toast__badge--out">Out of stock</span>
          <span v-else class="low-stock-toast__badge low-stock-toast__badge--low">{{ product.stockQty }} left</span>
        </li>
      </ul>
      <button class="low-stock-toast__link" type="button" @click="viewProducts">View Products</button>
    </div>
    <button class="icon-button low-stock-toast__close" type="button" aria-label="Dismiss" @click="dismiss">
      <X :size="16" />
    </button>
  </div>
</template>

<style scoped>
.low-stock-toast {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: var(--color-surface-raised, #fff);
  border: 1px solid var(--color-warning, #f59e0b);
  border-left: 4px solid var(--color-warning, #f59e0b);
  border-radius: 10px;
  padding: 12px 14px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  max-width: 340px;
  width: 100%;
}

.low-stock-toast__icon {
  color: var(--color-warning, #f59e0b);
  flex-shrink: 0;
  padding-top: 1px;
}

.low-stock-toast__body {
  flex: 1;
  min-width: 0;
}

.low-stock-toast__title {
  font-size: 13px;
  font-weight: 600;
  margin: 0 0 6px;
  color: var(--color-label, #1c1c1e);
}

.low-stock-toast__list {
  list-style: none;
  padding: 0;
  margin: 0 0 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.low-stock-toast__list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
}

.low-stock-toast__name {
  color: var(--color-label, #1c1c1e);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.low-stock-toast__badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 20px;
  flex-shrink: 0;
}

.low-stock-toast__badge--low {
  background: rgba(245, 158, 11, 0.15);
  color: #92400e;
}

.low-stock-toast__badge--out {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

.low-stock-toast__link {
  background: none;
  border: none;
  padding: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-accent, #0071e3);
  cursor: pointer;
}

.low-stock-toast__close {
  flex-shrink: 0;
  color: var(--color-secondary-label, #6b7280);
}
</style>
