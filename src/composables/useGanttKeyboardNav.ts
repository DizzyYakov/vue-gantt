import { computed, nextTick, ref, type ComputedRef, type Ref } from 'vue'
import type { ResolvedRow, ResolvedTask } from '../types'
import { firstTaskId, nextTaskId, type NavDirection } from '../keyboardNav'

export interface KeyboardNavOptions {
  rows: ComputedRef<ResolvedRow[]>
  tasks: ComputedRef<ResolvedTask[]>
  scrollToTask: (id: string) => void
  scrollerEl: Ref<HTMLElement | null>
}

export interface GanttKeyboardNavApi {
  /** The task that currently holds (or would receive) roving keyboard focus. */
  keyboardActiveId: ComputedRef<string | null>
  /** Make `id` the roving anchor (called on a bar/marker `focus`). */
  setKeyboardActive: (id: string) => void
  /** Move roving focus in `direction`, scrolling the target into view and focusing it. */
  moveKeyboardFocus: (direction: NavDirection) => void
}

/**
 * Roving keyboard focus across task bars/milestones. Exactly one task is the
 * "active" tab stop; arrow keys move it via the pure `nextTaskId`. Because rows
 * are virtualized, a move scrolls the target into view first, then focuses its
 * element on the next frame (best-effort — the element mounts after the scroll).
 */
export function useGanttKeyboardNav(options: KeyboardNavOptions): GanttKeyboardNavApi {
  const activeOverride = ref<string | null>(null)

  const keyboardActiveId = computed<string | null>(() => {
    const override = activeOverride.value
    if (override && options.tasks.value.some(task => task.id === override)) return override
    // Default anchor: first navigable task (Tab lands here before any arrow move).
    return firstTaskId(options.rows.value)
  })

  function setKeyboardActive(id: string): void {
    activeOverride.value = id
  }

  function focusActive(id: string): void {
    const scroller = options.scrollerEl.value
    if (!scroller) return
    // Match by dataset rather than interpolating `id` into the selector (ids can
    // contain characters that would break or inject into a CSS selector).
    for (const node of scroller.querySelectorAll('[data-gantt-focusable]')) {
      if (node instanceof HTMLElement && node.dataset.id === id) {
        node.focus({ preventScroll: true })
        return
      }
    }
  }

  function moveKeyboardFocus(direction: NavDirection): void {
    const target = nextTaskId(options.rows.value, keyboardActiveId.value, direction)
    if (!target) return
    activeOverride.value = target
    // Bring the (possibly virtualized-out) target into view, then focus once it
    // has mounted — after the reactive flush and the next animation frame.
    options.scrollToTask(target)
    nextTick(() => requestAnimationFrame(() => focusActive(target)))
  }

  return { keyboardActiveId, setKeyboardActive, moveKeyboardFocus }
}
