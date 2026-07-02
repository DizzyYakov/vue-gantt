import { onUnmounted } from 'vue'

export interface LongPressOptions {
  /** Press duration (ms) before it counts as a long-press. */
  delay?: number
  /** Movement (px) that cancels the pending press (treats it as a drag/scroll). */
  moveTolerance?: number
}

/**
 * A touch long-press trigger. `dblclick` has no reliable touch equivalent (a
 * double-tap usually zooms/selects instead), so on a coarse pointer a sustained
 * press opens the same affordance — used here to start inline name editing.
 *
 * Only `touch` pointers arm the timer (mouse/pen keep `dblclick`); any movement
 * past `moveTolerance` or an early release/cancel aborts it, so it never fires
 * during a bar drag or a scroll fling. Wire the returned handlers onto the
 * element alongside its existing listeners.
 */
export function useLongPress(onLongPress: () => void, options: LongPressOptions = {}) {
  const delay = options.delay ?? 500
  const moveTolerance = options.moveTolerance ?? 10

  let timer: ReturnType<typeof setTimeout> | null = null
  let startX = 0
  let startY = 0

  function clear(): void {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  function onPointerdown(event: PointerEvent): void {
    if (event.pointerType !== 'touch') return
    clear()
    startX = event.clientX
    startY = event.clientY
    timer = setTimeout(() => {
      timer = null
      onLongPress()
    }, delay)
  }

  function onPointermove(event: PointerEvent): void {
    if (timer === null) return
    if (
      Math.abs(event.clientX - startX) > moveTolerance ||
      Math.abs(event.clientY - startY) > moveTolerance
    ) {
      clear()
    }
  }

  function onPointerup(): void {
    clear()
  }

  function onPointercancel(): void {
    clear()
  }

  onUnmounted(clear)

  return { onPointerdown, onPointermove, onPointerup, onPointercancel }
}
