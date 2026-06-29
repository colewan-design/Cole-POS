<script setup lang="ts">
defineProps<{
  label: string
  description?: string
}>()
</script>

<template>
  <section class="settings-card">
    <header class="settings-card__header">
      <p class="settings-card__title">{{ label }}</p>
      <p v-if="description" class="settings-card__description">{{ description }}</p>
    </header>
    <div class="settings-card__body">
      <slot />
    </div>
    <p v-if="$slots.footnote" class="settings-card__footnote">
      <slot name="footnote" />
    </p>
  </section>
</template>
