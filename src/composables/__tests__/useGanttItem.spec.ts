import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import GanttRoot from '../../components/GanttRoot.vue'
import { useGanttItem, type GanttItemProps } from '../useGanttItem'
import { useGanttContext } from '../useGanttContext'
import type { GanttRootProps, ResolvedTask } from '../../types'

/** Mount a harness that runs `useGanttItem` and exposes its return for assertions. */
function run(itemProps: GanttItemProps, rootProps: Partial<GanttRootProps>) {
  let api: ReturnType<typeof useGanttItem> | undefined
  const Harness = defineComponent({
    setup() {
      api = useGanttItem(itemProps)
      return () => null
    },
  })
  mount(GanttRoot, {
    props: rootProps as Record<string, unknown>,
    slots: { default: () => h(Harness) },
  })
  return () => api!
}

const task: ResolvedTask = {
  id: 'a',
  name: 'Alpha',
  start: new Date(2026, 0, 1),
  end: new Date(2026, 0, 5),
  progress: 40,
  dependencies: [],
  type: 'task',
  meta: {},
  rowId: 'r1',
  order: 0,
  lane: 0,
}

describe('useGanttItem (presentational)', () => {
  it('uses the supplied resolved task without registering', () => {
    const api = run({ task }, { rows: [{ id: 'r1', tasks: [] }], unit: 'day', columnWidth: 40 })()
    expect(api.resolved.value.id).toBe('a')
    // Nothing was registered, so the chart's own task list stays empty.
    expect(api.ctx.tasks.value).toHaveLength(0)
  })

  it('computes left/width geometry from the scale', () => {
    const api = run(
      { task },
      { rows: [{ id: 'r1', tasks: [] }], unit: 'day', columnWidth: 40, startDate: '2026-01-01' },
    )()
    expect(api.left.value).toBe(0) // Jan 1 = origin
    expect(api.width.value).toBe(160) // 4 days × 40px
  })

  it('exposes rowStyle from the task band', () => {
    const api = run({ task }, { rows: [{ id: 'r1', tasks: [] }], rowHeight: 36 })()
    expect(api.rowStyle.value.top).toBe('0px')
    expect(api.rowStyle.value.height).toBe('36px')
  })
})

describe('useGanttItem (declarative)', () => {
  it('registers individual fields into the chart and resolves order from the row', async () => {
    // Declarative mode: no `rows` prop, so rows must be registered too (the
    // registry is ignored when a `rows` prop is present).
    let api: ReturnType<typeof useGanttItem> | undefined
    const Harness = defineComponent({
      setup() {
        const ctx = useGanttContext()
        ctx.registerRow({ id: 'r1', tasks: [] })
        ctx.registerRow({ id: 'r2', tasks: [] })
        api = useGanttItem({ id: 'd', start: '2026-01-02', end: '2026-01-04', rowId: 'r2' })
        return () => null
      },
    })
    mount(GanttRoot, { props: { unit: 'day' }, slots: { default: () => h(Harness) } })
    await nextTick()
    expect(api!.ctx.tasks.value.some(t => t.id === 'd')).toBe(true)
    expect(api!.resolved.value.order).toBe(1) // r2 is the second row
    expect(api!.resolved.value.rowId).toBe('r2')
  })

  it('flags overlapping when its row has multiple lanes', async () => {
    const api = run(
      { id: 'a', start: '2026-01-01', end: '2026-01-10', rowId: 'r' },
      {
        rows: [
          {
            id: 'r',
            tasks: [
              { id: 'a', start: '2026-01-01', end: '2026-01-10' },
              { id: 'b', start: '2026-01-05', end: '2026-01-15' },
            ],
          },
        ],
        unit: 'day',
        overlap: 'lanes',
      },
    )()
    await nextTick()
    expect(api.overlapping.value).toBe(true)
  })

  it('is not draggable when neither axis is unlocked', () => {
    const api = run({ task }, { rows: [{ id: 'r1', tasks: [] }] })()
    expect(api.draggable.value).toBe(false)
  })
})
