import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import GanttRoot from '../GanttRoot.vue'
import { useGanttContext } from '../../composables/useGanttContext'
import type { GanttContext, GanttRangeChangeEvent, GanttRow } from '../../types'

// A wide range (~60 days at 40px = ~2400px) so the content overflows a 400px
// viewport and both edges can be reached independently.
const rows: GanttRow[] = [{ id: 'r1', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-03-01' }] }]

function mountRoot(props: Record<string, unknown> = {}) {
  let captured!: GanttContext
  const Harness = {
    setup() {
      captured = useGanttContext()
      return () => h('div')
    },
  }
  const wrapper = mount(GanttRoot, {
    props: { rows, unit: 'day', columnWidth: 40, sidebarWidth: 200, ...props },
    slots: { default: () => h(Harness) },
  })
  return { wrapper, ctx: () => captured }
}

// The first measured frame only seeds the edge state — it must not fire.
async function seedMiddle(ctx: GanttContext): Promise<void> {
  ctx.setViewport({ scrollLeft: 800, scrollTop: 0, width: 400, height: 300 })
  await nextTick()
}

function lastRangeChange(wrapper: ReturnType<typeof mountRoot>['wrapper']): GanttRangeChangeEvent {
  const events = wrapper.emitted('range-change')!
  return events[events.length - 1]![0] as GanttRangeChangeEvent
}

describe('timeline range — edge detection', () => {
  it('does not fire on the first (seeding) measured frame', async () => {
    const { wrapper, ctx } = mountRoot({ timelineMode: 'infinite' })
    await seedMiddle(ctx())
    expect(wrapper.emitted('range-change')).toBeUndefined()
  })

  it('infinite: reaching the right edge extends `end` and emits range-change', async () => {
    const { wrapper, ctx } = mountRoot({ timelineMode: 'infinite' })
    const c = ctx()
    await seedMiddle(c)
    const endBefore = c.config.value.end.getTime()

    c.setViewport({ scrollLeft: 100_000 }) // far past the right edge
    await nextTick()

    expect(lastRangeChange(wrapper).side).toBe('end')
    expect(c.config.value.end.getTime()).toBeGreaterThan(endBefore)
  })

  it('fixed: reaching an edge emits range-change but does NOT change the range', async () => {
    const { wrapper, ctx } = mountRoot({ timelineMode: 'fixed' })
    const c = ctx()
    await seedMiddle(c)
    const endBefore = c.config.value.end.getTime()

    c.setViewport({ scrollLeft: 100_000 })
    await nextTick()

    expect(lastRangeChange(wrapper).side).toBe('end')
    expect(c.config.value.end.getTime()).toBe(endBefore)
  })

  it('infinite: reaching the left edge extends `start` and anchors the scroll', async () => {
    const { wrapper, ctx } = mountRoot({ timelineMode: 'infinite' })
    const c = ctx()
    // Register a fake scroller so the anchor correction has a target.
    const scrollTo = vi.fn<(options?: ScrollToOptions) => void>()
    c.setScroller({ scrollTo, scrollLeft: 0, clientWidth: 400 } as unknown as HTMLElement)
    await seedMiddle(c)
    const startBefore = c.config.value.start.getTime()

    c.setViewport({ scrollLeft: 0 }) // hard against the left edge
    await nextTick() // watcher fires reachStartEdge
    await nextTick() // nextTick anchor correction runs

    expect(lastRangeChange(wrapper).side).toBe('start')
    expect(c.config.value.start.getTime()).toBeLessThan(startBefore)
    // Prepended dates → scroll nudged right by the added width to stay anchored.
    expect(scrollTo).toHaveBeenCalled()
    const [firstCall] = scrollTo.mock.calls
    expect((firstCall![0] as ScrollToOptions).left).toBeGreaterThan(0)
  })

  it('fires once per entry into an edge zone (no repeat while parked there)', async () => {
    const { wrapper, ctx } = mountRoot({ timelineMode: 'fixed' })
    const c = ctx()
    await seedMiddle(c)

    c.setViewport({ scrollLeft: 100_000 })
    await nextTick()
    c.setViewport({ scrollLeft: 100_050 }) // still parked at the right edge
    await nextTick()

    expect(wrapper.emitted('range-change')).toHaveLength(1)
  })

  it('defaults to `fixed`: omitting the prop leaves the range unchanged at an edge', async () => {
    // No `timelineMode` passed at all — verifies the default matches explicit `fixed`
    // (backward compatibility with pre-feature behaviour).
    const { wrapper, ctx } = mountRoot()
    const c = ctx()
    expect(c.config.value.timelineMode).toBe('fixed')
    await seedMiddle(c)
    const endBefore = c.config.value.end.getTime()
    const startBefore = c.config.value.start.getTime()

    c.setViewport({ scrollLeft: 100_000 })
    await nextTick()

    expect(wrapper.emitted('range-change')).toHaveLength(1)
    expect(c.config.value.end.getTime()).toBe(endBefore)
    expect(c.config.value.start.getTime()).toBe(startBefore)
  })

  it('switching from `infinite` back to `fixed` discards the extended range', async () => {
    const { wrapper, ctx } = mountRoot({ timelineMode: 'infinite' })
    const c = ctx()
    await seedMiddle(c)
    const derivedEnd = c.config.value.end.getTime()

    // Grow the range past an edge.
    c.setViewport({ scrollLeft: 100_000 })
    await nextTick()
    expect(c.config.value.end.getTime()).toBeGreaterThan(derivedEnd)

    // Switching back to `fixed` should discard the extension.
    await wrapper.setProps({ timelineMode: 'fixed' })
    expect(c.config.value.end.getTime()).toBe(derivedEnd)
  })
})
