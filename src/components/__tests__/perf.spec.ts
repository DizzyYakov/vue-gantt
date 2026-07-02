import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import GanttRoot from '../GanttRoot.vue'
import { useGanttContext } from '../../composables/useGanttContext'
import { makeStressRows } from '../../stories/_shared'
import type { GanttContext } from '../../types'

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
