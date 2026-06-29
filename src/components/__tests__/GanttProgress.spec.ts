import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import Gantt from '../Gantt.vue'
import type { GanttDragLabelInfo, GanttProgressEvent } from '../../types'

// jsdom's MouseEvent props are read-only, so dispatch plain events.
function fire(target: EventTarget, type: string, props: Record<string, unknown>): void {
  target.dispatchEvent(Object.assign(new Event(type, { bubbles: true }), props))
}

const mountTask = (props: Record<string, unknown> = {}) =>
  mount(Gantt, {
    props: {
      rows: [
        { id: 'r1', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-11', progress: 0 }] },
      ],
      unit: 'day',
      columnWidth: 40, // bar = 10 days * 40 = 400px wide
      ...props,
    },
  })

describe('progress drag', () => {
  it('renders the progress handle only when progressDraggable', () => {
    expect(mountTask().find('.gantt-bar__progress-handle').exists()).toBe(false)
    expect(
      mountTask({ progressDraggable: true }).find('.gantt-bar__progress-handle').exists(),
    ).toBe(true)
  })

  it('maps the horizontal drag to a percent across the bar', async () => {
    const wrapper = mountTask({ progressDraggable: true })
    const handle = wrapper.find('.gantt-bar__progress-handle').element
    fire(handle, 'pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 })
    fire(window, 'pointermove', { clientX: 200, clientY: 0 }) // +200px of 400 → +50%
    fire(window, 'pointerup', {})
    await nextTick()
    expect((wrapper.emitted('progress')![0]![0] as GanttProgressEvent).progress).toBe(50)
  })
})

describe('drag tooltip formatter (dragLabel)', () => {
  it('overrides the tooltip text for progress and move drags', async () => {
    const dragLabel = (i: GanttDragLabelInfo) =>
      i.mode === 'progress' ? `P${i.progress}` : 'MOVED'
    const wrapper = mountTask({ progressDraggable: true, draggable: true, dragLabel })

    // progress drag — assert mid-gesture (before pointerup clears the tooltip)
    const handle = wrapper.find('.gantt-bar__progress-handle').element
    fire(handle, 'pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 })
    fire(window, 'pointermove', { clientX: 200, clientY: 0 })
    await nextTick()
    expect(wrapper.find('.gantt-drag-label').text()).toBe('P50')
    fire(window, 'pointerup', {})
    await nextTick()

    // move drag
    const bar = wrapper.find('.gantt-bar').element
    fire(bar, 'pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 })
    fire(window, 'pointermove', { clientX: 40, clientY: 0 })
    await nextTick()
    expect(wrapper.find('.gantt-drag-label').text()).toBe('MOVED')
    fire(window, 'pointerup', {})
  })
})
