<script setup lang="ts">
import { Check, ChevronsUpDown } from '@lucide/vue'
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'

interface Option {
  value: string
  label: string
}

const props = defineProps<{
  label: string
  options: Option[]
  modelValue: string
  ariaLabel?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)
const triggerEl = ref<HTMLButtonElement | null>(null)
const popoverStyle = reactive({ top: '0px', left: '0px', width: '0px', maxHeight: '0px' })

const POPOVER_MARGIN = 8

const currentLabel = computed(
  () => props.options.find((option) => option.value === props.modelValue)?.label ?? props.modelValue,
)

function positionPopover() {
  const rect = triggerEl.value?.getBoundingClientRect()
  if (!rect) {
    return
  }

  popoverStyle.top = `${rect.bottom + 4}px`
  popoverStyle.left = `${rect.left}px`
  popoverStyle.width = `${rect.width}px`
  popoverStyle.maxHeight = `${Math.max(window.innerHeight - rect.bottom - 4 - POPOVER_MARGIN, 120)}px`
}

function toggle() {
  if (!open.value) {
    positionPopover()
  }
  open.value = !open.value
}

function select(value: string) {
  emit('update:modelValue', value)
  open.value = false
  triggerEl.value?.focus()
}

function handleClickOutside(event: MouseEvent) {
  if (open.value && rootEl.value && !rootEl.value.contains(event.target as Node)) {
    open.value = false
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) {
    event.preventDefault()
    open.value = false
    triggerEl.value?.focus()
  }
}

function handleReposition() {
  if (open.value) {
    positionPopover()
  }
}

onMounted(() => {
  window.addEventListener('click', handleClickOutside)
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', handleReposition)
  window.addEventListener('scroll', handleReposition, true)
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', handleReposition)
  window.removeEventListener('scroll', handleReposition, true)
})
</script>

<template>
  <div ref="rootEl" class="menu-row settings-row">
    <button
      ref="triggerEl"
      class="menu-row__trigger"
      type="button"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-label="ariaLabel ?? label"
      @click="toggle"
    >
      <span class="menu-row__label">{{ label }}</span>
      <span class="menu-row__value">
        <span class="menu-row__value-text">{{ currentLabel }}</span>
        <ChevronsUpDown class="menu-row__glyph" :size="16" aria-hidden="true" />
      </span>
    </button>

    <Teleport to="body">
      <ul
        v-if="open"
        class="menu-row__popover"
        role="listbox"
        :aria-label="label"
        :style="popoverStyle"
      >
        <li v-for="option in options" :key="option.value" role="presentation">
          <button
            class="menu-row__option"
            type="button"
            role="option"
            :aria-selected="option.value === modelValue"
            @click="select(option.value)"
          >
            <span>{{ option.label }}</span>
            <Check v-if="option.value === modelValue" class="menu-row__check" :size="16" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </Teleport>
  </div>
</template>
