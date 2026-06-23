import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import Gantt from '../Gantt.vue'
import type { GanttRowData } from '../../index'

const rows: GanttRowData[] = [
  { id: 'r1', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-05' }] },
  { id: 'r2', tasks: [{ id: 'b', start: '2026-01-20', end: '2026-01-25' }] },
]

function mountWithSpy() {
  const wrapper = mount(Gantt, {
    props: { rows, unit: 'day', columnWidth: 40, height: 200, today: '2026-01-10' },
    attachTo: document.body,
  })
  const el = wrapper.find('.gantt').element as HTMLElement
  const spy = vi.fn<(options?: ScrollToOptions) => void>()
  el.scrollTo = spy as unknown as typeof el.scrollTo
  return { wrapper, spy }
}

describe('imperative scroll API (exposed on Gantt)', () => {
  it('scrollToToday scrolls horizontally', () => {
    const { wrapper, spy } = mountWithSpy()
    ;(wrapper.vm as unknown as { scrollToToday: () => void }).scrollToToday()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(typeof spy.mock.calls[0]![0]!.left).toBe('number')
  })

  it('scrollToTask scrolls to the task row and start', () => {
    const { wrapper, spy } = mountWithSpy()
    ;(wrapper.vm as unknown as { scrollToTask: (id: string) => void }).scrollToTask('b')
    expect(spy).toHaveBeenCalledTimes(1)
    const arg = spy.mock.calls[0]![0]!
    expect(typeof arg.left).toBe('number')
    expect(typeof arg.top).toBe('number')
  })

  it('does nothing for an unknown task', () => {
    const { wrapper, spy } = mountWithSpy()
    ;(wrapper.vm as unknown as { scrollToTask: (id: string) => void }).scrollToTask('nope')
    expect(spy).not.toHaveBeenCalled()
  })
})
