import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import GanttDependencies from '../GanttDependencies.vue'
import GanttRoot from '../GanttRoot.vue'
import { useGanttContext } from '../../composables/useGanttContext'
import { makeStressRows } from '../../stories/_shared'
import type { GanttContext, GanttRow } from '../../types'

/** Mount GanttRoot with the stress dataset and expose its context. */
function setup(rowCount: number) {
  let ctx: GanttContext | undefined
  const Harness = defineComponent({
    setup() {
      ctx = useGanttContext()
      return () => h('div')
    },
  })
  const wrapper = mount(GanttRoot, {
    props: { rows: makeStressRows(rowCount), unit: 'day', columnWidth: 40 },
    slots: { default: () => h(Harness) },
  })
  return { wrapper, ctx: () => ctx! }
}

describe('virtualization guardrail (10k tasks)', () => {
  it('windows tasks/rows to the measured viewport instead of rendering all', async () => {
    const { ctx } = setup(2000) // 2000 rows × 5 = 10 000 tasks

    // Sanity: the full model really holds 10k tasks.
    expect(ctx().tasks.value.length).toBe(10_000)

    // Unmeasured (jsdom offsets are 0) → nothing is virtualized, everything renders.
    expect(ctx().visibleTasks.value.length).toBe(10_000)

    // Report a real viewport → the visible window must be a tiny fraction of the model.
    ctx().setViewport({ width: 800, height: 400, scrollLeft: 0, scrollTop: 0 })
    await nextTick()

    expect(ctx().visibleRows.value.length).toBeLessThan(100)
    expect(ctx().visibleTasks.value.length).toBeLessThan(500)
    // And it stays anchored to the window, not the whole model.
    expect(ctx().visibleTasks.value.length).toBeLessThan(ctx().tasks.value.length)
  })

  it('re-windows on scroll (a later scrollTop shows different rows)', async () => {
    const { ctx } = setup(2000)
    ctx().setViewport({ width: 800, height: 400, scrollLeft: 0, scrollTop: 0 })
    await nextTick()
    const topOrders = ctx().visibleRows.value.map(r => r.order)

    ctx().setViewport({ scrollTop: 20_000 })
    await nextTick()
    const laterOrders = ctx().visibleRows.value.map(r => r.order)

    // Different band of rows, still bounded.
    expect(laterOrders.length).toBeLessThan(100)
    expect(laterOrders[0]).toBeGreaterThan(topOrders[0]!)
  })
})

/** Mount GanttRoot + GanttDependencies over an explicit rows dataset; expose the context. */
function mountDeps(rows: GanttRow[]) {
  let ctx: GanttContext | undefined
  const Harness = defineComponent({
    setup() {
      ctx = useGanttContext()
      return () => h(GanttDependencies)
    },
  })
  const wrapper = mount(GanttRoot, {
    props: { rows, unit: 'day', columnWidth: 40 },
    slots: { default: () => h(Harness) },
  })
  return { wrapper, ctx: () => ctx! }
}

/** Mount GanttRoot + GanttDependencies over a deps dataset; expose the context. */
function setupDeps(rowCount: number) {
  return mountDeps(makeStressRows(rowCount, { deps: true }))
}

describe('dependency virtualization guardrail', () => {
  it('renders every link when the viewport is unmeasured', () => {
    // 5 rows × 5 tasks, each task (k>0) depends on the previous one → 5×4 = 20 links.
    const { wrapper } = setupDeps(5)
    expect(wrapper.findAll('.gantt-dependency')).toHaveLength(20)
  })

  it('culls links to the visible row window', async () => {
    // 200 rows × 4 intra-row deps = 800 links total.
    const { wrapper, ctx } = setupDeps(200)
    const total = wrapper.findAll('.gantt-dependency').length
    expect(total).toBe(800)

    ctx().setViewport({ width: 800, height: 400, scrollLeft: 0, scrollTop: 0 })
    await nextTick()

    const drawn = wrapper.findAll('.gantt-dependency').length
    expect(drawn).toBeGreaterThan(0)
    expect(drawn).toBeLessThan(total / 4) // only links whose rows are on screen
  })

  it('keeps a link that straddles the window (both endpoints off-screen)', async () => {
    // 100 single-task rows; the last row's task depends on the first row's task →
    // exactly one cross-row link whose row interval [0, 99] spans the whole chart.
    const DAY = 86_400_000
    const BASE = new Date(2026, 0, 1).getTime()
    const rows: GanttRow[] = Array.from({ length: 100 }, (_, r) => ({
      id: `row-${r}`,
      name: `Row ${r + 1}`,
      tasks: [
        {
          id: `t-${r}`,
          name: `Task ${r + 1}`,
          start: new Date(BASE + r * DAY),
          end: new Date(BASE + (r + 2) * DAY),
          ...(r === 99 ? { dependencies: ['t-0'] } : {}),
        },
      ],
    }))
    const { wrapper, ctx } = mountDeps(rows)
    // Unmeasured: the single straddling link renders.
    expect(wrapper.findAll('.gantt-dependency')).toHaveLength(1)

    // Scroll to a mid-chart window (rowHeight 36 → ~1600px is around row ~44).
    ctx().setViewport({ width: 800, height: 400, scrollLeft: 0, scrollTop: 1600 })
    await nextTick()

    // Both endpoints (rows 0 and 99) are outside the visible band...
    const orders = ctx().visibleRows.value.map(r => r.order)
    expect(orders).not.toContain(0)
    expect(orders).not.toContain(99)
    // ...yet the link's row-span covers the window, so it must stay drawn.
    expect(wrapper.findAll('.gantt-dependency')).toHaveLength(1)
  })
})
