import { addDays } from 'date-fns'
import { effectScope, nextTick, reactive, ref, shallowRef, type EffectScope } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ceilToUnit, floorToUnit } from '../../dateUnits'
import { useGanttTimelineEdges, type TimelineEdgesOptions } from '../useGanttTimelineEdges'
import type { GanttTimelineMode, GanttViewport } from '../../types'

// `useGanttTimelineEdges` calls Vue's `watch`, which needs an active effect
// scope to be torn down cleanly — run it inside an `effectScope`, as documented
// in the composable's own JSDoc contract.

const START = new Date(2026, 0, 1)
const END = new Date(2026, 0, 31)
const SIDEBAR_WIDTH = 0
const PX_PER_DAY = 20
const EDGE_THRESHOLD = 50
const CONTENT_WIDTH = 3000 // wide enough that start/end zones don't overlap

let scope: EffectScope | undefined
afterEach(() => {
  scope?.stop()
  scope = undefined
})

function makeEdges(overrides: Partial<TimelineEdgesOptions> = {}) {
  const viewport = reactive<GanttViewport>({ scrollLeft: 0, scrollTop: 0, width: 0, height: 0 })
  const applyScroll = vi.fn<(left: number | undefined, top: number | undefined, behavior: ScrollBehavior) => void>()
  const onRangeChange = vi.fn<(event: { side: 'start' | 'end'; start: Date; end: Date }) => void>()
  const extendedStart = shallowRef<Date | null>(null)
  const extendedEnd = shallowRef<Date | null>(null)
  const mode = ref<GanttTimelineMode>('fixed')

  const options: TimelineEdgesOptions = {
    viewport,
    sidebarWidth: () => SIDEBAR_WIDTH,
    timelineMode: () => mode.value,
    contentWidth: () => CONTENT_WIDTH,
    pxPerDay: () => PX_PER_DAY,
    widthBetween: (a, b) => ((b.getTime() - a.getTime()) / 86_400_000) * PX_PER_DAY,
    start: () => START,
    end: () => END,
    coarsestUnit: () => 'day',
    applyScroll,
    onRangeChange,
    edgeThreshold: EDGE_THRESHOLD,
    extendedStart,
    extendedEnd,
    ...overrides,
  }

  scope = effectScope()
  scope.run(() => useGanttTimelineEdges(options))

  return {
    viewport,
    applyScroll,
    onRangeChange,
    extendedStart,
    extendedEnd,
    setMode: (next: GanttTimelineMode) => {
      mode.value = next
    },
  }
}

/** Days a "reach edge" step extends by, given the fixture's viewport width. */
function extensionDaysFor(viewportWidth: number): number {
  const innerWidth = Math.max(0, viewportWidth - SIDEBAR_WIDTH)
  return innerWidth / PX_PER_DAY
}

describe('useGanttTimelineEdges', () => {
  it('the first measured frame never counts as reaching an edge', async () => {
    const { viewport, onRangeChange } = makeEdges()
    // scrollLeft is already within the start threshold, but this is the very
    // first change the watcher observes — it must only seed the baseline.
    viewport.width = 800
    await nextTick()

    expect(onRangeChange).not.toHaveBeenCalled()
  })

  it('emits range-change once on entering the start zone, not again while still inside it', async () => {
    const { viewport, onRangeChange } = makeEdges()
    viewport.width = 800
    viewport.scrollLeft = 500 // mid-range, establishes a "not near" baseline
    await nextTick()
    expect(onRangeChange).not.toHaveBeenCalled()

    viewport.scrollLeft = 10 // enters the start zone (<= edgeThreshold)
    await nextTick()
    expect(onRangeChange).toHaveBeenCalledTimes(1)
    expect(onRangeChange).toHaveBeenCalledWith({
      side: 'start',
      start: floorToUnit(addDays(START, -extensionDaysFor(800)), 'day'),
      end: END,
    })

    viewport.scrollLeft = 5 // still inside the zone — must not re-emit
    await nextTick()
    expect(onRangeChange).toHaveBeenCalledTimes(1)
  })

  it('emits range-change once on entering the end zone', async () => {
    const { viewport, onRangeChange } = makeEdges()
    viewport.width = 800
    viewport.scrollLeft = 500
    await nextTick()

    // innerWidth = 800; nearEnd when scrollLeft + 800 >= 3000 - 50 => scrollLeft >= 2150
    viewport.scrollLeft = 2200
    await nextTick()

    expect(onRangeChange).toHaveBeenCalledTimes(1)
    expect(onRangeChange).toHaveBeenCalledWith({
      side: 'end',
      start: START,
      end: ceilToUnit(addDays(END, extensionDaysFor(800)), 'day'),
    })
  })

  it('fixed mode only emits the suggestion — it does not grow extendedStart/extendedEnd', async () => {
    const { viewport, onRangeChange, extendedStart, extendedEnd } = makeEdges()
    viewport.width = 800
    viewport.scrollLeft = 500
    await nextTick()

    viewport.scrollLeft = 10
    await nextTick()

    expect(onRangeChange).toHaveBeenCalledTimes(1)
    expect(extendedStart.value).toBeNull()
    expect(extendedEnd.value).toBeNull()
  })

  it('infinite mode grows extendedStart/extendedEnd on reaching an edge', async () => {
    const { viewport, extendedStart, extendedEnd, setMode } = makeEdges()
    setMode('infinite')
    viewport.width = 800
    viewport.scrollLeft = 500
    await nextTick()

    viewport.scrollLeft = 10
    await nextTick()
    expect(extendedStart.value).toEqual(floorToUnit(addDays(START, -extensionDaysFor(800)), 'day'))
    expect(extendedEnd.value).toBeNull()

    viewport.scrollLeft = 2200
    await nextTick()
    expect(extendedEnd.value).toEqual(ceilToUnit(addDays(END, extensionDaysFor(800)), 'day'))
  })

  it('nudges the scroll position to compensate for a start-edge prepend', async () => {
    const { viewport, applyScroll, setMode } = makeEdges()
    setMode('infinite')
    viewport.width = 800
    viewport.scrollLeft = 500
    await nextTick()

    viewport.scrollLeft = 10
    await nextTick() // flushes the watcher (sets extendedStart, schedules a nextTick callback)
    await nextTick() // flushes the scheduled scroll-compensation callback

    expect(applyScroll).toHaveBeenCalledTimes(1)
    const [left, top, behavior] = applyScroll.mock.calls[0]!
    expect(top).toBeUndefined()
    expect(behavior).toBe('auto')
    expect(left).toBeGreaterThan(viewport.scrollLeft) // shifted right by the prepended width
  })

  it('switching timelineMode to "fixed" discards any prior growth', async () => {
    const { viewport, extendedStart, extendedEnd, setMode } = makeEdges()
    setMode('infinite')
    viewport.width = 800
    viewport.scrollLeft = 500
    await nextTick()
    viewport.scrollLeft = 10
    await nextTick()
    expect(extendedStart.value).not.toBeNull()

    setMode('fixed')
    await nextTick()

    expect(extendedStart.value).toBeNull()
    expect(extendedEnd.value).toBeNull()
  })
})
