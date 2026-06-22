import type { GanttOverlapMode, ResolvedRow, ResolvedTask } from './types'

/**
 * Greedy interval-partitioning: assign each task the first lane whose previous
 * task has already finished (touching end==start shares a lane). Mutates each
 * task's `lane` and returns the number of lanes used (≥1).
 */
export function assignLanes(tasks: ResolvedTask[]): number {
  const ordered = [...tasks].sort(
    (a, b) => a.start.getTime() - b.start.getTime() || a.end.getTime() - b.end.getTime(),
  )
  const laneEnds: number[] = []

  for (const task of ordered) {
    const start = task.start.getTime()
    const end = task.end.getTime()
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(end)
    } else {
      laneEnds[lane] = end
    }
    task.lane = lane
  }

  return Math.max(1, laneEnds.length)
}

export interface LayoutOptions {
  mode: GanttOverlapMode
  rowHeight: number
}

/**
 * Assign lanes per row and compute each row's vertical placement. In `lanes`
 * mode a row's height grows to `laneCount * rowHeight`; every other mode keeps a
 * single `rowHeight` band. Returns rows with `laneCount`/`top`/`height` set.
 */
export function layoutRows(rows: ResolvedRow[], options: LayoutOptions): ResolvedRow[] {
  let top = 0
  return rows.map((row) => {
    const laneCount = assignLanes(row.tasks)
    const height = options.mode === 'lanes' ? laneCount * options.rowHeight : options.rowHeight
    const placed: ResolvedRow = { ...row, laneCount, top, height }
    top += height
    return placed
  })
}

/**
 * Spans (time intervals) on a row where two or more tasks overlap. Milestones
 * (zero-length) are ignored. Adjacent/merged spans are returned once.
 */
export function conflictSegments(tasks: ResolvedTask[]): { start: Date; end: Date }[] {
  const points: { t: number; delta: 1 | -1 }[] = []
  for (const task of tasks) {
    const start = task.start.getTime()
    const end = task.end.getTime()
    if (end <= start) continue
    points.push({ t: start, delta: 1 }, { t: end, delta: -1 })
  }
  // At equal times, close (-1) before open (+1) so touching tasks don't count.
  points.sort((a, b) => a.t - b.t || a.delta - b.delta)

  const segments: { start: Date; end: Date }[] = []
  let coverage = 0
  let segStart = 0
  for (const point of points) {
    const prev = coverage
    coverage += point.delta
    if (prev < 2 && coverage >= 2) segStart = point.t
    else if (prev >= 2 && coverage < 2) segments.push({ start: new Date(segStart), end: new Date(point.t) })
  }
  return segments
}
