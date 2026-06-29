<script setup lang="ts">
defineProps<{
  modelValue: boolean
  ariaLabel: string
  disabled?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <label class="toggle-switch">
    <input
      class="toggle-switch__input"
      type="checkbox"
      :checked="modelValue"
      :aria-label="ariaLabel"
      :disabled="disabled"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span class="toggle-switch__track">
      <span class="toggle-switch__knob" />
    </span>
  </label>
</template>
