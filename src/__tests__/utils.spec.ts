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
  sprintPeriods,
  tasksExtent,
  topologicalOrder,
  updateRow,
  updateTask,
  validateRows,
  violatesConstraint,
} from '../utils'
import type { GanttDependency, GanttMoveEvent, GanttRow } from '../types'

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

  it('updateRow merges a patch into the row by id and leaves the others untouched', () => {
    const rows = sample()
    const next = updateRow(rows, 'r1', { name: 'X' })
    expect(findRow(next, 'r1')?.name).toBe('X')
    // sibling row unchanged
    expect(findRow(next, 'r2')).toStrictEqual(findRow(rows, 'r2'))
    // original untouched
    expect(findRow(rows, 'r1')?.name).toBeUndefined()
  })

  it('updateRow is a no-op for an unknown id (names unchanged)', () => {
    const rows = sample()
    const next = updateRow(rows, 'nope', { name: 'X' })
    // Like updateTask, it always returns a fresh top-level array — so compare by
    // value, not reference. Row data must be untouched.
    expect(next.map(r => r.name)).toEqual(rows.map(r => r.name))
    expect(next).toStrictEqual(rows)
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

  it('structural utilities read object deps by id', () => {
    const rows: GanttRow[] = [
      { id: 'r1', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-05' }] },
      {
        id: 'r2',
        tasks: [
          {
            id: 'b',
            start: '2026-01-06',
            end: '2026-01-10',
            dependencies: [{ id: 'a', type: 'SS', lag: 1 }],
          },
        ],
      },
    ]
    expect(getDependents(rows, 'a')).toEqual(['b'])
    expect(topologicalOrder(rows).indexOf('a')).toBeLessThan(topologicalOrder(rows).indexOf('b'))
    expect(detectCycles(rows)).toEqual([])
    expect(validateRows(rows)).toEqual([])
    // Unknown id inside an object dep is still flagged.
    const broken = addDependency(rows, 'b', 'a', { type: 'FF' })
    expect(
      validateRows([
        { id: 'r', tasks: [{ id: 'x', start: 0, dependencies: [{ id: 'ghost' }] }] },
      ]).map(i => i.type),
    ).toContain('missing-dependency')
    expect(detectCycles(broken).length).toBe(1) // a↔b via mixed shapes
  })

  it('addDependency stores a bare id for plain FS and an object for typed links', () => {
    const rows = sample()
    // Plain FS (explicit or implicit, no lag) → compact legacy string.
    expect(findTask(addDependency(rows, 'b', 'a'), 'a')?.task.dependencies).toEqual(['b'])
    expect(
      findTask(addDependency(rows, 'b', 'a', { type: 'FS' }), 'a')?.task.dependencies,
    ).toEqual(['b'])
    // Typed / lagged → object with only the non-default fields.
    expect(
      findTask(addDependency(rows, 'b', 'a', { type: 'SS', lag: 2 }), 'a')?.task.dependencies,
    ).toEqual([{ id: 'b', type: 'SS', lag: 2 }])
    expect(
      findTask(addDependency(rows, 'b', 'a', { lag: -1 }), 'a')?.task.dependencies,
    ).toEqual([{ id: 'b', lag: -1 }])
    // One link per pair: a typed add over an existing string dep is a no-op.
    expect(addDependency(rows, 'a', 'b', { type: 'SS' })).toBe(rows)
    // removeDependency matches object deps by id.
    const typed = addDependency(rows, 'b', 'a', { type: 'FF', lag: 1 })
    expect(findTask(removeDependency(typed, 'b', 'a'), 'a')?.task.dependencies).toEqual([])
  })
})

describe('typed links (criticalPath)', () => {
  it('follows an SS+lag link when it is the longest constraint', () => {
    const rows: GanttRow[] = [
      {
        id: 'r',
        tasks: [
          { id: 'a', start: '2026-01-01', end: '2026-01-03' }, // dur 2
          // SS+5d: starts 5 days after a starts → finishes at relative day 6.
          {
            id: 'b',
            start: '2026-01-06',
            end: '2026-01-07',
            dependencies: [{ id: 'a', type: 'SS', lag: 5 }],
          },
          // FS chain off a: finishes at relative day 2+3 = 5 — shorter.
          { id: 'c', start: '2026-01-03', end: '2026-01-06', dependencies: ['a'] },
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

  it('computes the allowance per link type', () => {
    const pred = { id: 'a', start: '2026-01-05', end: '2026-01-08' }
    const succ = (dep: string | GanttDependency) => ({
      id: 'b',
      start: '2026-01-10',
      end: '2026-01-12',
      dependencies: [dep],
    })
    const rowsWith = (dep: string | GanttDependency): GanttRow[] => [
      { id: 'r1', tasks: [pred] },
      { id: 'r2', tasks: [succ(dep)] },
    ]
    // SS: succ.start − pred.start = Jan-10 − Jan-05 = 5 days.
    expect(slack(rowsWith({ id: 'a', type: 'SS' })).get('a')).toBeCloseTo(5)
    // FF: succ.end − pred.end = Jan-12 − Jan-08 = 4 days.
    expect(slack(rowsWith({ id: 'a', type: 'FF' })).get('a')).toBeCloseTo(4)
    // SF: succ.end − pred.start = Jan-12 − Jan-05 = 7 days.
    expect(slack(rowsWith({ id: 'a', type: 'SF' })).get('a')).toBeCloseTo(7)
    // FS with lag 1: succ.start − (pred.end + 1d) = 2 − 1 = 1 day.
    expect(slack(rowsWith({ id: 'a', lag: 1 })).get('a')).toBeCloseTo(1)
  })

  it('takes the minimum across mixed-type links and clamps at zero', () => {
    const rows: GanttRow[] = [
      { id: 'r1', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-03' }] },
      {
        id: 'r2',
        tasks: [
          // FS gap: Jan-06 − Jan-03 = 3 days.
          { id: 'b', start: '2026-01-06', end: '2026-01-08', dependencies: ['a'] },
          // FF gap: Jan-04 − Jan-03 = 1 day (the binding minimum).
          {
            id: 'c',
            start: '2026-01-02',
            end: '2026-01-04',
            dependencies: [{ id: 'a', type: 'FF' }],
          },
        ],
      },
    ]
    expect(slack(rows).get('a')).toBeCloseTo(1)
    // A violated link (negative allowance) clamps the task out of the map.
    const violated: GanttRow[] = [
      { id: 'r1', tasks: [{ id: 'a', start: '2026-01-05', end: '2026-01-08' }] },
      {
        id: 'r2',
        tasks: [
          // SF: succ.end (Jan-03) − pred.start (Jan-05) = −2 → no positive float.
          {
            id: 'b',
            start: '2026-01-01',
            end: '2026-01-03',
            dependencies: [{ id: 'a', type: 'SF' }],
          },
        ],
      },
    ]
    expect(slack(violated).has('a')).toBe(false)
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

  // Predecessor a: Jan-01 → Jan-05; successor b keeps its 2-day duration.
  const typedRows = (dep: string | GanttDependency, b = { start: '2026-01-01', end: '2026-01-03' }): GanttRow[] => [
    { id: 'r1', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-05' }] },
    { id: 'r2', tasks: [{ id: 'b', ...b, dependencies: [dep] }] },
  ]

  it('SS: pushes the successor start to the predecessor start + lag', () => {
    const b = findTask(autoSchedule(typedRows({ id: 'a', type: 'SS', lag: 2 })), 'b')!.task
    expect(b.start).toEqual(new Date(2026, 0, 3)) // a.start + 2d
    expect(b.end).toEqual(new Date(2026, 0, 5)) // duration preserved
  })

  it('FF: aligns the successor finish to the predecessor finish + lag', () => {
    const b = findTask(autoSchedule(typedRows({ id: 'a', type: 'FF' })), 'b')!.task
    expect(b.end).toEqual(new Date(2026, 0, 5)) // = a.end
    expect(b.start).toEqual(new Date(2026, 0, 3)) // finish − duration
  })

  it('SF: pushes the successor finish to the predecessor start + lag', () => {
    const b = findTask(
      autoSchedule(typedRows({ id: 'a', type: 'SF', lag: 1 }, { start: '2025-12-30', end: '2025-12-31' })),
      'b',
    )!.task
    expect(b.end).toEqual(new Date(2026, 0, 2)) // a.start + 1d
    expect(b.start).toEqual(new Date(2026, 0, 1)) // finish − duration (1 day)
  })

  it('FS with a fractional lag lands mid-day; a lead (negative lag) lowers the floor', () => {
    const half = findTask(autoSchedule(typedRows({ id: 'a', lag: 0.5 })), 'b')!.task
    expect(half.start).toEqual(new Date(2026, 0, 5, 12)) // a.end + 12h
    const lead = findTask(autoSchedule(typedRows({ id: 'a', lag: -2 })), 'b')!.task
    expect(lead.start).toEqual(new Date(2026, 0, 3)) // a.end − 2d
  })

  it('is forward-only: a lead never pulls an already-later task earlier', () => {
    const input = typedRows({ id: 'a', lag: -2 }, { start: '2026-01-10', end: '2026-01-12' })
    expect(autoSchedule(input)).toBe(input) // b already past the floor → untouched
  })

  it('takes the max floor across mixed-type predecessors', () => {
    const rows: GanttRow[] = [
      {
        id: 'r1',
        tasks: [
          { id: 'a1', start: '2026-01-01', end: '2026-01-04' }, // FS floor: Jan-04
          { id: 'a2', start: '2026-01-05', end: '2026-01-09' }, // SS+1 floor: Jan-06 (binding)
        ],
      },
      {
        id: 'r2',
        tasks: [
          {
            id: 'b',
            start: '2026-01-01',
            end: '2026-01-03',
            dependencies: ['a1', { id: 'a2', type: 'SS', lag: 1 }],
          },
        ],
      },
    ]
    expect(findTask(autoSchedule(rows), 'b')!.task.start).toEqual(new Date(2026, 0, 6))
  })

  it('cascades through typed links from changedId', () => {
    const rows: GanttRow[] = [
      { id: 'r1', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-05' }] },
      {
        id: 'r2',
        tasks: [
          {
            id: 'b',
            start: '2026-01-01',
            end: '2026-01-03',
            dependencies: [{ id: 'a', type: 'SS', lag: 2 }],
          },
        ],
      },
      // c is unrelated and violates nothing scoped to a's descendants.
      { id: 'r3', tasks: [{ id: 'c', start: '2026-01-01', end: '2026-01-02' }] },
    ]
    const out = autoSchedule(rows, 'a')
    expect(findTask(out, 'b')!.task.start).toEqual(new Date(2026, 0, 3))
    expect(findTask(out, 'c')!.task).toBe(findTask(rows, 'c')!.task) // untouched
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

describe('sprintPeriods', () => {
  it('builds a contiguous run of equal-length weekly periods', () => {
    const periods = sprintPeriods({ from: '2026-06-01', every: 2, unit: 'week', count: 3 })
    expect(periods).toHaveLength(3)
    // Dates are coerced to `Date` (local midnight for a bare YYYY-MM-DD).
    expect(periods[0]!.start).toEqual(new Date(2026, 5, 1))
    // Contiguous: each period's start equals the previous period's end.
    expect(periods[0]!.end).toEqual(periods[1]!.start)
    expect(periods[1]!.end).toEqual(periods[2]!.start)
    // Two weeks = 14 days.
    expect((periods[0]!.end as Date).getTime() - (periods[0]!.start as Date).getTime()).toBe(
      14 * 86_400_000,
    )
  })

  it('supports a day unit and default `Sprint N` labels + ids', () => {
    const periods = sprintPeriods({ from: '2026-06-01', every: 10, unit: 'day', count: 2 })
    expect(periods.map(p => p.label)).toEqual(['Sprint 1', 'Sprint 2'])
    expect(periods.map(p => p.id)).toEqual(['sprint-1', 'sprint-2'])
    expect((periods[0]!.end as Date).getTime() - (periods[0]!.start as Date).getTime()).toBe(
      10 * 86_400_000,
    )
  })

  it('accepts custom label + id builders', () => {
    const periods = sprintPeriods({
      from: new Date(2026, 5, 1),
      every: 1,
      unit: 'week',
      count: 2,
      label: i => `S${i}`,
      id: i => `s${i}`,
    })
    expect(periods.map(p => p.label)).toEqual(['S0', 'S1'])
    expect(periods.map(p => p.id)).toEqual(['s0', 's1'])
  })
})
