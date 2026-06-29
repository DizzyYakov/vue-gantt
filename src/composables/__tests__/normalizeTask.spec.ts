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
