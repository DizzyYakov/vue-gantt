import { computed, reactive, type ComputedRef } from 'vue'
import type { GanttRow, GanttRowToggleEvent } from '../types'

export interface RowsOptions {
  /** Source rows (the `rows` prop or declarative registration). */
  sourceRows: () => GanttRow[]
  /** `row-toggle` event — a tree row's collapsed state flipped. */
  onToggle: (event: GanttRowToggleEvent) => void
}

export interface GanttRowsApi {
  /** Collapsed state by row id (for `layoutTree`). */
  rowCollapse: ComputedRef<Map<string, boolean>>
  toggleRow: (id: string) => void
}

/**
 * Tree-row collapse state. Uncontrolled, mirroring `useGanttGroups`: a user
 * toggle is recorded as an explicit override that wins over the row's
 * `collapsed` default; without an override the default applies. Fully derived
 * (no async seeding), so the default takes effect synchronously in both
 * prop-driven and declarative modes, and re-renders / dynamic rows never clobber
 * a user toggle. `toggleRow` flips the override and re-emits as the `row-toggle`
 * event.
 */
export function useGanttRows(options: RowsOptions): GanttRowsApi {
  const collapseOverrides = reactive(new Map<string, boolean>())

  function isCollapsed(row: GanttRow): boolean {
    return collapseOverrides.get(row.id) ?? row.collapsed ?? false
  }

  const rowCollapse = computed<Map<string, boolean>>(
    () => new Map(options.sourceRows().map(row => [row.id, isCollapsed(row)])),
  )

  function toggleRow(id: string): void {
    const row = options.sourceRows().find(r => r.id === id)
    const current = row ? isCollapsed(row) : (collapseOverrides.get(id) ?? false)
    collapseOverrides.set(id, !current)
    options.onToggle({ id, collapsed: !current })
  }

  return { rowCollapse, toggleRow }
}
