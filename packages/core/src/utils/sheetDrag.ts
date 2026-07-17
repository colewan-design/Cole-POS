import { ref } from 'vue'

interface SheetDragOptions {
  onDismiss: () => void
  dismissDistance?: number
  velocityThreshold?: number
  closeAnimationMs?: number
}

// Drag-to-dismiss for a bottom-sheet handle: tracks a downward drag on the
// handle, snaps back if released early, or animates off-screen and fires
// onDismiss if the drag clears the distance/velocity threshold.
export function useSheetDrag(options: SheetDragOptions) {
  const dismissDistance = options.dismissDistance ?? 120
  const velocityThreshold = options.velocityThreshold ?? 0.55
  const closeAnimationMs = options.closeAnimationMs ?? 220

  const dragOffset = ref(0)
  const isDragging = ref(false)
  const isClosing = ref(false)

  let startY = 0
  let startTime = 0
  let lastY = 0
  let lastTime = 0
  let pointerId: number | null = null

  function onPointerDown(event: PointerEvent) {
    if (isClosing.value) return
    pointerId = event.pointerId
    isDragging.value = true
    startY = event.clientY
    startTime = performance.now()
    lastY = startY
    lastTime = startTime
    dragOffset.value = 0
    ;(event.currentTarget as HTMLElement)?.setPointerCapture?.(pointerId)
  }

  function onPointerMove(event: PointerEvent) {
    if (!isDragging.value || event.pointerId !== pointerId) return
    lastY = event.clientY
    lastTime = performance.now()
    dragOffset.value = Math.max(0, lastY - startY)
  }

  function finishDrag() {
    if (!isDragging.value) return
    isDragging.value = false

    const distance = dragOffset.value
    const elapsed = Math.max(1, lastTime - startTime)
    const velocity = distance / elapsed

    if (distance > dismissDistance || velocity > velocityThreshold) {
      isClosing.value = true
      dragOffset.value = typeof window === 'undefined' ? 1000 : window.innerHeight
      window.setTimeout(() => {
        options.onDismiss()
        isClosing.value = false
        dragOffset.value = 0
      }, closeAnimationMs)
      return
    }

    dragOffset.value = 0
  }

  function onPointerUp(event: PointerEvent) {
    if (event.pointerId !== pointerId) return
    finishDrag()
  }

  function onPointerCancel(event: PointerEvent) {
    if (event.pointerId !== pointerId) return
    finishDrag()
  }

  return { dragOffset, isDragging, isClosing, onPointerDown, onPointerMove, onPointerUp, onPointerCancel }
}
