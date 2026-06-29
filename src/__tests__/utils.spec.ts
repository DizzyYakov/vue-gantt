import { describe, expect, it } from 'vitest'
import {
  addDependency,
  addTask,
  applyMove,
  autoSchedule,
  criticalPath,
  detectCycles,
  findRow,
  findTask,
  flattenTasks,
  getDependents,
  removeDependency,
  removeTask,
  rollupProgress,
  tasksExtent,
  topologicalOrder,
  updateTask,
  validateRows,
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
