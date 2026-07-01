import { computed, ref, shallowRef, watch, type ComputedRef, type Ref } from 'vue'
import type { GanttRow } from '../types'

/** Options for `useGanttHistory`. */
export interface GanttHistoryOptions {
  /**
   * Maximum number of snapshots to keep; when exceeded, the oldest is dropped.
   * Defaults to unlimited.
   */
  limit?: number
}

/** The undo/redo handle returned by `useGanttHistory`. */
export interface GanttHistory {
  /** Restore the previous snapshot (no-op when there's nothing to undo). */
  undo: () => void
  /** Reapply the next snapshot (no-op when there's nothing to redo). */
  redo: () => void
  /** Whether a previous snapshot exists. */
  canUndo: ComputedRef<boolean>
  /** Whether a later snapshot exists. */
  canRedo: ComputedRef<boolean>
  /** Drop all history, keeping the current value as the only entry. */
  clear: () => void
}

/**
 * Undo/redo history over a controlled `rows` ref — the one you bind to
 * `v-model:rows`. Every reassignment is recorded as a snapshot (drag/resize/
 * progress/dependency edits each emit one `update:rows`, so one user action is one
 * entry). The edit utilities are immutable, so snapshots share structure and are
 * cheap to keep — no deep clone. `undo`/`redo` restore a snapshot back into the ref
 * without recording it, and a fresh edit after an undo drops the redo tail.
 *
 * ```ts
 * const rows = ref(initialRows)
 * const { undo, redo, canUndo, canRedo } = useGanttHistory(rows)
 * // <Gantt v-model:rows="rows" /> + your own Undo/Redo buttons or key handlers
 * ```
 *
 * Pure and context-free (no `GanttRoot` required, SSR-safe); wire keyboard
 * shortcuts (e.g. Ctrl+Z / Ctrl+Shift+Z) to `undo`/`redo` yourself.
 */
export function useGanttHistory<Row = GanttRow>(
  source: Ref<Row[]>,
  options: GanttHistoryOptions = {},
): GanttHistory {
  const { limit } = options
  const stack = shallowRef<Row[][]>([source.value])
  const index = ref(0)
  // True while `undo`/`redo` write to `source`, so the watcher doesn't record the
  // restore as a fresh edit.
  let restoring = false

  watch(
    source,
    value => {
      if (restoring) return
      // Drop any redo tail, then append the new snapshot.
      const next = stack.value.slice(0, index.value + 1)
      next.push(value)
      // Cap to `limit` by dropping the oldest entries.
      const overflow = limit && limit > 0 ? next.length - limit : 0
      stack.value = overflow > 0 ? next.slice(overflow) : next
      index.value = stack.value.length - 1
    },
    { flush: 'sync' },
  )

  function restore(to: number): void {
    restoring = true
    index.value = to
    source.value = stack.value[to]!
    restoring = false
  }

  const canUndo = computed(() => index.value > 0)
  const canRedo = computed(() => index.value < stack.value.length - 1)

  function undo(): void {
    if (canUndo.value) restore(index.value - 1)
  }
  function redo(): void {
    if (canRedo.value) restore(index.value + 1)
  }
  function clear(): void {
    stack.value = [source.value]
    index.value = 0
  }

  return { undo, redo, canUndo, canRedo, clear }
}
