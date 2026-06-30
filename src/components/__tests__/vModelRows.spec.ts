import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import GanttRoot from '../GanttRoot.vue'
import GanttRow from '../GanttRow.vue'
import GanttTask from '../GanttTask.vue'
import { mountInRoot } from '../../__tests__/helpers'
import { useGanttContext } from '../../composables/useGanttContext'
import {
  addDependency,
  applyMove,
  autoSchedule,
  findTask,
  removeDependency,
  updateTask,
} from '../../utils'
import type {
  GanttContext,
  GanttMoveEvent,
  GanttProgressEvent,
  GanttResizeEvent,
  GanttRow as GanttRowType,
  ResolvedTask,
} from '../../types'

// A tiny fixture: two rows, two tasks, with b depending on a.
function makeRows(): GanttRowType[] {
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

// A noop child — `mountInRoot` only needs *something* to render; the context is
// captured by its own internal Capture component.
const Noop = defineComponent({ setup: () => () => null })

function taskById(ctx: GanttContext, id: string): ResolvedTask {
  const t = ctx.tasks.value.find(t => t.id === id)
  if (!t) throw new Error(`task ${id} not found in context`)
  return t
}

// Last `update:rows` payload (avoids Array.prototype.at — lib target predates es2022).
function lastModelRows(wrapper: { emitted: (n: string) => unknown[][] | undefined }): unknown {
  const emits = wrapper.emitted('update:rows')
  expect(emits).toBeTruthy()
  return emits![emits!.length - 1]![0]
}

describe('v-model:rows on GanttRoot (prop-driven)', () => {
  it('moveTask: emits update:rows === applyMove(rows, ev) and keeps the legacy move event', () => {
    // arrange
    const rows = makeRows()
    const { wrapper, ctx } = mountInRoot(Noop, { rootProps: { rows, unit: 'day' } })
    const task = taskById(ctx(), 'a')
    const ev: GanttMoveEvent = {
      id: 'a',
      start: new Date('2026-01-03T00:00:00'),
      end: new Date('2026-01-07T00:00:00'),
      fromRowId: 'r1',
      toRowId: 'r2',
      task,
    }

    // act
    ctx().moveTask(ev)

    // assert — new v-model emit
    expect(lastModelRows(wrapper)).toStrictEqual(applyMove(rows, ev))

    // assert — legacy behaviour preserved
    const moveEmits = wrapper.emitted('move')
    expect(moveEmits).toHaveLength(1)
    expect((moveEmits![0]![0] as GanttMoveEvent).id).toBe('a')
  })

  it('resizeTask: emits update:rows === updateTask(rows, id, {start,end}) + legacy resize', () => {
    const rows = makeRows()
    const { wrapper, ctx } = mountInRoot(Noop, { rootProps: { rows, unit: 'day' } })
    const ev: GanttResizeEvent = {
      id: 'a',
      start: new Date('2026-01-02T00:00:00'),
      end: new Date('2026-01-08T00:00:00'),
      task: taskById(ctx(), 'a'),
    }

    ctx().resizeTask(ev)

    expect(lastModelRows(wrapper)).toStrictEqual(
      updateTask(rows, 'a', { start: ev.start, end: ev.end }),
    )
    expect(wrapper.emitted('resize')).toHaveLength(1)
  })

  it('progressTask: emits update:rows === updateTask(rows, id, {progress}) + legacy progress', () => {
    const rows = makeRows()
    const { wrapper, ctx } = mountInRoot(Noop, { rootProps: { rows, unit: 'day' } })
    const ev: GanttProgressEvent = { id: 'a', progress: 42, task: taskById(ctx(), 'a') }

    ctx().progressTask(ev)

    expect(lastModelRows(wrapper)).toStrictEqual(updateTask(rows, 'a', { progress: 42 }))
    expect(wrapper.emitted('progress')).toHaveLength(1)
  })

  it('dependency-create: emits update:rows === addDependency + legacy dependency-create', () => {
    const rows = makeRows()
    const { wrapper, ctx } = mountInRoot(Noop, { rootProps: { rows, unit: 'day' } })

    ctx().dispatch('dependency-create', { from: 'b', to: 'a' })

    expect(lastModelRows(wrapper)).toStrictEqual(addDependency(rows, 'b', 'a'))
    expect(wrapper.emitted('dependency-create')).toHaveLength(1)
  })

  it('dependency-remove: emits update:rows === removeDependency + legacy dependency-remove', () => {
    const rows = makeRows()
    const { wrapper, ctx } = mountInRoot(Noop, { rootProps: { rows, unit: 'day' } })

    ctx().dispatch('dependency-remove', { from: 'a', to: 'b' })

    expect(lastModelRows(wrapper)).toStrictEqual(removeDependency(rows, 'a', 'b'))
    expect(wrapper.emitted('dependency-remove')).toHaveLength(1)
  })

  it('dependency-update: emits update:rows === addDependency(removeDependency(prev), new) + legacy', () => {
    const rows = makeRows()
    const { wrapper, ctx } = mountInRoot(Noop, { rootProps: { rows, unit: 'day' } })
    const payload = { from: 'b', to: 'a', previous: { from: 'a', to: 'b' } }

    ctx().dispatch('dependency-update', payload)

    const expected = addDependency(
      removeDependency(rows, payload.previous.from, payload.previous.to),
      payload.from,
      payload.to,
    )
    expect(lastModelRows(wrapper)).toStrictEqual(expected)
    expect(wrapper.emitted('dependency-update')).toHaveLength(1)
  })

  it('is immutable: the emitted array is not the same reference as the input rows', () => {
    const rows = makeRows()
    const { wrapper, ctx } = mountInRoot(Noop, { rootProps: { rows, unit: 'day' } })

    ctx().moveTask({
      id: 'a',
      start: new Date('2026-01-03T00:00:00'),
      end: new Date('2026-01-07T00:00:00'),
      fromRowId: 'r1',
      toRowId: 'r2',
      task: taskById(ctx(), 'a'),
    })

    const emitted = lastModelRows(wrapper) as GanttRowType[]
    expect(emitted).not.toBe(rows)
  })
})

describe('v-model:rows on GanttRoot (declarative — no rows prop)', () => {
  // Capture the context from inside a declarative GanttRoot tree.
  const Harness = defineComponent({
    components: { GanttRoot, GanttRow, GanttTask },
    setup(_, { expose }) {
      let captured: GanttContext | undefined
      const Capture = defineComponent({
        setup() {
          captured = useGanttContext()
          return () => null
        },
      })
      expose({ ctx: () => captured! })
      return () =>
        h(GanttRoot, { unit: 'day' }, () => [
          h(Capture),
          h(GanttRow, { id: 'r1' }, () => [
            h(GanttTask, { id: 'a', start: '2026-01-01', end: '2026-01-05' }),
          ]),
          h(GanttRow, { id: 'r2' }, () => [
            h(GanttTask, { id: 'b', start: '2026-01-06', end: '2026-01-10' }),
          ]),
        ])
    },
  })

  it('does NOT emit update:rows but still emits the legacy events', async () => {
    const wrapper = mount(Harness)
    await nextTick()
    const root = wrapper.findComponent(GanttRoot)
    const ctx = (wrapper.vm as unknown as { ctx: () => GanttContext }).ctx()

    ctx.moveTask({
      id: 'a',
      start: new Date('2026-01-03T00:00:00'),
      end: new Date('2026-01-07T00:00:00'),
      fromRowId: 'r1',
      toRowId: 'r2',
      task: taskById(ctx, 'a'),
    })
    ctx.dispatch('dependency-create', { from: 'a', to: 'b' })

    // no v-model emit without a rows prop
    expect(root.emitted('update:rows')).toBeUndefined()
    // legacy events still fire
    expect(root.emitted('move')).toHaveLength(1)
    expect(root.emitted('dependency-create')).toHaveLength(1)
  })
})

describe('v-model:rows + autoSchedule (prop-driven)', () => {
  // Read a task's resolved start/end (Date) out of a rows array.
  function rangeOf(rows: GanttRowType[], id: string): { start: unknown; end: unknown } {
    const found = findTask(rows, id)
    if (!found) throw new Error(`task ${id} not found`)
    return { start: found.task.start, end: found.task.end }
  }

  it('move: cascades the successor forward when autoSchedule is on', () => {
    // arrange — move `a` so a.end (Jan 9) overruns b.start (Jan 6)
    const rows = makeRows()
    const { wrapper, ctx } = mountInRoot(Noop, {
      rootProps: { rows, unit: 'day', autoSchedule: true },
    })
    const ev: GanttMoveEvent = {
      id: 'a',
      start: new Date('2026-01-05T00:00:00'),
      end: new Date('2026-01-09T00:00:00'),
      fromRowId: 'r1',
      toRowId: 'r1',
      task: taskById(ctx(), 'a'),
    }

    // act
    ctx().moveTask(ev)

    // assert — emit equals the cascaded result
    const emitted = lastModelRows(wrapper) as GanttRowType[]
    expect(emitted).toStrictEqual(autoSchedule(applyMove(rows, ev), ev.id))

    // assert — b really shifted: start === new a.end, 4-day duration preserved
    expect(rangeOf(emitted, 'b').start).toEqual(new Date(2026, 0, 9))
    expect(rangeOf(emitted, 'b').end).toEqual(new Date(2026, 0, 13))

    // assert — legacy move event still fires
    expect(wrapper.emitted('move')).toHaveLength(1)
  })

  it('move: does NOT cascade when autoSchedule is off (default)', () => {
    const rows = makeRows()
    const { wrapper, ctx } = mountInRoot(Noop, { rootProps: { rows, unit: 'day' } })
    const ev: GanttMoveEvent = {
      id: 'a',
      start: new Date('2026-01-05T00:00:00'),
      end: new Date('2026-01-09T00:00:00'),
      fromRowId: 'r1',
      toRowId: 'r1',
      task: taskById(ctx(), 'a'),
    }

    ctx().moveTask(ev)

    const emitted = lastModelRows(wrapper) as GanttRowType[]
    expect(emitted).toStrictEqual(applyMove(rows, ev))
    // b untouched — still its original range
    expect(rangeOf(emitted, 'b').start).toBe('2026-01-06')
    expect(rangeOf(emitted, 'b').end).toBe('2026-01-10')
  })

  it('resize: cascades the successor forward when autoSchedule is on', () => {
    const rows = makeRows()
    const { wrapper, ctx } = mountInRoot(Noop, {
      rootProps: { rows, unit: 'day', autoSchedule: true },
    })
    const ev: GanttResizeEvent = {
      id: 'a',
      start: new Date('2026-01-01T00:00:00'),
      end: new Date('2026-01-08T00:00:00'),
      task: taskById(ctx(), 'a'),
    }

    ctx().resizeTask(ev)

    const emitted = lastModelRows(wrapper) as GanttRowType[]
    expect(emitted).toStrictEqual(
      autoSchedule(updateTask(rows, 'a', { start: ev.start, end: ev.end }), ev.id),
    )
    // b shifted to a.end (Jan 8), 4-day duration preserved
    expect(rangeOf(emitted, 'b').start).toEqual(new Date(2026, 0, 8))
    expect(rangeOf(emitted, 'b').end).toEqual(new Date(2026, 0, 12))
    expect(wrapper.emitted('resize')).toHaveLength(1)
  })

  it('resize: does NOT cascade when autoSchedule is off (default)', () => {
    const rows = makeRows()
    const { wrapper, ctx } = mountInRoot(Noop, { rootProps: { rows, unit: 'day' } })
    const ev: GanttResizeEvent = {
      id: 'a',
      start: new Date('2026-01-01T00:00:00'),
      end: new Date('2026-01-08T00:00:00'),
      task: taskById(ctx(), 'a'),
    }

    ctx().resizeTask(ev)

    const emitted = lastModelRows(wrapper) as GanttRowType[]
    expect(emitted).toStrictEqual(updateTask(rows, 'a', { start: ev.start, end: ev.end }))
    expect(rangeOf(emitted, 'b').start).toBe('2026-01-06')
    expect(rangeOf(emitted, 'b').end).toBe('2026-01-10')
  })

  it('dependency-create: cascades the new successor when autoSchedule is on', () => {
    // arrange — `c` starts before `a` ends and has no dependency yet; adding
    // a→c should push `c` forward to a.end.
    const rows: GanttRowType[] = [
      { id: 'r1', name: 'R1', tasks: [{ id: 'a', name: 'A', start: '2026-01-01', end: '2026-01-05' }] },
      { id: 'r2', name: 'R2', tasks: [{ id: 'c', name: 'C', start: '2026-01-02', end: '2026-01-04' }] },
    ]
    const { wrapper, ctx } = mountInRoot(Noop, {
      rootProps: { rows, unit: 'day', autoSchedule: true },
    })

    ctx().dispatch('dependency-create', { from: 'a', to: 'c' })

    const emitted = lastModelRows(wrapper) as GanttRowType[]
    expect(emitted).toStrictEqual(autoSchedule(addDependency(rows, 'a', 'c'), 'a'))
    // c shifted to a.end (Jan 5), 2-day duration preserved
    expect(rangeOf(emitted, 'c').start).toEqual(new Date(2026, 0, 5))
    expect(rangeOf(emitted, 'c').end).toEqual(new Date(2026, 0, 7))
    expect(wrapper.emitted('dependency-create')).toHaveLength(1)
  })

  it('dependency-remove: never cascades, even when autoSchedule is on', () => {
    const rows = makeRows()
    const { wrapper, ctx } = mountInRoot(Noop, {
      rootProps: { rows, unit: 'day', autoSchedule: true },
    })

    ctx().dispatch('dependency-remove', { from: 'a', to: 'b' })

    const emitted = lastModelRows(wrapper)
    expect(emitted).toStrictEqual(removeDependency(rows, 'a', 'b'))
  })
})

describe('autoSchedule (declarative — no rows prop)', () => {
  const Harness = defineComponent({
    components: { GanttRoot, GanttRow, GanttTask },
    setup(_, { expose }) {
      let captured: GanttContext | undefined
      const Capture = defineComponent({
        setup() {
          captured = useGanttContext()
          return () => null
        },
      })
      expose({ ctx: () => captured! })
      return () =>
        h(GanttRoot, { unit: 'day', autoSchedule: true }, () => [
          h(Capture),
          h(GanttRow, { id: 'r1' }, () => [
            h(GanttTask, { id: 'a', start: '2026-01-01', end: '2026-01-05' }),
          ]),
          h(GanttRow, { id: 'r2' }, () => [
            h(GanttTask, { id: 'b', start: '2026-01-02', end: '2026-01-04' }),
          ]),
        ])
    },
  })

  it('does NOT emit update:rows even with autoSchedule enabled', async () => {
    const wrapper = mount(Harness)
    await nextTick()
    const root = wrapper.findComponent(GanttRoot)
    const ctx = (wrapper.vm as unknown as { ctx: () => GanttContext }).ctx()

    ctx.moveTask({
      id: 'a',
      start: new Date('2026-01-05T00:00:00'),
      end: new Date('2026-01-09T00:00:00'),
      fromRowId: 'r1',
      toRowId: 'r1',
      task: taskById(ctx, 'a'),
    })
    ctx.dispatch('dependency-create', { from: 'a', to: 'b' })

    // no v-model emit without a rows prop, regardless of autoSchedule
    expect(root.emitted('update:rows')).toBeUndefined()
    // legacy events still fire
    expect(root.emitted('move')).toHaveLength(1)
    expect(root.emitted('dependency-create')).toHaveLength(1)
  })
})
