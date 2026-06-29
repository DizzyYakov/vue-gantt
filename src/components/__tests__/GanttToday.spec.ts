import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import GanttToday from '../GanttToday.vue'
import type { GanttRow } from '../../types'
import { mountInRoot } from '../../__tests__/helpers'

const rows: GanttRow[] = [{ id: 'r', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-10' }] }]

function leftPx(wrapper: {
  find: (s: string) => { attributes: (a: string) => string | undefined }
}): number {
  const style = wrapper.find('.gantt-today').attributes('style')!
  return parseFloat(style.match(/left:\s*([\d.]+)px/)![1]!)
}

describe('GanttToday', () => {
  afterEach(() => vi.useRealTimers())

  it('positions the line at the current time and ticks every interval', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 2, 0, 0, 0))

    const { wrapper } = mountInRoot(GanttToday, {
      rootProps: { rows, unit: 'day', columnWidth: 48 },
    })
    await nextTick()
    expect(leftPx(wrapper)).toBeCloseTo(48, 5) // 1 day in

    vi.setSystemTime(new Date(2026, 0, 2, 12, 0, 0))
    vi.advanceTimersByTime(1000)
    await nextTick()
    expect(leftPx(wrapper)).toBeCloseTo(72, 1) // +12h
  })

  it('honours a custom interval', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 2, 0, 0, 0))

    const { wrapper } = mountInRoot(GanttToday, {
      rootProps: { rows, unit: 'day', columnWidth: 48 },
      props: { interval: 5000 },
    })
    await nextTick()

    // Before the custom interval elapses, the position is unchanged.
    vi.setSystemTime(new Date(2026, 0, 2, 12, 0, 0))
    vi.advanceTimersByTime(1000)
    await nextTick()
    expect(leftPx(wrapper)).toBeCloseTo(48, 5)

    vi.advanceTimersByTime(4000)
    await nextTick()
    expect(leftPx(wrapper)).toBeCloseTo(72, 1)
  })

  it('hides the line when the current time is outside the range', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2030, 0, 1)) // well past the axis

    const { wrapper } = mountInRoot(GanttToday, {
      rootProps: { rows, unit: 'day' },
    })
    await nextTick()
    expect(wrapper.find('.gantt-today').exists()).toBe(false)
  })

  it('exposes a scoped slot with x and date', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 2, 0, 0, 0))

    const { wrapper } = mountInRoot(GanttToday, {
      rootProps: { rows, unit: 'day', columnWidth: 48 },
      slots: {
        default: ({ date }: { x: number; date: Date }) =>
          h('span', { class: 'now' }, String(date.getDate())),
      },
    })
    await nextTick()
    expect(wrapper.find('.now').text()).toBe('2')
  })

  it('stops ticking after unmount', async () => {
    vi.useFakeTimers()
    const clearSpy = vi.spyOn(globalThis, 'clearInterval')
    const { wrapper } = mountInRoot(GanttToday, { rootProps: { rows, unit: 'day' } })
    wrapper.unmount()
    expect(clearSpy).toHaveBeenCalled()
  })
})
