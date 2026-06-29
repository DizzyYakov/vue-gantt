import { describe, expect, it } from 'vitest'
import { normalizeRow } from '../context'
import { assignLanes, conflictSegments, layoutGroups, layoutRows, type GroupMeta } from '../layout'
import type { GanttRow, ResolvedTask } from '../types'

const task = (id: string, start: string, end: string): ResolvedTask => {
  const row = normalizeRow({ id: 'r', tasks: [{ id, start, end }] }, 0)
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
