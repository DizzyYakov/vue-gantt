import { describe, expect, it } from 'vitest'
import { normalizeRow } from '../context'
import {
  assignLanes,
  conflictSegments,
  layoutGroups,
  layoutRows,
  layoutTree,
  resourceWorkload,
  type GroupMeta,
} from '../layout'
import type { GanttRow, ResolvedTask } from '../types'

const task = (id: string, start: string, end: string): ResolvedTask => {
  const row = normalizeRow({ id: 'r', tasks: [{ id, start, end }] }, 0)
  return row.tasks[0]!
}

/** Like `task`, but assignable to one or more resources for `resourceWorkload`. */
const resourceTask = (
  id: string,
  start: string,
  end: string,
  resourceIds: string[],
  type: 'task' | 'milestone' = 'task',
): ResolvedTask => {
  const row = normalizeRow({ id: 'r', tasks: [{ id, start, end, resourceIds, type }] }, 0)
  return row.tasks[0]!
}

describe('assignLanes', () => {
  it('keeps sequential (touching) tasks in one lane', () => {
    const tasks = [task('a', '2026-06-01', '2026-06-05'), task('b', '2026-06-05', '2026-06-09')]
    expect(assignLanes(tasks)).toBe(1)
    expect(tasks.map(t => t.lane)).toEqual([0, 0])
  })

  it('splits overlapping tasks into separate lanes', () => {
    const a = task('a', '2026-06-01', '2026-06-10')
    const b = task('b', '2026-06-05', '2026-06-15')
    const count = assignLanes([a, b])
    expect(count).toBe(2)
    expect(a.lane).not.toBe(b.lane)
  })

  it('reuses a freed lane for a later non-overlapping task', () => {
    // a(1–10) & b(5–15) overlap → 2 lanes; c(16–20) fits back in lane 0.
    const a = task('a', '2026-06-01', '2026-06-10')
    const b = task('b', '2026-06-05', '2026-06-15')
    const c = task('c', '2026-06-16', '2026-06-20')
    expect(assignLanes([a, b, c])).toBe(2)
    expect(c.lane).toBe(0)
  })
})

describe('layoutRows', () => {
  const rows: GanttRow[] = [
    {
      id: 'r1',
      tasks: [
        { id: 'a', start: '2026-06-01', end: '2026-06-10' },
        { id: 'b', start: '2026-06-05', end: '2026-06-15' },
      ],
    },
    { id: 'r2', tasks: [{ id: 'c', start: '2026-06-01', end: '2026-06-03' }] },
  ]
  const resolve = () => rows.map((r, i) => normalizeRow(r, i))

  it('grows a row to laneCount * rowHeight in lanes mode and stacks tops', () => {
    const laid = layoutRows(resolve(), { mode: 'lanes', rowHeight: 30 })
    expect(laid[0]!.laneCount).toBe(2)
    expect(laid[0]!.height).toBe(60)
    expect(laid[0]!.top).toBe(0)
    expect(laid[1]!.top).toBe(60) // second row starts below the taller first
    expect(laid[1]!.height).toBe(30)
  })

  it('keeps uniform row height in non-lanes modes', () => {
    const laid = layoutRows(resolve(), { mode: 'overlap', rowHeight: 30 })
    expect(laid[0]!.height).toBe(30)
    expect(laid[1]!.top).toBe(30)
  })
})

describe('layoutGroups', () => {
  const meta = (entries: Record<string, Partial<GroupMeta>>): Map<string, GroupMeta> =>
    new Map(
      Object.entries(entries).map(([id, m]) => [
        id,
        { name: m.name ?? id, collapsed: m.collapsed ?? false, meta: m.meta ?? {} },
      ]),
    )

  const grouped: GanttRow[] = [
    { id: 'r1', groupId: 'g1', tasks: [{ id: 'a', start: '2026-06-01', end: '2026-06-05' }] },
    { id: 'r2', groupId: 'g1', tasks: [{ id: 'b', start: '2026-06-03', end: '2026-06-09' }] },
    { id: 'r3', groupId: 'g2', tasks: [{ id: 'c', start: '2026-06-02', end: '2026-06-04' }] },
  ]
  const resolve = (rows: GanttRow[]) => rows.map((r, i) => normalizeRow(r, i))

  it('injects a header band before each group and offsets member rows', () => {
    const out = layoutGroups(resolve(grouped), {
      mode: 'overlap',
      rowHeight: 30,
      groupHeaderHeight: 20,
      groupMeta: meta({ g1: { name: 'Group 1' }, g2: {} }),
    })
    expect(out.groups.map(g => g.id)).toEqual(['g1', 'g2'])
    expect(out.groups[0]!.name).toBe('Group 1')

    // g1 header at 0 (h20) → r1 at 20 → r2 at 50 → g2 header at 80 → r3 at 100.
    expect(out.groups[0]!.top).toBe(0)
    expect(out.rows[0]!.top).toBe(20)
    expect(out.rows[1]!.top).toBe(50)
    expect(out.groups[1]!.top).toBe(80)
    expect(out.rows[2]!.top).toBe(100)
    expect(out.contentHeight).toBe(130) // + r3 height 30
  })

  it('records the member row ids per group', () => {
    const out = layoutGroups(resolve(grouped), {
      mode: 'overlap',
      rowHeight: 30,
      groupHeaderHeight: 20,
      groupMeta: meta({ g1: {}, g2: {} }),
    })
    expect(out.groups[0]!.rowIds).toEqual(['r1', 'r2'])
    expect(out.groups[1]!.rowIds).toEqual(['r3'])
  })

  it('collapses a group: members are hidden and take no vertical space', () => {
    const out = layoutGroups(resolve(grouped), {
      mode: 'overlap',
      rowHeight: 30,
      groupHeaderHeight: 20,
      groupMeta: meta({ g1: { collapsed: true }, g2: {} }),
    })
    expect(out.rows[0]!.hidden).toBe(true)
    expect(out.rows[1]!.hidden).toBe(true)
    expect(out.groups[0]!.collapsed).toBe(true)
    // g1 header 0..20, members occupy no space → g2 header right after at 20.
    expect(out.groups[1]!.top).toBe(20)
    expect(out.rows[2]!.top).toBe(40)
    expect(out.contentHeight).toBe(70)
  })

  it('rolls up a group extent + progress across all members (collapsed included)', () => {
    const out = layoutGroups(resolve(grouped), {
      mode: 'overlap',
      rowHeight: 30,
      groupHeaderHeight: 20,
      groupMeta: meta({ g1: { collapsed: true }, g2: {} }),
    })
    const g1 = out.groups[0]!
    // a: Jun 1–5, b: Jun 3–9 → extent Jun 1 .. Jun 9.
    expect(g1.start.getDate()).toBe(1)
    expect(g1.end.getDate()).toBe(9)
  })

  it('leaves ungrouped rows exactly where layoutRows puts them', () => {
    const ungrouped: GanttRow[] = [
      {
        id: 'r1',
        tasks: [
          { id: 'a', start: '2026-06-01', end: '2026-06-10' },
          { id: 'b', start: '2026-06-05', end: '2026-06-15' },
        ],
      },
      { id: 'r2', tasks: [{ id: 'c', start: '2026-06-01', end: '2026-06-03' }] },
    ]
    const opts = { mode: 'lanes' as const, rowHeight: 30 }
    const flat = layoutRows(resolve(ungrouped), opts)
    const out = layoutGroups(resolve(ungrouped), {
      ...opts,
      groupHeaderHeight: 20,
      groupMeta: new Map(),
    })
    expect(out.groups).toHaveLength(0)
    expect(out.rows.map(r => [r.top, r.height])).toEqual(flat.map(r => [r.top, r.height]))
    expect(out.contentHeight).toBe(flat[flat.length - 1]!.top + flat[flat.length - 1]!.height)
  })
})

describe('layoutTree', () => {
  // A three-level tree in pre-order: parent → child → grandchild, plus a sibling.
  const tree: GanttRow[] = [
    { id: 'p', tasks: [{ id: 'pt', start: '2026-06-10', end: '2026-06-12' }] },
    { id: 'c1', parentId: 'p', tasks: [{ id: 'c1t', start: '2026-06-01', end: '2026-06-05' }] },
    { id: 'g1', parentId: 'c1', tasks: [{ id: 'g1t', start: '2026-06-03', end: '2026-06-20' }] },
    { id: 'c2', parentId: 'p', tasks: [{ id: 'c2t', start: '2026-06-06', end: '2026-06-08' }] },
  ]
  const resolve = (rows: GanttRow[]) => rows.map((r, i) => normalizeRow(r, i))
  const collapse = (entries: Record<string, boolean> = {}) => new Map(Object.entries(entries))

  it('assigns depth, hasChildren and childIds by parentId', () => {
    const out = layoutTree(resolve(tree), { mode: 'overlap', rowHeight: 30, rowCollapse: collapse() })
    const byId = new Map(out.rows.map(r => [r.id, r]))
    expect(out.rows.map(r => r.depth)).toEqual([0, 1, 2, 1])
    expect(byId.get('p')!.hasChildren).toBe(true)
    expect(byId.get('g1')!.hasChildren).toBe(false)
    expect(byId.get('p')!.childIds).toEqual(['c1', 'c2'])
    expect(byId.get('c1')!.childIds).toEqual(['g1'])
  })

  it('stacks tops and preserves the order == index contract', () => {
    const out = layoutTree(resolve(tree), { mode: 'overlap', rowHeight: 30, rowCollapse: collapse() })
    expect(out.rows.map(r => r.top)).toEqual([0, 30, 60, 90])
    expect(out.contentHeight).toBe(120)
    out.rows.forEach((r, i) => expect(r.order).toBe(i))
  })

  it('recursively hides a collapsed row\'s whole subtree without removing rows', () => {
    const out = layoutTree(resolve(tree), {
      mode: 'overlap',
      rowHeight: 30,
      rowCollapse: collapse({ p: true }),
    })
    const byId = new Map(out.rows.map(r => [r.id, r]))
    // p stays visible; every descendant is hidden.
    expect(byId.get('p')!.hidden).toBe(false)
    expect([byId.get('c1')!.hidden, byId.get('g1')!.hidden, byId.get('c2')!.hidden]).toEqual([
      true,
      true,
      true,
    ])
    // Hidden rows take no vertical space, but the array (and indices) is intact.
    expect(out.rows).toHaveLength(4)
    expect(out.contentHeight).toBe(30)
    out.rows.forEach((r, i) => expect(r.order).toBe(i))
  })

  it('rolls up a parent to the min start / max end / duration-weighted progress of its subtree', () => {
    const rows: GanttRow[] = [
      { id: 'p', tasks: [] },
      { id: 'a', parentId: 'p', tasks: [{ id: 'at', start: '2026-06-01', end: '2026-06-03', progress: 100 }] },
      { id: 'b', parentId: 'p', tasks: [{ id: 'bt', start: '2026-06-05', end: '2026-06-09', progress: 0 }] },
    ]
    const out = layoutTree(resolve(rows), { mode: 'overlap', rowHeight: 30, rowCollapse: collapse() })
    const parent = out.rows.find(r => r.id === 'p')!
    expect(parent.rollup!.start).toEqual(new Date(2026, 5, 1))
    expect(parent.rollup!.end).toEqual(new Date(2026, 5, 9))
    // durations 2d (100%) + 4d (0%) → 200 / 6 ≈ 33.33
    expect(parent.rollup!.progress).toBeCloseTo(200 / 6, 5)
  })

  it('includes collapsed descendants in the rollup', () => {
    const out = layoutTree(resolve(tree), {
      mode: 'overlap',
      rowHeight: 30,
      rowCollapse: collapse({ p: true }),
    })
    const parent = out.rows.find(r => r.id === 'p')!
    // subtree spans g1t start (06-03) is later than c1t (06-01); min is 06-01, max is g1t end 06-20.
    expect(parent.rollup!.start).toEqual(new Date(2026, 5, 1))
    expect(parent.rollup!.end).toEqual(new Date(2026, 5, 20))
  })

  it('is equivalent to layoutRows when no row has a parentId', () => {
    const flatRows: GanttRow[] = [
      { id: 'r1', tasks: [{ id: 'a', start: '2026-06-01', end: '2026-06-10' }] },
      { id: 'r2', tasks: [{ id: 'b', start: '2026-06-01', end: '2026-06-03' }] },
    ]
    const tree = layoutTree(resolve(flatRows), { mode: 'lanes', rowHeight: 30, rowCollapse: collapse() })
    const flat = layoutRows(resolve(flatRows), { mode: 'lanes', rowHeight: 30 })
    expect(tree.rows.map(r => [r.top, r.height])).toEqual(flat.map(r => [r.top, r.height]))
  })

  it('grows a parent row to laneCount * rowHeight in lanes mode; children stack below it', () => {
    const lanesTree: GanttRow[] = [
      {
        id: 'p',
        tasks: [
          { id: 'p1', start: '2026-06-01', end: '2026-06-10' },
          { id: 'p2', start: '2026-06-05', end: '2026-06-15' }, // overlaps p1 → 2 lanes
        ],
      },
      { id: 'c1', parentId: 'p', tasks: [{ id: 'c1t', start: '2026-06-01', end: '2026-06-02' }] },
    ]
    const out = layoutTree(resolve(lanesTree), { mode: 'lanes', rowHeight: 30, rowCollapse: collapse() })
    const byId = new Map(out.rows.map(r => [r.id, r]))
    expect(byId.get('p')!.laneCount).toBe(2)
    expect(byId.get('p')!.height).toBe(60)
    expect(byId.get('p')!.top).toBe(0)
    // The child starts below the grown parent, not a plain single rowHeight.
    expect(byId.get('c1')!.top).toBe(60)
    expect(byId.get('c1')!.height).toBe(30)
    expect(out.contentHeight).toBe(90)
  })

  it('collapsing a middle-level row hides only its own subtree (ancestor + siblings unaffected)', () => {
    const out = layoutTree(resolve(tree), {
      mode: 'overlap',
      rowHeight: 30,
      rowCollapse: collapse({ c1: true }),
    })
    const byId = new Map(out.rows.map(r => [r.id, r]))
    // p (ancestor) and c1 itself stay visible; only c1's own child (g1) is hidden.
    expect(byId.get('p')!.hidden).toBe(false)
    expect(byId.get('c1')!.hidden).toBe(false)
    expect(byId.get('c1')!.collapsed).toBe(true)
    expect(byId.get('g1')!.hidden).toBe(true)
    // c2 is p's other child, a sibling of c1 — unrelated to c1's collapse.
    expect(byId.get('c2')!.hidden).toBe(false)

    // p(0..30) c1(30..60) g1 hidden (no space) c2 resumes right after c1's band.
    expect(out.rows.map(r => r.top)).toEqual([0, 30, 60, 60])
    expect(out.contentHeight).toBe(90)
    // The order == index contract holds regardless of where the collapse sits.
    out.rows.forEach((r, i) => expect(r.order).toBe(i))
  })

  it('treats an unknown parentId as a root instead of hanging', () => {
    const rows: GanttRow[] = [
      { id: 'x', parentId: 'ghost', tasks: [{ id: 'xt', start: '2026-06-01', end: '2026-06-02' }] },
    ]
    const out = layoutTree(resolve(rows), { mode: 'overlap', rowHeight: 30, rowCollapse: collapse() })
    expect(out.rows[0]!.depth).toBe(0)
    expect(out.rows[0]!.hidden).toBe(false)
  })

  it('does not hang on a reference cycle among existing ids', () => {
    // a→b→a is a genuine cycle; layout must terminate (it degrades, not detects).
    const rows: GanttRow[] = [
      { id: 'a', parentId: 'b', tasks: [{ id: 'at', start: '2026-06-01', end: '2026-06-02' }] },
      { id: 'b', parentId: 'a', tasks: [{ id: 'bt', start: '2026-06-03', end: '2026-06-04' }] },
    ]
    const out = layoutTree(resolve(rows), { mode: 'overlap', rowHeight: 30, rowCollapse: collapse() })
    expect(out.rows).toHaveLength(2)
    expect(out.contentHeight).toBeGreaterThan(0)
  })
})

describe('conflictSegments', () => {
  it('returns the overlapping span of two tasks', () => {
    const segs = conflictSegments([
      task('a', '2026-06-01', '2026-06-10'),
      task('b', '2026-06-06', '2026-06-15'),
    ])
    expect(segs).toHaveLength(1)
    expect(segs[0]!.start.getDate()).toBe(6)
    expect(segs[0]!.end.getDate()).toBe(10)
  })

  it('ignores touching (non-overlapping) tasks', () => {
    expect(
      conflictSegments([
        task('a', '2026-06-01', '2026-06-05'),
        task('b', '2026-06-05', '2026-06-09'),
      ]),
    ).toHaveLength(0)
  })
})

describe('resourceWorkload', () => {
  it('emits count 1 → 2 → 1 segments for two overlapping tasks on one resource, with peak=2', () => {
    const tasks = [
      resourceTask('a', '2026-06-01', '2026-06-10', ['u1']),
      resourceTask('b', '2026-06-05', '2026-06-15', ['u1']),
    ]
    const [workload] = resourceWorkload(tasks)
    expect(workload!.resourceId).toBe('u1')
    expect(workload!.peak).toBe(2)
    expect(workload!.segments.map(s => [s.start.getDate(), s.end.getDate(), s.count])).toEqual([
      [1, 5, 1],
      [5, 10, 2],
      [10, 15, 1],
    ])
  })

  it('does not stack touching (non-overlapping) tasks: two count=1 segments, peak=1', () => {
    const tasks = [
      resourceTask('a', '2026-06-01', '2026-06-05', ['u1']),
      resourceTask('b', '2026-06-05', '2026-06-09', ['u1']),
    ]
    const [workload] = resourceWorkload(tasks)
    expect(workload!.peak).toBe(1)
    expect(workload!.segments.map(s => [s.start.getDate(), s.end.getDate(), s.count])).toEqual([
      [1, 5, 1],
      [5, 9, 1],
    ])
  })

  it('counts a task assigned to two resources in both resources\' workloads', () => {
    const tasks = [resourceTask('a', '2026-06-01', '2026-06-05', ['u1', 'u2'])]
    const result = resourceWorkload(tasks)
    expect(result.map(w => w.resourceId)).toEqual(['u1', 'u2'])
    expect(result[0]!.segments).toHaveLength(1)
    expect(result[0]!.segments[0]!.count).toBe(1)
    expect(result[1]!.segments).toHaveLength(1)
    expect(result[1]!.segments[0]!.count).toBe(1)
  })

  it('ignores a milestone (zero-length task): contributes no segments/events at all', () => {
    const tasks = [resourceTask('m', '2026-06-01', '2026-06-01', ['u1'], 'milestone')]
    // With no `resourceIds` option, a resource that only has a milestone never
    // enters the sweep-line at all (no events), so it's absent from the result.
    expect(resourceWorkload(tasks)).toEqual([])
    // Forcing the resource via `options.resourceIds` still yields no segments/peak.
    expect(resourceWorkload(tasks, { resourceIds: ['u1'] })).toEqual([
      { resourceId: 'u1', segments: [], peak: 0 },
    ])
  })

  it('honors options.resourceIds for the reported set and order, including idle resources', () => {
    const tasks = [resourceTask('a', '2026-06-01', '2026-06-05', ['u1'])]
    const result = resourceWorkload(tasks, { resourceIds: ['u2', 'u1', 'u3'] })
    expect(result.map(w => w.resourceId)).toEqual(['u2', 'u1', 'u3'])
    expect(result[0]).toEqual({ resourceId: 'u2', segments: [], peak: 0 })
    expect(result[2]).toEqual({ resourceId: 'u3', segments: [], peak: 0 })
    expect(result[1]!.peak).toBe(1)
  })

  it('returns an empty array for empty tasks with no resourceIds option', () => {
    expect(resourceWorkload([])).toEqual([])
  })

  it('returns idle entries for every requested resource when tasks is empty', () => {
    expect(resourceWorkload([], { resourceIds: ['u1', 'u2'] })).toEqual([
      { resourceId: 'u1', segments: [], peak: 0 },
      { resourceId: 'u2', segments: [], peak: 0 },
    ])
  })
})
