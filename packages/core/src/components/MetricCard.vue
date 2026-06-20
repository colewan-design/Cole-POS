<script setup lang="ts">
defineProps<{
  label: string
  value: string
  delta?: { value: string; positive: boolean } | null
}>()
</script>

<template>
  <article class="metric-card">
    <p class="metric-card__label">{{ label }}</p>
    <strong class="metric-card__value">{{ value }}</strong>
    <p
      v-if="delta != null"
      class="metric-card__delta"
      :class="delta.positive ? 'metric-card__delta--up' : 'metric-card__delta--down'"
    >
      {{ delta.positive ? '↑' : '↓' }} {{ delta.value }}
    </p>
  </article>
</template>

<style scoped>
.metric-card {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--bg-elevated) 94%, transparent);
}

.metric-card__label {
  margin: 0;
  color: var(--text-secondary);
  font: var(--type-caption);
}

.metric-card__value {
  font: var(--type-title2);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}

.metric-card__delta {
  margin: 0;
  font: var(--type-caption);
  font-variant-numeric: tabular-nums;
}

.metric-card__delta--up   { color: var(--success); }
.metric-card__delta--down { color: var(--danger); }
</style>
