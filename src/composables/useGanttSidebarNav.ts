import { computed, nextTick, ref, type ComputedRef, type Ref } from 'vue'
import type { ResolvedRow } from '../types'
import { firstRowId, nextRowId } from '../keyboardNav'

/** Direction of a sidebar roving-focus move (Left/Right are expand/collapse, handled by the caller). */
export type RowNavDirection = 'up' | 'down' | 'first' | 'last'

export interface SidebarNavOptions {
  rows: ComputedRef<ResolvedRow[]>
  scrollToRow: (id: string) => void
  /** The sidebar container element (queried to focus the target row). */
  containerEl: Ref<HTMLElement | null>
}

export interface GanttSidebarNavApi {
  /** The row holding (or that would receive) roving keyboard focus, or `null`. */
  rovingRowId: ComputedRef<string | null>
  /** Make a row the roving anchor (called on a row `focus`). */
  setSidebarActive: (id: string) => void
  /** Move roving focus vertically, scrolling the target in and focusing it. */
  moveSidebarFocus: (direction: RowNavDirection) => void
}

/**
 * Roving keyboard focus across sidebar rows (a11y `keyboard` layer). Exactly one
 * row is the tab stop; Up/Down move it via the pure `nextRowId`. Because rows are
 * virtualized, a move scrolls the target into view first, then focuses its element
 * on the next frame (best-effort — the element mounts after the scroll). Mirrors
 * `useGanttKeyboardNav` (task roving) for the sidebar axis.
 */
export function useGanttSidebarNav(options: SidebarNavOptions): GanttSidebarNavApi {
  const activeOverride = ref<string | null>(null)

  const rovingRowId = computed<string | null>(() => {
    const override = activeOverride.value
    if (override && options.rows.value.some(row => row.id === override && !row.hidden)) {
      return override
    }
    return firstRowId(options.rows.value)
  })

  function setSidebarActive(id: string): void {
    activeOverride.value = id
  }

  function focusRow(id: string): void {
    const container = options.containerEl.value
    if (!container) return
    // Match by dataset rather than interpolating `id` into a selector (ids can
    // contain characters that would break or inject into a CSS selector).
    for (const node of container.querySelectorAll('[data-gantt-row-focusable]')) {
      if (node instanceof HTMLElement && node.dataset.id === id) {
        node.focus({ preventScroll: true })
        return
      }
    }
  }

  function moveSidebarFocus(direction: RowNavDirection): void {
    const target = nextRowId(options.rows.value, rovingRowId.value, direction)
    if (!target) return
    activeOverride.value = target
    options.scrollToRow(target)
    nextTick(() => requestAnimationFrame(() => focusRow(target)))
  }

  return { rovingRowId, setSidebarActive, moveSidebarFocus }
}
