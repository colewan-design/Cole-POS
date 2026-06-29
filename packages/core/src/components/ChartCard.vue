<script setup lang="ts">
defineProps<{
  title: string
  summary: string
}>()
</script>

<template>
  <article class="chart-card">
    <h2 class="chart-card__title">{{ title }}</h2>
    <div class="chart-card__body">
      <slot />
    </div>
    <p class="sr-only">{{ summary }}</p>
  </article>
</template>

<style scoped>
.chart-card {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: var(--space-4);
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--bg-elevated) 94%, transparent);
}

.chart-card__title {
  margin: 0;
  font: var(--type-headline);
  color: var(--text-primary);
}

.chart-card__body {
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.chart-card--wide {
  grid-column: 1 / -1;
}
</style>
