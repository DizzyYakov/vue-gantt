/**
 * Pure, tree-shakeable helpers over the consumer-facing `GanttRow[]` / `GanttTask[]`
 * data model. The library is controlled — the consumer owns the data and applies
 * changes — so these cover the boilerplate that would otherwise be rewritten in
 * every app: applying the `move` event, immutable edits, lookups, the date
 * extent, dependency queries, validation and (light) scheduling.
 *
 * All edit helpers are immutable: they return a new `rows` array (cloning only
 * the rows/tasks that change) and never mutate the input.
 */
import { toDate } from './context'
import type { GanttGroup, GanttIssue, GanttMoveEvent, GanttRow, GanttTask } from './types'

// --- Lookups & traversal ----------------------------------------------------

/** Flatten the two-level rows→tasks structure into a single task list. */
export function flattenTasks(rows: GanttRow[]): GanttTask[] {
  return rows.flatMap(row => row.tasks ?? [])
}

/** Find a task (and its owning row) by id. */
export function findTask(
  rows: GanttRow[],
  id: string,
): { task: GanttTask; row: GanttRow } | undefined {
  for (const row of rows) {
    const task = (row.tasks ?? []).find(t => t.id === id)
    if (task) return { task, row }
  }
  return undefined
}

/** Find a row by id. */
export function findRow(rows: GanttRow[], id: string): GanttRow | undefined {
  return rows.find(r => r.id === id)
}

// --- Immutable edits --------------------------------------------------------

/**
 * Apply the controlled `move` event to the data: remove the task from its row
 * and (re)insert it into `toRowId` with the event's new `start`/`end`. No-op
 * (returns the input) if the task or target row is missing.
 */
export function applyMove(rows: GanttRow[], e: GanttMoveEvent): GanttRow[] {
  const found = findTask(rows, e.id)
  if (!found || !rows.some(r => r.id === e.toRowId)) return rows
  const moved: GanttTask = { ...found.task, start: e.start, end: e.end }

  return rows.map(row => {
    const has = (row.tasks ?? []).some(t => t.id === e.id)
    const isTarget = row.id === e.toRowId
    if (!has && !isTarget) return row
    const tasks = (row.tasks ?? []).filter(t => t.id !== e.id)
    if (isTarget) tasks.push(moved)
    return { ...row, tasks }
  })
}

/** Patch a task by id (shallow merge). No-op if the id is unknown. */
export function updateTask(rows: GanttRow[], id: string, patch: Partial<GanttTask>): GanttRow[] {
  return rows.map(row =>
    (row.tasks ?? []).some(t => t.id === id)
      ? { ...row, tasks: (row.tasks ?? []).map(t => (t.id === id ? { ...t, ...patch } : t)) }
      : row,
  )
}

/** Append a task to a row. No-op if the row id is unknown. */
export function addTask(rows: GanttRow[], rowId: string, task: GanttTask): GanttRow[] {
  return rows.map(row => (row.id === rowId ? { ...row, tasks: [...(row.tasks ?? []), task] } : row))
}

/** Remove a task by id from whichever row holds it. */
export function removeTask(rows: GanttRow[], id: string): GanttRow[] {
  return rows.map(row =>
    (row.tasks ?? []).some(t => t.id === id)
      ? { ...row, tasks: (row.tasks ?? []).filter(t => t.id !== id) }
      : row,
  )
}

// --- Dates & progress -------------------------------------------------------

/**
 * Earliest start and latest end across all tasks (milestones count as their
 * `start`). Returns `null` when there are no tasks. Handy for `startDate`/
 * `endDate` or a "fit to data" action.
 */
export function tasksExtent(rows: GanttRow[]): { start: Date; end: Date } | null {
  const tasks = flattenTasks(rows)
  if (!tasks.length) return null
  let start = toDate(tasks[0]!.start)
  let end = toDate(tasks[0]!.end ?? tasks[0]!.start)
  for (const t of tasks) {
    const s = toDate(t.start)
    const e = toDate(t.end ?? t.start)
    if (s < start) start = s
    if (e > end) end = e
  }
  return { start, end }
}

/**
 * Duration-weighted aggregate progress (0–100) across tasks — the same rollup
 * `GanttGroupBar` uses internally, exposed for custom summaries.
 */
export function rollupProgress(tasks: GanttTask[]): number {
  let durSum = 0
  let progSum = 0
  for (const t of tasks) {
    const start = toDate(t.start).getTime()
    const end = toDate(t.end ?? t.start).getTime()
    const dur = Math.max(1, end - start)
    durSum += dur
    progSum += clampProgress(t.progress) * dur
  }
  return durSum ? progSum / durSum : 0
}

// --- Dependencies -----------------------------------------------------------

/** Ids of tasks that declare `id` in their `dependencies` (reverse links). */
export function getDependents(rows: GanttRow[], id: string): string[] {
  return flattenTasks(rows)
    .filter(t => (t.dependencies ?? []).includes(id))
    .map(t => t.id)
}

/**
 * Add a finish-to-start dependency (`to.dependencies` gains `from`). Immutable;
 * a no-op for a self-link, an unknown successor, or an existing duplicate.
 */
export function addDependency(rows: GanttRow[], from: string, to: string): GanttRow[] {
  if (from === to) return rows
  const target = findTask(rows, to)
  if (!target || (target.task.dependencies ?? []).includes(from)) return rows
  return updateTask(rows, to, { dependencies: [...(target.task.dependencies ?? []), from] })
}

/** Remove the finish-to-start dependency `from → to`. Immutable; no-op if absent. */
export function removeDependency(rows: GanttRow[], from: string, to: string): GanttRow[] {
  const target = findTask(rows, to)
  if (!target || !(target.task.dependencies ?? []).includes(from)) return rows
  return updateTask(rows, to, {
    dependencies: (target.task.dependencies ?? []).filter(d => d !== from),
  })
}

/**
 * Detect circular dependencies. Returns one array of ids per cycle found
 * (empty when the dependency graph is acyclic).
 */
export function detectCycles(rows: GanttRow[]): string[][] {
  const tasks = flattenTasks(rows)
  const deps = new Map(tasks.map(t => [t.id, t.dependencies ?? []]))
  const WHITE = 0
  const GRAY = 1
  const BLACK = 2
  const color = new Map<string, number>()
  const stack: string[] = []
  const cycles: string[][] = []

  function visit(id: string): void {
    color.set(id, GRAY)
    stack.push(id)
    for (const dep of deps.get(id) ?? []) {
      if (!deps.has(dep)) continue // unknown target — validateRows reports it
      const c = color.get(dep) ?? WHITE
      if (c === GRAY) {
        cycles.push(stack.slice(stack.indexOf(dep)))
      } else if (c === WHITE) {
        visit(dep)
      }
    }
    stack.pop()
    color.set(id, BLACK)
  }

  for (const t of tasks) {
    if ((color.get(t.id) ?? WHITE) === WHITE) visit(t.id)
  }
  return cycles
}

/**
 * Tasks in dependency order (predecessors before successors, Kahn's algorithm).
 * Tasks caught in a cycle are appended in declaration order (best effort) — use
 * {@link detectCycles} to surface those.
 */
export function topologicalOrder(rows: GanttRow[]): string[] {
  const tasks = flattenTasks(rows)
  const ids = new Set(tasks.map(t => t.id))
  const indegree = new Map<string, number>(tasks.map(t => [t.id, 0]))
  const adjacency = new Map<string, string[]>(tasks.map(t => [t.id, []]))

  for (const t of tasks) {
    for (const dep of t.dependencies ?? []) {
      if (!ids.has(dep)) continue
      adjacency.get(dep)!.push(t.id)
      indegree.set(t.id, (indegree.get(t.id) ?? 0) + 1)
    }
  }

  const queue = tasks.filter(t => (indegree.get(t.id) ?? 0) === 0).map(t => t.id)
  const order: string[] = []
  while (queue.length) {
    const id = queue.shift()!
    order.push(id)
    for (const next of adjacency.get(id) ?? []) {
      const left = (indegree.get(next) ?? 0) - 1
      indegree.set(next, left)
      if (left === 0) queue.push(next)
    }
  }

  if (order.length < tasks.length) {
    const seen = new Set(order)
    for (const t of tasks) if (!seen.has(t.id)) order.push(t.id)
  }
  return order
}

/**
 * The critical path: the longest finish-to-start chain by total duration.
 * Returns the ids on that chain (empty if the graph has a cycle or no tasks).
 */
export function criticalPath(rows: GanttRow[]): string[] {
  if (detectCycles(rows).length) return []
  const byId = new Map(flattenTasks(rows).map(t => [t.id, t]))
  const finish = new Map<string, number>()
  const prev = new Map<string, string | null>()
  let bestId: string | null = null
  let bestVal = -1

  for (const id of topologicalOrder(rows)) {
    const t = byId.get(id)
    if (!t) continue
    const dur = duration(t)
    let depFinish = 0
    let depId: string | null = null
    for (const dep of t.dependencies ?? []) {
      const f = finish.get(dep)
      if (f != null && f > depFinish) {
        depFinish = f
        depId = dep
      }
    }
    const total = depFinish + dur
    finish.set(id, total)
    prev.set(id, depId)
    if (total > bestVal) {
      bestVal = total
      bestId = id
    }
  }

  const path: string[] = []
  for (let cur = bestId; cur; cur = prev.get(cur) ?? null) path.unshift(cur)
  return path
}

/**
 * Push finish-to-start successors forward so none starts before a predecessor
 * ends, preserving each task's duration. Pass `changedId` to cascade only that
 * task's (transitive) successors; omit it to enforce the constraint everywhere.
 * Returns a new `rows` (the input unchanged when nothing needs shifting).
 */
export function autoSchedule(rows: GanttRow[], changedId?: string): GanttRow[] {
  const tasks = flattenTasks(rows)
  const byId = new Map(tasks.map(t => [t.id, t]))
  const start = new Map<string, number>()
  const end = new Map<string, number>()
  for (const t of tasks) {
    start.set(t.id, toDate(t.start).getTime())
    end.set(t.id, toDate(t.end ?? t.start).getTime())
  }

  const allowed = changedId != null ? descendants(tasks, changedId) : null
  const shifted = new Set<string>()

  for (const id of topologicalOrder(rows)) {
    const t = byId.get(id)
    if (!t || (allowed && !allowed.has(id))) continue
    let required = -Infinity
    for (const dep of t.dependencies ?? []) {
      const e = end.get(dep)
      if (e != null && e > required) required = e
    }
    if (required > -Infinity && start.get(id)! < required) {
      const dur = end.get(id)! - start.get(id)!
      start.set(id, required)
      end.set(id, required + dur)
      shifted.add(id)
    }
  }

  if (!shifted.size) return rows
  return rows.map(row =>
    (row.tasks ?? []).some(t => shifted.has(t.id))
      ? {
          ...row,
          tasks: (row.tasks ?? []).map(t =>
            shifted.has(t.id)
              ? { ...t, start: new Date(start.get(t.id)!), end: new Date(end.get(t.id)!) }
              : t,
          ),
        }
      : row,
  )
}

// --- Validation -------------------------------------------------------------

/**
 * Check the data for common mistakes: duplicate row/task ids, dependencies on
 * unknown tasks, `end` before `start`, and (when `groups` is given) rows whose
 * `groupId` has no matching group. Returns an empty array when everything is OK.
 */
export function validateRows(rows: GanttRow[], groups?: GanttGroup[]): GanttIssue[] {
  const issues: GanttIssue[] = []

  const rowIds = new Set<string>()
  for (const row of rows) {
    if (rowIds.has(row.id)) {
      issues.push({
        type: 'duplicate-row-id',
        id: row.id,
        message: `Duplicate row id "${row.id}".`,
      })
    }
    rowIds.add(row.id)
  }

  const tasks = flattenTasks(rows)
  const taskIds = new Set<string>()
  for (const t of tasks) {
    if (taskIds.has(t.id)) {
      issues.push({ type: 'duplicate-task-id', id: t.id, message: `Duplicate task id "${t.id}".` })
    }
    taskIds.add(t.id)
  }

  for (const t of tasks) {
    if (t.type !== 'milestone' && t.end != null && toDate(t.end) < toDate(t.start)) {
      issues.push({
        type: 'invalid-range',
        id: t.id,
        message: `Task "${t.id}" ends before it starts.`,
      })
    }
    for (const dep of t.dependencies ?? []) {
      if (!taskIds.has(dep)) {
        issues.push({
          type: 'missing-dependency',
          id: t.id,
          message: `Task "${t.id}" depends on unknown task "${dep}".`,
        })
      }
    }
  }

  if (groups) {
    const groupIds = new Set(groups.map(g => g.id))
    for (const row of rows) {
      if (row.groupId && !groupIds.has(row.groupId)) {
        issues.push({
          type: 'orphan-group',
          id: row.id,
          message: `Row "${row.id}" references unknown group "${row.groupId}".`,
        })
      }
    }
  }

  return issues
}

// --- internal ---------------------------------------------------------------

function clampProgress(value: number | undefined): number {
  if (value == null || Number.isNaN(value)) return 0
  return Math.min(100, Math.max(0, value))
}

function duration(task: GanttTask): number {
  return Math.max(0, toDate(task.end ?? task.start).getTime() - toDate(task.start).getTime())
}

/** Transitive finish-to-start successors of `id` (excludes `id` itself). */
function descendants(tasks: GanttTask[], id: string): Set<string> {
  const dependents = new Map<string, string[]>()
  for (const t of tasks) {
    for (const dep of t.dependencies ?? []) {
      const list = dependents.get(dep)
      if (list) list.push(t.id)
      else dependents.set(dep, [t.id])
    }
  }
  const out = new Set<string>()
  const queue = [...(dependents.get(id) ?? [])]
  while (queue.length) {
    const next = queue.shift()!
    if (out.has(next)) continue
    out.add(next)
    queue.push(...(dependents.get(next) ?? []))
  }
  return out
}
