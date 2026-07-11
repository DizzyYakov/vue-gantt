import type { ResolvedRow, ResolvedTask } from './types'

/** A keyboard roving-focus move between tasks. */
export type NavDirection = 'left' | 'right' | 'up' | 'down' | 'first' | 'last'

/** Map a `KeyboardEvent.key` to a nav direction, or `null` if it isn't a nav key. */
export function keyToNavDirection(key: string): NavDirection | null {
  if (key === 'ArrowLeft') return 'left'
  if (key === 'ArrowRight') return 'right'
  if (key === 'ArrowUp') return 'up'
  if (key === 'ArrowDown') return 'down'
  if (key === 'Home') return 'first'
  if (key === 'End') return 'last'
  return null
}

/** Rows that can hold keyboard focus (visible + have at least one task), each with
 *  its tasks sorted by start then id, in row (`order`) order. */
function navigableRows(rows: ResolvedRow[]): ResolvedTask[][] {
  const out: ResolvedTask[][] = []
  for (const row of rows) {
    if (row.hidden || row.tasks.length === 0) continue
    out.push([...row.tasks].sort((a, b) => a.start.getTime() - b.start.getTime() || (a.id < b.id ? -1 : 1)))
  }
  return out
}

/** First navigable task id (first visible, non-empty row's earliest task), or `null`. */
export function firstTaskId(rows: ResolvedRow[]): string | null {
  return navigableRows(rows)[0]?.[0]?.id ?? null
}

/** First visible (non-hidden) row id, or `null` when every row is hidden. */
export function firstRowId(rows: ResolvedRow[]): string | null {
  return rows.find(row => !row.hidden)?.id ?? null
}

/** Index of the task closest in start time to `anchor` within `tasks` (min |Δstart|). */
function closestByStart(tasks: ResolvedTask[], anchorStart: number): ResolvedTask {
  let best = tasks[0]!
  let bestGap = Math.abs(best.start.getTime() - anchorStart)
  for (const task of tasks) {
    const gap = Math.abs(task.start.getTime() - anchorStart)
    if (gap < bestGap) {
      best = task
      bestGap = gap
    }
  }
  return best
}

/**
 * Compute the task id keyboard focus should move to. `rows` is the full row list
 * (indexed by `order`); only visible, non-empty rows participate, each sorted by
 * start. Left/Right step within the active row; Up/Down jump to the nearest
 * non-empty row above/below and pick the task closest in start time; Home/End go
 * to the first/last task of the active row. A `null` `activeId` (or one no longer
 * present) resolves to the first task of the first navigable row. Returns `null`
 * only when there are no navigable tasks at all.
 */
export function nextTaskId(
  rows: ResolvedRow[],
  activeId: string | null,
  direction: NavDirection,
): string | null {
  const grid = navigableRows(rows)
  if (grid.length === 0) return null

  // Locate the active task's row + column; fall back to the very first task.
  let rowIndex = -1
  let colIndex = -1
  for (let r = 0; r < grid.length; r++) {
    const c = grid[r]!.findIndex(task => task.id === activeId)
    if (c !== -1) {
      rowIndex = r
      colIndex = c
      break
    }
  }
  if (rowIndex === -1) return grid[0]![0]!.id

  const currentRow = grid[rowIndex]!
  const anchorStart = currentRow[colIndex]!.start.getTime()

  if (direction === 'left') return currentRow[Math.max(0, colIndex - 1)]!.id
  if (direction === 'right') return currentRow[Math.min(currentRow.length - 1, colIndex + 1)]!.id
  if (direction === 'first') return currentRow[0]!.id
  if (direction === 'last') return currentRow[currentRow.length - 1]!.id

  // up / down: the adjacent navigable row already excludes empty/hidden rows.
  const targetRow = direction === 'up' ? grid[rowIndex - 1] : grid[rowIndex + 1]
  if (!targetRow) return currentRow[colIndex]!.id
  return closestByStart(targetRow, anchorStart).id
}

/**
 * Compute the sidebar row id keyboard focus should move to across the visible
 * (non-hidden) rows in order: up/down step by one (clamped at the ends), first/last
 * jump to the ends. A `null`/absent `activeId` resolves to the first visible row.
 * Returns `null` when there are no visible rows. (Left/Right — expand/collapse — is
 * handled by the component, not here.)
 */
export function nextRowId(
  rows: ResolvedRow[],
  activeId: string | null,
  direction: 'up' | 'down' | 'first' | 'last',
): string | null {
  const visible = rows.filter(row => !row.hidden)
  if (visible.length === 0) return null
  const index = visible.findIndex(row => row.id === activeId)
  if (index === -1) return visible[0]!.id
  if (direction === 'up') return visible[Math.max(0, index - 1)]!.id
  if (direction === 'down') return visible[Math.min(visible.length - 1, index + 1)]!.id
  if (direction === 'first') return visible[0]!.id
  return visible[visible.length - 1]!.id
}
