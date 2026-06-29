import type { GanttOverlapMode, ResolvedGroup, ResolvedRow, ResolvedTask } from './types'

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
    let lane = laneEnds.findIndex(laneEnd => laneEnd <= start)
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
  return rows.map(row => {
    const laneCount = assignLanes(row.tasks)
    const height = options.mode === 'lanes' ? laneCount * options.rowHeight : options.rowHeight
    const placed: ResolvedRow = { ...row, laneCount, top, height }
    top += height
    return placed
  })
}

/** Per-group metadata (label + initial collapsed state) keyed by group id. */
export interface GroupMeta {
  name: string
  collapsed: boolean
  meta: Record<string, unknown>
}

export interface LayoutGroupsOptions extends LayoutOptions {
  /** Height of a group header band, in pixels. */
  groupHeaderHeight: number
  /** Group metadata by id; group order + membership come from the rows. */
  groupMeta: Map<string, GroupMeta>
}

export interface GroupedLayout {
  /** Member rows, lane-assigned and placed (collapsed rows flagged `hidden`). */
  rows: ResolvedRow[]
  /** Group header bands, in render order. */
  groups: ResolvedGroup[]
  /** Total plottable height including header bands. */
  contentHeight: number
}

/**
 * Lay out rows while injecting a collapsible header band before the first row of
 * each group. Groups live *parallel* to the rows (the returned `rows` array is
 * not reordered and keeps its indices), so `task.order → rows[order]` stays
 * valid; member-row `top`s simply include the header offsets above them. A
 * collapsed group keeps its header but hides its member rows (they take no
 * vertical space); the group's rolled-up extent still covers every member task.
 *
 * With no grouped rows this is equivalent to `layoutRows`.
 */
export function layoutGroups(rows: ResolvedRow[], options: LayoutGroupsOptions): GroupedLayout {
  let top = 0
  let prevGroupId = ''
  let groupOrder = 0
  const outRows: ResolvedRow[] = []
  const groups: ResolvedGroup[] = []
  const byId = new Map<string, ResolvedGroup>()

  for (const row of rows) {
    const laneCount = assignLanes(row.tasks)
    const rowH = options.mode === 'lanes' ? laneCount * options.rowHeight : options.rowHeight
    const groupId = row.groupId

    // Open a header the first time a (contiguous) group appears.
    if (groupId && groupId !== prevGroupId && !byId.has(groupId)) {
      const meta = options.groupMeta.get(groupId)
      const group: ResolvedGroup = {
        id: groupId,
        name: meta?.name ?? groupId,
        order: groupOrder++,
        meta: meta?.meta ?? {},
        collapsed: meta?.collapsed ?? false,
        top,
        height: options.groupHeaderHeight,
        rowIds: [],
        start: new Date(0),
        end: new Date(0),
        progress: 0,
      }
      groups.push(group)
      byId.set(groupId, group)
      top += options.groupHeaderHeight
    }
    prevGroupId = groupId

    const group = groupId ? byId.get(groupId) : undefined
    const collapsed = group?.collapsed ?? false

    outRows.push({ ...row, laneCount, hidden: collapsed, top, height: rowH })
    if (!collapsed) top += rowH
    group?.rowIds.push(row.id)
  }

  // Roll up each group's task extent + aggregate progress (collapsed included).
  for (const group of groups) {
    const tasks = outRows.filter(r => r.groupId === group.id).flatMap(r => r.tasks)
    if (!tasks.length) continue
    let start = tasks[0]!.start
    let end = tasks[0]!.end
    let durSum = 0
    let progSum = 0
    for (const t of tasks) {
      if (t.start < start) start = t.start
      if (t.end > end) end = t.end
      const dur = Math.max(1, t.end.getTime() - t.start.getTime())
      durSum += dur
      progSum += t.progress * dur
    }
    group.start = start
    group.end = end
    group.progress = durSum ? progSum / durSum : 0
  }

  return { rows: outRows, groups, contentHeight: top }
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
    else if (prev >= 2 && coverage < 2)
      segments.push({ start: new Date(segStart), end: new Date(point.t) })
  }
  return segments
}
