<script setup lang="ts">
import { Delete } from '@lucide/vue'

const emit = defineEmits<{
  digit: [digit: number]
  decimal: []
  clear: []
  backspace: []
}>()

const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9]
</script>

<template>
  <div class="numeric-keypad">
    <button v-for="key in keys" :key="key" type="button" @click="emit('digit', key)">
      {{ key }}
    </button>
  </div>
  <div class="numeric-keypad numeric-keypad--actions">
    <button type="button" @click="emit('clear')">Clear</button>
    <button type="button" @click="emit('digit', 0)">0</button>
    <button type="button" @click="emit('decimal')">.</button>
    <button type="button" aria-label="Delete last digit" @click="emit('backspace')">
      <Delete :size="20" />
    </button>
  </div>
</template>
