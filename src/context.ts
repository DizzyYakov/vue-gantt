import type { ComputedRef, InjectionKey } from 'vue'
import type {
  GanttContext,
  GanttItemType,
  GanttRow,
  GanttTask,
  ResolvedRow,
  ResolvedTask,
} from './types'

/** Injection key for the shared Gantt context. */
export const GANTT_CONTEXT: InjectionKey<GanttContext> = Symbol('gantt-context')

/** Injection key carrying the enclosing row's id to declarative `GanttTask`s. */
export const GANTT_ROW: InjectionKey<ComputedRef<string>> = Symbol('gantt-row')

/** Injection key carrying the enclosing group's id to declarative `GanttRow`s. */
export const GANTT_GROUP: InjectionKey<ComputedRef<string>> = Symbol('gantt-group')

/** Default configuration values, overridable via `GanttRoot` props. */
export const GANTT_DEFAULTS = {
  unit: 'day',
  columnWidth: 40,
  rowHeight: 36,
  headerRowHeight: 28,
  groupHeaderHeight: 36,
  sidebarWidth: 200,
  overlap: 'lanes',
  draggable: false,
  rowMovable: false,
  resizable: false,
  progressDraggable: false,
  tooltip: false,
  criticalPath: false,
  slack: false,
  linkable: false,
  snapToGrid: false,
  autoSchedule: false,
  dragLabelFormat: 'd MMM HH:mm',
} as const

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Coerce any accepted date input into a `Date`. A bare `YYYY-MM-DD` string is
 * parsed in the local timezone (not UTC) so it lands on the day the author
 * wrote, keeping bars aligned with the auto-derived axis bounds.
 */
export function toDate(value: Date | string | number): Date {
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    const m = DATE_ONLY.exec(value)
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  }
  return new Date(value)
}

/** Apply defaults and coerce dates so downstream code sees a uniform shape. */
export function normalizeTask(task: GanttTask, rowId: string, order: number): ResolvedTask {
  const type: GanttItemType = task.type ?? 'task'
  const start = toDate(task.start)
  // A milestone is a single point in time; collapse its end onto its start.
  // A task with no end also falls back to its start (zero-length).
  const end = type === 'milestone' || task.end == null ? start : toDate(task.end)

  return {
    id: task.id,
    name: task.name ?? task.id,
    start,
    end,
    progress: clampProgress(task.progress),
    dependencies: task.dependencies ?? [],
    type,
    deadline: task.deadline != null ? toDate(task.deadline) : undefined,
    constraint: task.constraint
      ? { type: task.constraint.type, date: toDate(task.constraint.date) }
      : undefined,
    // A baseline is always an interval — never collapsed like a milestone's end.
    baselineStart: task.baselineStart != null ? toDate(task.baselineStart) : undefined,
    baselineEnd: task.baselineEnd != null ? toDate(task.baselineEnd) : undefined,
    meta: task.meta ?? {},
    rowId,
    order,
    lane: 0,
  }
}

/**
 * Resolve a row and its tasks. `laneCount`/`top`/`height` are placeholders here
 * (every task inherits the row's `order`); `layoutRows` fills the final values.
 */
export function normalizeRow(row: GanttRow, order: number): ResolvedRow {
  return {
    id: row.id,
    name: row.name ?? row.id,
    order,
    meta: row.meta ?? {},
    tasks: (row.tasks ?? []).map(task => normalizeTask(task, row.id, order)),
    groupId: row.groupId ?? '',
    hidden: false,
    laneCount: 1,
    top: order,
    height: 1,
  }
}

function clampProgress(value: number | undefined): number {
  if (value == null || Number.isNaN(value)) return 0
  return Math.min(100, Math.max(0, value))
}
