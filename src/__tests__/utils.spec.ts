import { describe, expect, it } from 'vitest'
import {
  addDependency,
  addTask,
  applyMove,
  autoSchedule,
  criticalPath,
  detectCycles,
  filterRows,
  findRow,
  findTask,
  flattenTasks,
  getDependents,
  isOverdue,
  removeDependency,
  removeTask,
  rollupProgress,
  slack,
  sortRows,
  tasksExtent,
  topologicalOrder,
  updateTask,
  validateRows,
  violatesConstraint,
} from '../utils'
import type { GanttMoveEvent, GanttRow } from '../types'

const sample = (): GanttRow[] => [
  { id: 'r1', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-05' }] },
  {
    id: 'r2',
    tasks: [{ id: 'b', start: '2026-01-06', end: '2026-01-10', dependencies: ['a'], progress: 40 }],
  },
]

describe('lookups & traversal', () => {
  it('flattenTasks / findTask / findRow', () => {
    const rows = sample()
    expect(flattenTasks(rows).map(t => t.id)).toEqual(['a', 'b'])
    expect(findTask(rows, 'b')?.row.id).toBe('r2')
    expect(findTask(rows, 'x')).toBeUndefined()
    expect(findRow(rows, 'r1')?.id).toBe('r1')
  })
})

describe('sorting & filtering', () => {
  it('sortRows orders by the comparator without mutating the input', () => {
    const rows = sample()
    const sorted = sortRows(rows, (a, b) => b.id.localeCompare(a.id))
    expect(sorted.map(r => r.id)).toEqual(['r2', 'r1'])
    // immutable: input order + array identity preserved
    expect(rows.map(r => r.id)).toEqual(['r1', 'r2'])
    expect(sorted).not.toBe(rows)
  })

  it('sortRows composes with row metrics (progress rollup)', () => {
    const rows = sample()
    const byProgressDesc = sortRows(
      rows,
      (a, b) => rollupProgress(b.tasks ?? []) - rollupProgress(a.tasks ?? []),
    )
    expect(byProgressDesc[0]!.id).toBe('r2') // r2 has progress 40, r1 has 0
  })

  it('filterRows keeps only matching rows without mutating the input', () => {
    const rows = sample()
    const onlyR2 = filterRows(rows, r => r.id === 'r2')
    expect(onlyR2.map(r => r.id)).toEqual(['r2'])
    expect(rows).toHaveLength(2)
    expect(onlyR2).not.toBe(rows)
    expect(filterRows(rows, () => false)).toEqual([])
  })
})

describe('immutable edits', () => {
  it('applyMove relocates a task with new dates and does not mutate input', () => {
    const rows = sample()
    const e: GanttMoveEvent = {
      id: 'a',
      start: new Date(2026, 0, 3),
      end: new Date(2026, 0, 7),
      fromRowId: 'r1',
      toRowId: 'r2',
      task: {} as never,
    }
    const next = applyMove(rows, e)
    expect(findTask(next, 'a')?.row.id).toBe('r2')
    expect(findTask(next, 'a')?.task.start).toEqual(new Date(2026, 0, 3))
    // original untouched
    expect(findTask(rows, 'a')?.row.id).toBe('r1')
  })

  it('applyMove is a no-op for an unknown target', () => {
    const rows = sample()
    const e = {
      id: 'a',
      start: new Date(),
      end: new Date(),
      fromRowId: 'r1',
      toRowId: 'nope',
      task: {} as never,
    }
    expect(applyMove(rows, e)).toBe(rows)
  })

  it('updateTask / addTask / removeTask', () => {
    const rows = sample()
    expect(findTask(updateTask(rows, 'b', { progress: 90 }), 'b')?.task.progress).toBe(90)
    expect(
      flattenTasks(addTask(rows, 'r1', { id: 'c', start: '2026-01-02' })).map(t => t.id),
    ).toContain('c')
    expect(findTask(removeTask(rows, 'a'), 'a')).toBeUndefined()
  })
})

describe('dates & progress', () => {
  it('tasksExtent spans earliest start to latest end', () => {
    const ext = tasksExtent(sample())!
    expect(ext.start).toEqual(new Date(2026, 0, 1))
    expect(ext.end).toEqual(new Date(2026, 0, 10))
    expect(tasksExtent([])).toBeNull()
  })

  it('rollupProgress is duration-weighted', () => {
    const tasks = [
      { id: 'x', start: '2026-01-01', end: '2026-01-05', progress: 100 }, // 4 days
      { id: 'y', start: '2026-01-01', end: '2026-01-09', progress: 25 }, // 8 days
    ]
    // (100*4 + 25*8) / 12 = 50
    expect(Math.round(rollupProgress(tasks))).toBe(50)
  })
})

describe('dependencies', () => {
  it('getDependents returns reverse links', () => {
    expect(getDependents(sample(), 'a')).toEqual(['b'])
  })

  it('addDependency / removeDependency are immutable and guarded', () => {
    const rows = sample() // b already depends on a
    // add a new dep a→? none yet; add b as dep of a (a.dependencies += b)
    const added = addDependency(rows, 'b', 'a')
    expect(findTask(added, 'a')?.task.dependencies).toEqual(['b'])
    expect(findTask(rows, 'a')?.task.dependencies ?? []).toEqual([]) // original untouched
    // self-link + duplicate are no-ops (same reference back)
    expect(addDependency(rows, 'a', 'a')).toBe(rows)
    expect(addDependency(rows, 'a', 'b')).toBe(rows) // b already depends on a
    // remove
    expect(findTask(removeDependency(rows, 'a', 'b'), 'b')?.task.dependencies).toEqual([])
    expect(removeDependency(rows, 'x', 'b')).toBe(rows) // absent → no-op
  })

  it('detectCycles finds a cycle and ignores acyclic graphs', () => {
    expect(detectCycles(sample())).toEqual([])
    const cyclic: GanttRow[] = [
      {
        id: 'r',
        tasks: [
          { id: 'a', start: '2026-01-01', dependencies: ['b'] },
          { id: 'b', start: '2026-01-01', dependencies: ['a'] },
        ],
      },
    ]
    expect(detectCycles(cyclic).length).toBe(1)
  })

  it('topologicalOrder puts predecessors first', () => {
    const order = topologicalOrder(sample())
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'))
  })

  it('criticalPath returns the longest chain', () => {
    const rows: GanttRow[] = [
      {
        id: 'r',
        tasks: [
          { id: 'a', start: '2026-01-01', end: '2026-01-03' },
          { id: 'b', start: '2026-01-03', end: '2026-01-10', dependencies: ['a'] }, // long
          { id: 'c', start: '2026-01-03', end: '2026-01-04', dependencies: ['a'] }, // short
        ],
      },
    ]
    expect(criticalPath(rows)).toEqual(['a', 'b'])
  })
})

describe('slack (free float)', () => {
  it('measures the gap (days) from a task end to its nearest successor start', () => {
    const rows: GanttRow[] = [
      { id: 'r1', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-03' }] },
      {
        id: 'r2',
        tasks: [{ id: 'b', start: '2026-01-06', end: '2026-01-10', dependencies: ['a'] }],
      },
    ]
    const map = slack(rows)
    // a ends Jan-03, b starts Jan-06 → 3-day gap.
    expect(map.get('a')).toBeCloseTo(3)
    // b has no successors → absent.
    expect(map.has('b')).toBe(false)
  })

  it('omits back-to-back tasks (zero gap)', () => {
    const rows: GanttRow[] = [
      { id: 'r1', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-06' }] },
      {
        id: 'r2',
        tasks: [{ id: 'b', start: '2026-01-06', end: '2026-01-10', dependencies: ['a'] }],
      },
    ]
    expect(slack(rows).has('a')).toBe(false)
  })

  it('takes the minimum gap across multiple successors', () => {
    const rows: GanttRow[] = [
      { id: 'r1', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-03' }] },
      {
        id: 'r2',
        tasks: [
          { id: 'b', start: '2026-01-06', end: '2026-01-08', dependencies: ['a'] }, // gap 3
          { id: 'c', start: '2026-01-04', end: '2026-01-05', dependencies: ['a'] }, // gap 1 (nearest)
        ],
      },
    ]
    // nearest successor starts Jan-04 → 1-day gap.
    expect(slack(rows).get('a')).toBeCloseTo(1)
  })

  it('returns an empty map when nothing depends on anything', () => {
    const rows: GanttRow[] = [
      { id: 'r1', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-05' }] },
      { id: 'r2', tasks: [{ id: 'b', start: '2026-01-06', end: '2026-01-10' }] },
    ]
    expect(slack(rows).size).toBe(0)
  })
})

describe('autoSchedule', () => {
  it('pushes a successor to start no earlier than its predecessor ends', () => {
    const rows: GanttRow[] = [
      { id: 'r1', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-05' }] },
      {
        id: 'r2',
        tasks: [{ id: 'b', start: '2026-01-02', end: '2026-01-04', dependencies: ['a'] }],
      },
    ]
    const b = findTask(autoSchedule(rows), 'b')!.task
    expect(b.start).toEqual(new Date(2026, 0, 5)) // shifted to a.end
    expect(b.end).toEqual(new Date(2026, 0, 7)) // duration (2 days) preserved
  })

  it('moves a start-no-earlier-than task without deps to its constraint floor', () => {
    const rows: GanttRow[] = [
      {
        id: 'r1',
        tasks: [
          {
            id: 'a',
            start: '2026-01-01',
            end: '2026-01-03',
            constraint: { type: 'start-no-earlier-than', date: '2026-01-05' },
          },
        ],
      },
    ]
    const a = findTask(autoSchedule(rows), 'a')!.task
    expect(a.start).toEqual(new Date(2026, 0, 5)) // raised to the SNET date
    expect(a.end).toEqual(new Date(2026, 0, 7)) // duration (2 days) preserved
  })

  it('honours finish-no-earlier-than / must-finish-on by pushing finish ≥ date', () => {
    const rows = (type: 'finish-no-earlier-than' | 'must-finish-on'): GanttRow[] => [
      {
        id: 'r1',
        tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-03', constraint: { type, date: '2026-01-10' } }],
      },
    ]
    for (const type of ['finish-no-earlier-than', 'must-finish-on'] as const) {
      const a = findTask(autoSchedule(rows(type)), 'a')!.task
      expect(a.end).toEqual(new Date(2026, 0, 10)) // finish reaches the date
      expect(a.start).toEqual(new Date(2026, 0, 8)) // date - duration (2 days)
    }
  })

  it('does not move a task for an upper-bound constraint (SNLT / FNLT)', () => {
    const rows = (type: 'start-no-later-than' | 'finish-no-later-than'): GanttRow[] => [
      {
        id: 'r1',
        tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-03', constraint: { type, date: '2026-01-05' } }],
      },
    ]
    for (const type of ['start-no-later-than', 'finish-no-later-than'] as const) {
      const input = rows(type)
      expect(autoSchedule(input)).toBe(input) // unchanged (no shift → same reference)
    }
  })
})

describe('isOverdue', () => {
  it('is true when finish is past the deadline', () => {
    expect(isOverdue({ end: new Date(2026, 0, 10), deadline: new Date(2026, 0, 5) })).toBe(true)
  })

  it('is false when finish is on or before the deadline', () => {
    expect(isOverdue({ end: new Date(2026, 0, 5), deadline: new Date(2026, 0, 5) })).toBe(false)
    expect(isOverdue({ end: new Date(2026, 0, 1), deadline: new Date(2026, 0, 5) })).toBe(false)
  })

  it('is false when there is no deadline', () => {
    expect(isOverdue({ end: new Date(2026, 0, 10), deadline: undefined })).toBe(false)
  })
})

describe('violatesConstraint', () => {
  const at = (d: number) => new Date(2026, 0, d)

  it('is true for finish-no-later-than when the finish is past the date', () => {
    expect(
      violatesConstraint({
        start: at(1),
        end: at(10),
        constraint: { type: 'finish-no-later-than', date: at(5) },
      }),
    ).toBe(true)
  })

  it('is true for start-no-later-than when the start is past the date', () => {
    expect(
      violatesConstraint({
        start: at(10),
        end: at(12),
        constraint: { type: 'start-no-later-than', date: at(5) },
      }),
    ).toBe(true)
  })

  it('is false for a lower-bound constraint (start-no-earlier-than)', () => {
    expect(
      violatesConstraint({
        start: at(10),
        end: at(12),
        constraint: { type: 'start-no-earlier-than', date: at(5) },
      }),
    ).toBe(false)
  })

  it('is false when there is no constraint', () => {
    expect(violatesConstraint({ start: at(1), end: at(10), constraint: undefined })).toBe(false)
  })
})

describe('validateRows', () => {
  it('flags duplicate ids, missing deps, bad ranges and orphan groups', () => {
    const rows: GanttRow[] = [
      {
        id: 'r1',
        groupId: 'ghost',
        tasks: [
          { id: 'a', start: '2026-01-05', end: '2026-01-01' }, // invalid range
          { id: 'a', start: '2026-01-01' }, // duplicate task id
          { id: 'b', start: '2026-01-01', dependencies: ['missing'] }, // missing dep
        ],
      },
      { id: 'r1', tasks: [] }, // duplicate row id
    ]
    const types = validateRows(rows, []).map(i => i.type)
    expect(types).toContain('duplicate-row-id')
    expect(types).toContain('duplicate-task-id')
    expect(types).toContain('invalid-range')
    expect(types).toContain('missing-dependency')
    expect(types).toContain('orphan-group')
    expect(validateRows(sample())).toEqual([])
  })
})
