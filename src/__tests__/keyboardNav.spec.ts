import { describe, expect, it } from 'vitest'
import { firstTaskId, keyToNavDirection, nextTaskId } from '../keyboardNav'
import type { ResolvedRow, ResolvedTask } from '../types'

// Pure core (no Vue) — drive it directly, like `useGanttScrollApi.spec.ts`.

function makeTask(overrides: Partial<ResolvedTask> = {}): ResolvedTask {
  return {
    id: 't1',
    name: 't1',
    start: new Date(2026, 0, 10),
    end: new Date(2026, 0, 15),
    progress: 0,
    dependencies: [],
    resourceIds: [],
    type: 'task',
    meta: {},
    rowId: 'r1',
    order: 0,
    lane: 0,
    ...overrides,
  }
}

function makeRow(overrides: Partial<ResolvedRow> = {}): ResolvedRow {
  return {
    id: 'r1',
    name: 'Row 1',
    order: 0,
    meta: {},
    tasks: [],
    groupId: '',
    parentId: '',
    depth: 0,
    hasChildren: false,
    childIds: [],
    collapsed: false,
    hidden: false,
    laneCount: 1,
    top: 0,
    height: 32,
    ...overrides,
  }
}

describe('nextTaskId', () => {
  it('right/left step within the row by time order, clamping at the edges', () => {
    const early = makeTask({ id: 'a', start: new Date(2026, 0, 1) })
    const mid = makeTask({ id: 'b', start: new Date(2026, 0, 5) })
    const late = makeTask({ id: 'c', start: new Date(2026, 0, 10) })
    const rows = [makeRow({ tasks: [early, mid, late] })]

    expect(nextTaskId(rows, 'a', 'right')).toBe('b')
    expect(nextTaskId(rows, 'b', 'right')).toBe('c')
    // At the right edge, stays put.
    expect(nextTaskId(rows, 'c', 'right')).toBe('c')

    expect(nextTaskId(rows, 'c', 'left')).toBe('b')
    expect(nextTaskId(rows, 'b', 'left')).toBe('a')
    // At the left edge, stays put.
    expect(nextTaskId(rows, 'a', 'left')).toBe('a')
  })

  it('sorts tasks within a row by start regardless of declaration order', () => {
    // Declared out of chronological order: c (latest) first, a (earliest) last.
    const c = makeTask({ id: 'c', start: new Date(2026, 0, 20) })
    const a = makeTask({ id: 'a', start: new Date(2026, 0, 1) })
    const b = makeTask({ id: 'b', start: new Date(2026, 0, 10) })
    const rows = [makeRow({ tasks: [c, a, b] })]

    // Right from the earliest (a) should go to b, then c — sorted by start, not declaration.
    expect(nextTaskId(rows, 'a', 'right')).toBe('b')
    expect(nextTaskId(rows, 'b', 'right')).toBe('c')
  })

  it('down/up jump to the nearest non-empty row, picking the task closest in start time', () => {
    const top = makeTask({ id: 'top', start: new Date(2026, 0, 10) })
    // Empty and hidden rows sit between the two navigable rows and must be skipped.
    const emptyRow = makeRow({ id: 'empty', order: 1, tasks: [] })
    const hiddenRow = makeRow({
      id: 'hidden',
      order: 2,
      hidden: true,
      tasks: [makeTask({ id: 'hiddenTask', start: new Date(2026, 0, 10) })],
    })
    const near = makeTask({ id: 'near', start: new Date(2026, 0, 12) })
    const far = makeTask({ id: 'far', start: new Date(2026, 0, 1) })
    const bottomRow = makeRow({ id: 'bottom', order: 3, tasks: [far, near] })
    const rows = [makeRow({ id: 'top', order: 0, tasks: [top] }), emptyRow, hiddenRow, bottomRow]

    // Down from `top` skips `empty` and `hidden`, landing on `bottom`'s closest-by-start task.
    expect(nextTaskId(rows, 'top', 'down')).toBe('near')
    // Up from `near`/`far` goes back to `top`'s only task.
    expect(nextTaskId(rows, 'near', 'up')).toBe('top')
  })

  it('down/up stay put when there is no adjacent navigable row', () => {
    const only = makeTask({ id: 'only' })
    const rows = [makeRow({ tasks: [only] })]

    expect(nextTaskId(rows, 'only', 'down')).toBe('only')
    expect(nextTaskId(rows, 'only', 'up')).toBe('only')
  })

  it('breaks a start-time tie by picking the earlier row when jumping down/up', () => {
    const sameStart = new Date(2026, 0, 10)
    const anchor = makeTask({ id: 'anchor', start: sameStart })
    // Two candidates in the target row are equidistant in start-time from the anchor.
    const beforeTie = makeTask({ id: 'before', start: new Date(2026, 0, 8) })
    const afterTie = makeTask({ id: 'after', start: new Date(2026, 0, 12) })
    const rows = [
      makeRow({ id: 'r1', order: 0, tasks: [anchor] }),
      makeRow({ id: 'r2', order: 1, tasks: [beforeTie, afterTie] }),
    ]

    // `closestByStart` keeps the first-seen best on ties, i.e. the earlier task.
    expect(nextTaskId(rows, 'anchor', 'down')).toBe('before')
  })

  it('home/end go to the first/last task of the active row', () => {
    const a = makeTask({ id: 'a', start: new Date(2026, 0, 1) })
    const b = makeTask({ id: 'b', start: new Date(2026, 0, 5) })
    const c = makeTask({ id: 'c', start: new Date(2026, 0, 10) })
    const rows = [makeRow({ tasks: [a, b, c] })]

    expect(nextTaskId(rows, 'b', 'first')).toBe('a')
    expect(nextTaskId(rows, 'b', 'last')).toBe('c')
  })

  it('resolves to the first task of the first navigable row when activeId is null or unknown', () => {
    const a = makeTask({ id: 'a', start: new Date(2026, 0, 5) })
    const b = makeTask({ id: 'b', start: new Date(2026, 0, 1) })
    // Empty row first, so it must be skipped for "first navigable".
    const rows = [makeRow({ id: 'empty', order: 0, tasks: [] }), makeRow({ id: 'r2', order: 1, tasks: [a, b] })]

    // `b` starts earlier than `a`, so sorted-by-start makes `b` first.
    expect(nextTaskId(rows, null, 'right')).toBe('b')
    expect(nextTaskId(rows, 'nonexistent-id', 'right')).toBe('b')
  })

  it('returns null when there are no navigable tasks at all', () => {
    const rows = [makeRow({ id: 'empty1', tasks: [] }), makeRow({ id: 'empty2', hidden: true, tasks: [makeTask()] })]

    expect(nextTaskId(rows, null, 'right')).toBeNull()
    expect(nextTaskId([], 'anything', 'down')).toBeNull()
  })
})

describe('keyToNavDirection', () => {
  it('maps arrow/Home/End keys to their nav direction', () => {
    expect(keyToNavDirection('ArrowLeft')).toBe('left')
    expect(keyToNavDirection('ArrowRight')).toBe('right')
    expect(keyToNavDirection('ArrowUp')).toBe('up')
    expect(keyToNavDirection('ArrowDown')).toBe('down')
    expect(keyToNavDirection('Home')).toBe('first')
    expect(keyToNavDirection('End')).toBe('last')
  })

  it('returns null for non-nav keys', () => {
    expect(keyToNavDirection('a')).toBeNull()
    expect(keyToNavDirection('Enter')).toBeNull()
  })
})

describe('firstTaskId', () => {
  it('returns the earliest task of the first visible, non-empty row', () => {
    const late = makeTask({ id: 'late', start: new Date(2026, 0, 20) })
    const early = makeTask({ id: 'early', start: new Date(2026, 0, 1) })
    const rows = [
      makeRow({ id: 'empty', order: 0, tasks: [] }),
      makeRow({ id: 'hidden', order: 1, hidden: true, tasks: [makeTask({ id: 'hiddenTask' })] }),
      makeRow({ id: 'first-real', order: 2, tasks: [late, early] }),
    ]

    expect(firstTaskId(rows)).toBe('early')
  })

  it('returns null when there are no navigable tasks', () => {
    expect(firstTaskId([makeRow({ tasks: [] })])).toBeNull()
    expect(firstTaskId([])).toBeNull()
  })
})
