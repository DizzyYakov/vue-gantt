import { describe, expect, it } from 'vitest'
import { normalizeRow } from '../context'
import { assignLanes, conflictSegments, layoutRows } from '../layout'
import type { GanttRow, ResolvedTask } from '../types'

const task = (id: string, start: string, end: string): ResolvedTask => {
  const row = normalizeRow({ id: 'r', tasks: [{ id, start, end }] }, 0)
  return row.tasks[0]!
}

describe('assignLanes', () => {
  it('keeps sequential (touching) tasks in one lane', () => {
    const tasks = [
      task('a', '2026-06-01', '2026-06-05'),
      task('b', '2026-06-05', '2026-06-09'),
    ]
    expect(assignLanes(tasks)).toBe(1)
    expect(tasks.map((t) => t.lane)).toEqual([0, 0])
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
    { id: 'r1', tasks: [{ id: 'a', start: '2026-06-01', end: '2026-06-10' }, { id: 'b', start: '2026-06-05', end: '2026-06-15' }] },
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
      conflictSegments([task('a', '2026-06-01', '2026-06-05'), task('b', '2026-06-05', '2026-06-09')]),
    ).toHaveLength(0)
  })
})
