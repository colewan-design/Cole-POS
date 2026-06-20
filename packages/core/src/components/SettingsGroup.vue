<script setup lang="ts">
defineProps<{
  label: string
}>()
</script>

<template>
  <section class="settings-group">
    <p class="settings-group__label">{{ label }}</p>
    <div class="settings-group__card">
      <slot />
    </div>
    <p v-if="$slots.footnote" class="settings-group__footnote">
      <slot name="footnote" />
    </p>
  </section>
</template>
