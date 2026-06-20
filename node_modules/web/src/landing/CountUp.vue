<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    to: number
    prefix?: string
    suffix?: string
    duration?: number
    start: boolean
    delay?: number
  }>(),
  { prefix: '', suffix: '', duration: 900, delay: 0 },
)

const display = ref(`${props.prefix}0${props.suffix}`)
let raf = 0
let timeout: ReturnType<typeof setTimeout> | undefined

function animate() {
  const startTime = performance.now()
  function tick(now: number) {
    const t = Math.min(1, (now - startTime) / props.duration)
    const eased = 1 - Math.pow(1 - t, 3)
    const value = Math.round(props.to * eased)
    display.value = `${props.prefix}${value}${props.suffix}`
    if (t < 1) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
}

watch(
  () => props.start,
  (started) => {
    if (started) timeout = setTimeout(animate, props.delay)
  },
)

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  if (timeout) clearTimeout(timeout)
})
</script>

<template>
  <span>{{ display }}</span>
</template>
