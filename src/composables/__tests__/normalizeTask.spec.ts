import { describe, expect, it } from 'vitest'
import { normalizeRow, normalizeTask, toDate } from '../../context'

describe('normalizeTask', () => {
  it('applies defaults, row id and order', () => {
    const task = normalizeTask({ id: 'a', start: '2026-01-01', end: '2026-01-05' }, 'r1', 0)
    expect(task.name).toBe('a')
    expect(task.progress).toBe(0)
    expect(task.type).toBe('task')
    expect(task.dependencies).toEqual([])
    expect(task.start).toBeInstanceOf(Date)
    expect(task.rowId).toBe('r1')
    expect(task.order).toBe(0)
  })

  it('clamps progress into 0–100', () => {
    expect(normalizeTask({ id: 'a', start: 0, end: 0, progress: 150 }, 'r', 0).progress).toBe(100)
    expect(normalizeTask({ id: 'a', start: 0, end: 0, progress: -5 }, 'r', 0).progress).toBe(0)
  })

  it('collapses a milestone end onto its start', () => {
    const m = normalizeTask(
      { id: 'm', type: 'milestone', start: '2026-02-01', end: '2026-02-10' },
      'r',
      2,
    )
    expect(m.end.getTime()).toBe(m.start.getTime())
    expect(m.order).toBe(2)
  })

  it('toDate passes Date instances through', () => {
    const d = new Date(2026, 0, 1)
    expect(toDate(d)).toBe(d)
  })

  it('coerces baseline strings into Dates', () => {
    const task = normalizeTask(
      { id: 'a', start: '2026-01-01', end: '2026-01-20', baselineStart: '2026-01-05', baselineEnd: '2026-01-12' },
      'r',
      0,
    )
    expect(task.baselineStart).toBeInstanceOf(Date)
    expect(task.baselineEnd).toBeInstanceOf(Date)
    expect(task.baselineStart!.getTime()).toBe(new Date(2026, 0, 5).getTime())
    expect(task.baselineEnd!.getTime()).toBe(new Date(2026, 0, 12).getTime())
  })

  it('leaves baseline fields undefined when absent', () => {
    const task = normalizeTask({ id: 'a', start: '2026-01-01', end: '2026-01-05' }, 'r', 0)
    expect(task.baselineStart).toBeUndefined()
    expect(task.baselineEnd).toBeUndefined()
  })

  it('does not collapse a milestone baseline end onto its start', () => {
    const m = normalizeTask(
      {
        id: 'm',
        type: 'milestone',
        start: '2026-02-01',
        end: '2026-02-10',
        baselineStart: '2026-01-05',
        baselineEnd: '2026-01-12',
      },
      'r',
      0,
    )
    // The actual end collapses onto start for a milestone...
    expect(m.end.getTime()).toBe(m.start.getTime())
    // ...but the baseline stays an interval, preserved exactly as given.
    expect(m.baselineStart!.getTime()).toBe(new Date(2026, 0, 5).getTime())
    expect(m.baselineEnd!.getTime()).toBe(new Date(2026, 0, 12).getTime())
    expect(m.baselineEnd!.getTime()).not.toBe(m.baselineStart!.getTime())
  })

  it('parses a deadline string into a local Date', () => {
    const task = normalizeTask(
      { id: 'a', start: '2026-01-01', end: '2026-01-05', deadline: '2026-01-10' },
      'r',
      0,
    )
    expect(task.deadline).toBeInstanceOf(Date)
    expect(task.deadline).toEqual(new Date(2026, 0, 10))
  })

  it('parses a constraint, coercing its date to a Date and keeping the type', () => {
    const task = normalizeTask(
      {
        id: 'a',
        start: '2026-01-01',
        end: '2026-01-05',
        constraint: { type: 'start-no-earlier-than', date: '2026-01-05' },
      },
      'r',
      0,
    )
    expect(task.constraint?.type).toBe('start-no-earlier-than')
    expect(task.constraint?.date).toBeInstanceOf(Date)
    expect(task.constraint?.date).toEqual(new Date(2026, 0, 5))
  })

  it('leaves deadline and constraint undefined when absent', () => {
    const task = normalizeTask({ id: 'a', start: '2026-01-01', end: '2026-01-05' }, 'r', 0)
    expect(task.deadline).toBeUndefined()
    expect(task.constraint).toBeUndefined()
  })
})

describe('normalizeRow', () => {
  it('resolves a row and stamps each task with the row id + order', () => {
    const row = normalizeRow(
      {
        id: 'r1',
        name: 'Backend',
        tasks: [
          { id: 'a', start: '2026-01-01', end: '2026-01-03' },
          { id: 'b', start: '2026-01-03', end: '2026-01-06' },
        ],
      },
      3,
    )
    expect(row.name).toBe('Backend')
    expect(row.order).toBe(3)
    expect(row.tasks).toHaveLength(2)
    expect(row.tasks.every(t => t.rowId === 'r1' && t.order === 3)).toBe(true)
  })

  it('defaults name to id and tasks to empty', () => {
    const row = normalizeRow({ id: 'empty' }, 0)
    expect(row.name).toBe('empty')
    expect(row.tasks).toEqual([])
  })
})
