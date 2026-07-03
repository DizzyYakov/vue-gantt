import { flushPromises, mount } from '@vue/test-utils'
import { de } from 'date-fns/locale'
import { describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'
import Gantt from '../Gantt.vue'
import type { GanttRow as GanttRowData } from '../../types'

// A task (needs `start` + `end`) and a milestone (needs `type: 'milestone'`).
const rows: GanttRowData[] = [
  {
    id: 'r1',
    name: 'Backend',
    tasks: [{ id: 'a', name: 'Alpha', start: '2026-01-01', end: '2026-01-05', progress: 50 }],
  },
  {
    id: 'r2',
    name: 'Frontend',
    tasks: [{ id: 'm', name: 'Mark', type: 'milestone', start: '2026-01-10' }],
  },
]

describe('hover tooltip (opt-in)', () => {
  it('shows the bar tooltip with name + progress on hover, hides on leave', async () => {
    // arrange
    const wrapper = mount(Gantt, { props: { rows, tooltip: true } })
    const bar = wrapper.find('.gantt-bar')

    // assert: not visible before hovering
    expect(wrapper.find('.gantt-tooltip').exists()).toBe(false)

    // act: hover the bar
    await bar.trigger('pointerenter')
    await nextTick()

    // assert: tooltip appears with the task's name and progress %
    const tip = wrapper.find('.gantt-task .gantt-tooltip')
    expect(tip.exists()).toBe(true)
    expect(tip.text()).toContain('Alpha')
    expect(tip.text()).toContain('50%')

    // act + assert: leaving hides it
    await bar.trigger('pointerleave')
    await nextTick()
    expect(wrapper.find('.gantt-tooltip').exists()).toBe(false)
  })

  it('shows a milestone tooltip with the milestone name on hover', async () => {
    // arrange
    const wrapper = mount(Gantt, { props: { rows, tooltip: true } })
    const marker = wrapper.find('.gantt-milestone__marker')

    // act
    await marker.trigger('pointerenter')
    await nextTick()

    // assert
    const tip = wrapper.find('.gantt-milestone .gantt-tooltip')
    expect(tip.exists()).toBe(true)
    expect(tip.text()).toContain('Mark')
  })

  it('touch has no hover: a tap toggles the bar tooltip, a tap outside closes it', async () => {
    // attachTo so the anchor element is connected (outside-tap uses `contains`).
    const wrapper = mount(Gantt, { props: { rows, tooltip: true }, attachTo: document.body })
    const bar = wrapper.find('.gantt-bar')

    // A touch pointerenter must NOT show it (hover is mouse-only).
    await bar.trigger('pointerenter', { pointerType: 'touch' })
    await nextTick()
    expect(wrapper.find('.gantt-tooltip').exists()).toBe(false)

    // A tap (touch pointerup, no drag) toggles it on.
    await bar.trigger('pointerup', { pointerType: 'touch' })
    await flushPromises()
    expect(wrapper.find('.gantt-task .gantt-tooltip').exists()).toBe(true)

    // A tap elsewhere dismisses it.
    document.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await nextTick()
    expect(wrapper.find('.gantt-tooltip').exists()).toBe(false)

    wrapper.unmount()
  })

  it('localizes the tooltip date via the `locale` prop', async () => {
    // Jan 2026 in German → "Jan." (date-fns `d MMM yyyy`).
    const wrapper = mount(Gantt, { props: { rows, tooltip: true, locale: de } })
    await wrapper.find('.gantt-bar').trigger('pointerenter')
    await nextTick()
    const text = wrapper.find('.gantt-task .gantt-tooltip').text()
    expect(text).toContain('Jan.') // German abbreviation carries a trailing dot
  })

  it('the `tooltip` slot overrides content AND enables the tooltip without the prop', async () => {
    // arrange: no `tooltip` prop — only the slot should switch it on.
    const wrapper = mount(Gantt, {
      props: { rows },
      slots: {
        tooltip: (p: { task: unknown }) =>
          h('span', { class: 's-tip' }, `custom:${(p.task as { name: string }).name}`),
      },
    })

    // act
    await wrapper.find('.gantt-bar').trigger('pointerenter')
    await nextTick()

    // assert: custom content rendered, default content replaced
    const tip = wrapper.find('.gantt-task .gantt-tooltip')
    expect(tip.exists()).toBe(true)
    expect(tip.find('.s-tip').text()).toBe('custom:Alpha')
    expect(tip.find('.gantt-tooltip__name').exists()).toBe(false)
  })

  it('does not render a tooltip on hover without the prop or a slot', async () => {
    // arrange
    const wrapper = mount(Gantt, { props: { rows } })

    // act
    await wrapper.find('.gantt-bar').trigger('pointerenter')
    await nextTick()

    // assert
    expect(wrapper.find('.gantt-tooltip').exists()).toBe(false)
  })

  it('hides the hover tooltip while the bar is being dragged', async () => {
    // arrange: hovered bar with the tooltip showing.
    const wrapper = mount(Gantt, {
      props: {
        rows: [
          { id: 'r1', tasks: [{ id: 'a', name: 'Alpha', start: '2026-01-01', end: '2026-01-05' }] },
        ],
        unit: 'day',
        columnWidth: 40,
        draggable: true,
        tooltip: true,
      },
    })
    const bar = wrapper.find('.gantt-bar')
    await bar.trigger('pointerenter')
    await nextTick()
    expect(wrapper.find('.gantt-task .gantt-tooltip').exists()).toBe(true)

    // act: start a drag (press + move without releasing).
    // jsdom's MouseEvent has read-only clientX/button, so dispatch plain events.
    const fire = (target: EventTarget, type: string, props: Record<string, unknown>): void => {
      target.dispatchEvent(Object.assign(new Event(type, { bubbles: true }), props))
    }
    fire(bar.element, 'pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 })
    fire(window, 'pointermove', { clientX: 60, clientY: 0 })
    await nextTick()

    // assert: hover tooltip is suppressed during the drag.
    expect(wrapper.find('.gantt-task .gantt-tooltip').exists()).toBe(false)

    // cleanup: release to detach window listeners.
    fire(window, 'pointerup', {})
    await nextTick()
  })
})
