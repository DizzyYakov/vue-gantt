import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { useGanttHistory } from '../useGanttHistory'
import { addDependency, applyMove, updateTask } from '../../utils'
import type { GanttMoveEvent, GanttRow, ResolvedTask } from '../../types'

// A tiny fixture: two rows, task `b` depends on `a`. Mirrors makeRows in
// src/components/__tests__/vModelRows.spec.ts.
function makeRows(): GanttRow[] {
  return [
    {
      id: 'r1',
      name: 'R1',
      tasks: [{ id: 'a', name: 'A', start: '2026-01-01', end: '2026-01-05' }],
    },
    {
      id: 'r2',
      name: 'R2',
      tasks: [{ id: 'b', name: 'B', start: '2026-01-06', end: '2026-01-10', dependencies: ['a'] }],
    },
  ]
}

// applyMove reads the moved task from `rows`, not from `e.task`, so a minimal
// placeholder is enough for the immutable edit under test.
function moveEvent(): GanttMoveEvent {
  return {
    id: 'a',
    start: new Date('2026-01-03T00:00:00'),
    end: new Date('2026-01-07T00:00:00'),
    fromRowId: 'r1',
    toRowId: 'r2',
    task: { id: 'a' } as unknown as ResolvedTask,
  }
}

describe('useGanttHistory', () => {
  it('starts with nothing to undo or redo', () => {
    const rows = ref(makeRows())
    const { canUndo, canRedo } = useGanttHistory(rows)

    expect(canUndo.value).toBe(false)
    expect(canRedo.value).toBe(false)
  })

  it('records a reassignment as an undoable snapshot', () => {
    // arrange
    const rows = ref(makeRows())
    const { canUndo, canRedo } = useGanttHistory(rows)

    // act
    rows.value = updateTask(rows.value, 'a', { progress: 50 })

    // assert (flush:'sync' — no nextTick needed)
    expect(canUndo.value).toBe(true)
    expect(canRedo.value).toBe(false)
  })

  it('undo restores the previous value without recording it, enabling redo', () => {
    // arrange
    const initial = makeRows()
    const rows = ref<GanttRow[]>(initial)
    const { undo, canUndo, canRedo } = useGanttHistory(rows)
    rows.value = updateTask(rows.value, 'a', { progress: 50 })

    // act
    undo()

    // assert — restored to the initial snapshot, and undo did not add an entry
    expect(rows.value).toEqual(initial)
    expect(canUndo.value).toBe(false)
    expect(canRedo.value).toBe(true)
  })

  it('redo reapplies the undone edit', () => {
    // arrange
    const rows = ref(makeRows())
    const { undo, redo, canUndo, canRedo } = useGanttHistory(rows)
    const edited = updateTask(rows.value, 'a', { progress: 50 })
    rows.value = edited
    undo()

    // act
    redo()

    // assert
    expect(rows.value).toEqual(edited)
    expect(canUndo.value).toBe(true)
    expect(canRedo.value).toBe(false)
  })

  it('drops the redo tail when a new edit follows an undo', () => {
    // arrange — two edits, then undo one so a redo is available
    const rows = ref(makeRows())
    const { undo, canUndo, canRedo } = useGanttHistory(rows)
    rows.value = updateTask(rows.value, 'a', { progress: 25 })
    rows.value = updateTask(rows.value, 'a', { progress: 75 })
    undo()
    expect(canRedo.value).toBe(true)

    // act — a fresh edit invalidates the redo tail
    rows.value = updateTask(rows.value, 'a', { progress: 90 })

    // assert
    expect(canRedo.value).toBe(false)
    expect(canUndo.value).toBe(true)
  })

  it('is a no-op at the history boundaries', () => {
    // arrange
    const initial = makeRows()
    const rows = ref<GanttRow[]>(initial)
    const { undo, redo, canUndo, canRedo } = useGanttHistory(rows)

    // act + assert — redo at the tip does nothing
    expect(() => redo()).not.toThrow()
    expect(canRedo.value).toBe(false)
    expect(rows.value).toEqual(initial)

    // act + assert — undo at the base does nothing
    expect(() => undo()).not.toThrow()
    expect(canUndo.value).toBe(false)
    expect(rows.value).toEqual(initial)
  })

  it('caps the stack at `limit`, dropping the oldest snapshots', () => {
    // arrange — limit=2 keeps only 2 entries, so at most 1 undo
    const rows = ref(makeRows())
    const { undo, canUndo } = useGanttHistory(rows, { limit: 2 })
    const first = updateTask(rows.value, 'a', { progress: 25 })
    rows.value = first
    const second = updateTask(rows.value, 'a', { progress: 50 })
    rows.value = second
    const third = updateTask(rows.value, 'a', { progress: 75 })
    rows.value = third

    // act — one undo is allowed, then the base was dropped
    undo()

    // assert — restored to the *second* snapshot, not the original
    expect(rows.value).toEqual(second)
    expect(canUndo.value).toBe(false)
  })

  it('clear resets history but keeps the current value', () => {
    // arrange
    const rows = ref(makeRows())
    const { undo, clear, canUndo, canRedo } = useGanttHistory(rows)
    const edited = updateTask(rows.value, 'a', { progress: 50 })
    rows.value = edited
    undo()

    // act
    clear()

    // assert
    expect(canUndo.value).toBe(false)
    expect(canRedo.value).toBe(false)
    expect(rows.value).toEqual(makeRows())
  })

  it('records and rolls back different edit kinds (move, addDependency)', () => {
    // arrange
    const initial = makeRows()
    const rows = ref<GanttRow[]>(initial)
    const { undo, redo, canUndo, canRedo } = useGanttHistory(rows)

    // act — an applyMove edit
    const afterMove = applyMove(rows.value, moveEvent())
    rows.value = afterMove
    expect(canUndo.value).toBe(true)

    // act — an addDependency edit on top (a new, non-duplicate link so the
    // immutable util returns a fresh array and the watcher records it)
    const afterDep = addDependency(rows.value, 'b', 'a')
    expect(afterDep).not.toBe(afterMove)
    rows.value = afterDep

    // assert — undo peels back the dependency edit, then the move
    undo()
    expect(rows.value).toEqual(afterMove)
    undo()
    expect(rows.value).toEqual(initial)
    expect(canUndo.value).toBe(false)

    // assert — redo walks forward through both
    redo()
    expect(rows.value).toEqual(afterMove)
    redo()
    expect(rows.value).toEqual(afterDep)
    expect(canRedo.value).toBe(false)
  })
})
