<script setup lang="ts">
export type Range = 'today' | 'week' | 'month' | 'all'

defineProps<{ modelValue: Range }>()
const emit = defineEmits<{ 'update:modelValue': [value: Range] }>()

const OPTIONS: { value: Range; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All' },
]
</script>

<template>
  <div class="range-selector" role="group" aria-label="Time range">
    <button
      v-for="opt in OPTIONS"
      :key="opt.value"
      type="button"
      class="range-btn"
      :class="{ 'range-btn--active': modelValue === opt.value }"
      :aria-pressed="modelValue === opt.value"
      @click="emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped>
.range-selector {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  padding: 4px;
  border-radius: var(--radius-pill);
  background: var(--fill);
  min-width: 0;
  max-width: 100%;
}

.range-btn {
  min-height: 36px;
  padding: 0 var(--space-3);
  border: none;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--text-secondary);
  font: var(--type-subhead);
  font-weight: 500;
  cursor: pointer;
  transition:
    background var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out),
    box-shadow var(--dur-fast) var(--ease-out);
}

.range-btn--active {
  background: var(--bg-elevated);
  color: var(--accent);
  box-shadow: var(--shadow-sm);
}

.range-btn:not(.range-btn--active):hover {
  color: var(--text-primary);
}

.range-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
