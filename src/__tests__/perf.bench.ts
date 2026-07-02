import { bench, describe } from 'vitest'
import { normalizeRow } from '../context'
import { assignLanes, conflictSegments, layoutGroups, type GroupMeta } from '../layout'
import { autoSchedule, criticalPath, slack } from '../utils'
import type { ResolvedRow, ResolvedTask } from '../types'
import { makeStressRows } from '../stories/_shared'

// Deterministic inputs built once, outside the measured blocks.
const rows1k = makeStressRows(200) // 200 rows × 5 = 1k tasks
const rows10k = makeStressRows(2000) // 2000 rows × 5 = 10k tasks
const rows10kDeps = makeStressRows(2000, { deps: true })
const rows10kGroups = makeStressRows(2000, { groups: 400 }) // 400 contiguous groups

const norm10k = rows10k.map((r, i) => normalizeRow(r, i))
const norm10kGroups = rows10kGroups.map((r, i) => normalizeRow(r, i))

const baseOpts = { mode: 'lanes' as const, rowHeight: 36, groupHeaderHeight: 36 }
const noGroupMeta = new Map<string, GroupMeta>()
const groupMeta = new Map<string, GroupMeta>(
  Array.from({ length: 400 }, (_, g) => [`g-${g}`, { name: `G${g}`, collapsed: false, meta: {} }]),
)

// 500 mutually-overlapping tasks on one row — worst case for greedy lane packing
// and the conflict sweep (every task overlaps every other).
const overlapping: ResolvedTask[] = normalizeRow(
  makeStressRows(1, { tasksPerRow: 500 })[0]!,
  0,
).tasks.map(t => ({ ...t, start: new Date(0), end: new Date(1_000_000_000) }))

// Flat resolved-task list + a linear dateToX, to emulate the per-scroll `visibleTasks`
// filter (array scan + two date→pixel calls per task) without mounting a component.
const flat10k: ResolvedTask[] = norm10k.flatMap(r => r.tasks)
const pxPerDay = 40
const origin = flat10k.reduce((m, t) => Math.min(m, t.start.getTime()), Infinity)
const dateToX = (d: Date): number => ((d.getTime() - origin) / 86_400_000) * pxPerDay
const win = { min: 400_000, max: 401_600 } // an arbitrary 1600px horizontal window

describe('normalize + layout', () => {
  bench('normalizeRow ×1k', () => void rows1k.map((r, i) => normalizeRow(r, i)))
  bench('normalizeRow ×10k', () => void rows10k.map((r, i) => normalizeRow(r, i)))
  bench('layoutGroups 10k, no groups', () => void layoutGroups(norm10k, { ...baseOpts, groupMeta: noGroupMeta }))
  bench('layoutGroups 10k, 400 groups (O(G·R) rollup)', () =>
    void layoutGroups(norm10kGroups, { ...baseOpts, groupMeta }))
})

describe('lane assignment', () => {
  const typicalRow: ResolvedRow = norm10k[0]!
  bench('assignLanes typical row', () => void assignLanes(typicalRow.tasks))
  bench('assignLanes 500 mutually-overlapping', () => void assignLanes(overlapping))
})

describe('graph utilities (10k, chained deps)', () => {
  bench('criticalPath', () => void criticalPath(rows10kDeps))
  bench('slack', () => void slack(rows10kDeps))
  bench('autoSchedule', () => void autoSchedule(rows10kDeps))
})

describe('overlap / scroll', () => {
  bench('conflictSegments (500 overlapping)', () => void conflictSegments(overlapping))
  bench('visibleTasks-style filter over 10k (per scroll frame)', () => {
    void flat10k.filter(t => {
      const x = dateToX(t.start)
      const w = dateToX(t.end) - x
      return x + w >= win.min && x <= win.max
    })
  })
})
