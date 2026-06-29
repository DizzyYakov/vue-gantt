import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import Gantt from '../Gantt.vue'
import type { GanttResizeEvent } from '../../types'

// jsdom's MouseEvent props are read-only, so dispatch plain events.
function fire(target: EventTarget, type: string, props: Record<string, unknown>): void {
  target.dispatchEvent(Object.assign(new Event(type, { bubbles: true }), props))
}

async function dragEdge(handle: Element, dx: number): Promise<void> {
  fire(handle, 'pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 })
  fire(window, 'pointermove', { clientX: dx, clientY: 0 })
  fire(window, 'pointerup', {})
  await nextTick()
}

const mountTask = (start: string, end: string) =>
  mount(Gantt, {
    props: {
      rows: [{ id: 'r1', tasks: [{ id: 'a', start, end }] }],
      unit: 'day',
      columnWidth: 40, // 40px per day
      resizable: true,
    },
  })

describe('edge resize', () => {
  it('renders edge handles only when resizable', () => {
    const off = mount(Gantt, {
      props: { rows: [{ id: 'r1', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-05' }] }] },
    })
    expect(off.find('.gantt-bar__resize').exists()).toBe(false)
    const on = mountTask('2026-01-01', '2026-01-05')
    expect(on.findAll('.gantt-bar__resize')).toHaveLength(2)
  })

  it('resizes the end edge, keeping the start fixed', async () => {
    const wrapper = mountTask('2026-01-01', '2026-01-05')
    await dragEdge(wrapper.find('.gantt-bar__resize--end').element, 80) // +2 days
    const e = wrapper.emitted('resize')![0]![0] as GanttResizeEvent
    expect(e.start.getDate()).toBe(1)
    expect(e.end.getDate()).toBe(7)
  })

  it('flips the sides when an edge is dragged past the other', async () => {
    // start 02 → end 03; grab the end and drag two days left, past the start.
    const wrapper = mountTask('2026-01-02', '2026-01-03')
    await dragEdge(wrapper.find('.gantt-bar__resize--end').element, -80) // end 03 − 2d = 01
    const e = wrapper.emitted('resize')![0]![0] as GanttResizeEvent
    // dates swap: [01, 02]
    expect(e.start.getDate()).toBe(1)
    expect(e.end.getDate()).toBe(2)
  })
})
