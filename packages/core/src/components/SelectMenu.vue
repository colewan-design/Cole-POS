<script setup lang="ts" generic="T extends string">
import { ChevronDown } from '@lucide/vue'
import { computed, onUnmounted, ref } from 'vue'

interface Option {
  value: T
  label: string
}

const props = defineProps<{
  modelValue: T
  options: Option[]
  label?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: T): void
}>()

const open = ref(false)
const triggerEl = ref<HTMLElement | null>(null)

const currentLabel = computed(
  () => props.options.find((o) => o.value === props.modelValue)?.label ?? props.modelValue,
)

function toggle() {
  open.value = !open.value
}

function select(value: T) {
  emit('update:modelValue', value)
  open.value = false
}

function onOutsideClick(e: MouseEvent) {
  if (triggerEl.value && !triggerEl.value.contains(e.target as Node)) {
    open.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}

// Use capture so we catch clicks before they bubble up
document.addEventListener('click', onOutsideClick, true)
document.addEventListener('keydown', onKeydown)
onUnmounted(() => {
  document.removeEventListener('click', onOutsideClick, true)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="triggerEl" class="smenu" :class="{ 'smenu--open': open }">
    <button
      class="smenu__trigger"
      type="button"
      :aria-label="label"
      :aria-expanded="open"
      @click="toggle"
    >
      <span class="smenu__label">{{ currentLabel }}</span>
      <ChevronDown :size="15" class="smenu__chevron" aria-hidden="true" />
    </button>

    <Transition name="smenu-drop">
      <ul v-if="open" class="smenu__list" role="listbox" :aria-label="label">
        <li
          v-for="opt in options"
          :key="opt.value"
          class="smenu__option"
          :class="{ 'smenu__option--active': opt.value === modelValue }"
          role="option"
          :aria-selected="opt.value === modelValue"
          @click="select(opt.value)"
        >
          {{ opt.label }}
        </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped>
.smenu {
  position: relative;
  display: inline-flex;
}

.smenu__trigger {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  height: 44px;
  padding: 0 var(--space-3);
  border: 0.5px solid var(--separator);
  border-radius: var(--radius-md);
  background: var(--fill);
  color: var(--text-primary);
  font: var(--type-subhead);
  cursor: pointer;
  outline: none;
  transition:
    border-color var(--dur-fast) var(--ease-out),
    background var(--dur-fast) var(--ease-out);
  white-space: nowrap;
  user-select: none;
}

.smenu__trigger:focus-visible {
  border-color: var(--accent);
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.smenu--open .smenu__trigger {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--fill) 80%, var(--bg-elevated));
}

.smenu__chevron {
  color: var(--text-tertiary);
  transition: transform var(--dur-fast) var(--ease-out);
  flex-shrink: 0;
}

.smenu--open .smenu__chevron {
  transform: rotate(180deg);
}

.smenu__list {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 200;
  min-width: 100%;
  margin: 0;
  padding: var(--space-1) 0;
  list-style: none;
  background: var(--bg-elevated);
  border: 0.5px solid var(--separator);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.smenu__option {
  display: flex;
  align-items: center;
  height: 38px;
  padding: 0 var(--space-4);
  font: var(--type-subhead);
  color: var(--text-primary);
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out);
  white-space: nowrap;
}

.smenu__option:hover {
  background: var(--fill);
}

.smenu__option--active {
  color: var(--accent);
  font-weight: 600;
}

/* ── Transition ─────────────────────────────────────────────────────────────── */

.smenu-drop-enter-active,
.smenu-drop-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}

.smenu-drop-enter-from,
.smenu-drop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.97);
}
</style>
