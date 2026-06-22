import { inject } from 'vue'
import { GANTT_CONTEXT } from '../context'
import type { GanttContext } from '../types'

/**
 * Access the shared Gantt context provided by `GanttRoot`. Throws a helpful
 * error when used outside of a `GanttRoot` so misuse fails loudly.
 */
export function useGanttContext(): GanttContext {
  const ctx = inject(GANTT_CONTEXT, null)
  if (!ctx) {
    throw new Error('[vue-gantt] Gantt components must be used inside <GanttRoot>.')
  }
  return ctx
}
