import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import Gantt from '../Gantt.vue'
import type { GanttRow as GanttRowData } from '../../types'

// jsdom's PointerEvent has read-only clientX/button, so — like the existing drag
// specs (Gantt.spec.ts, GanttMilestone.spec.ts) — dispatch plain events.
function fire(target: EventTarget, type: string, props: Record<string, unknown> = {}): void {
  target.dispatchEvent(Object.assign(new Event(type, { bubbles: true }), props))
}

// A row at the very top (top ≈ 0, under the sticky header) and one further down
// (top ≈ default rowHeight 36px, clear of the clearance) so the flip can be told apart.
const rows: GanttRowData[] = [
  { id: 'top', tasks: [{ id: 'a', name: 'Alpha', start: '2026-01-01', end: '2026-01-05' }] },
  { id: 'bottom', tasks: [{ id: 'b', name: 'Beta', start: '2026-01-01', end: '2026-01-05' }] },
]

describe('floating label flip near the sticky header (task bars)', () => {
  it('adds --below to the drag label for the top row, not for a lower row', async () => {
    const wrapper = mount(Gantt, {
      props: { rows, unit: 'day', columnWidth: 40, draggable: true },
    })
    const bars = wrapper.findAll('.gantt-bar')

    // Top row: drag it and expect the flipped modifier.
    fire(bars[0]!.element, 'pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 })
    fire(window, 'pointermove', { clientX: 60, clientY: 0 })
    await nextTick()
    const topLabel = wrapper.find('.gantt-task[data-id="a"] .gantt-drag-label')
    expect(topLabel.exists()).toBe(true)
    expect(topLabel.classes()).toContain('gantt-drag-label--below')
    fire(window, 'pointerup', {})
    await nextTick()

    // Bottom row: same gesture, no flip.
    fire(bars[1]!.element, 'pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 })
    fire(window, 'pointermove', { clientX: 60, clientY: 0 })
    await nextTick()
    const bottomLabel = wrapper.find('.gantt-task[data-id="b"] .gantt-drag-label')
    expect(bottomLabel.exists()).toBe(true)
    expect(bottomLabel.classes()).not.toContain('gantt-drag-label--below')
    fire(window, 'pointerup', {})
    await nextTick()
  })

  it('adds --below to the hover tooltip for the top row, not for a lower row', async () => {
    const wrapper = mount(Gantt, { props: { rows, unit: 'day', columnWidth: 40, tooltip: true } })
    const bars = wrapper.findAll('.gantt-bar')

    await bars[0]!.trigger('pointerenter')
    await nextTick()
    const topTip = wrapper.find('.gantt-task[data-id="a"] .gantt-tooltip')
    expect(topTip.exists()).toBe(true)
    expect(topTip.classes()).toContain('gantt-tooltip--below')
    await bars[0]!.trigger('pointerleave')
    await nextTick()

    await bars[1]!.trigger('pointerenter')
    await nextTick()
    const bottomTip = wrapper.find('.gantt-task[data-id="b"] .gantt-tooltip')
    expect(bottomTip.exists()).toBe(true)
    expect(bottomTip.classes()).not.toContain('gantt-tooltip--below')
  })
})

describe('floating label flip near the sticky header (milestones)', () => {
  const milestoneRows: GanttRowData[] = [
    { id: 'top', tasks: [{ id: 'm1', name: 'Kickoff', type: 'milestone', start: '2026-01-05' }] },
    { id: 'bottom', tasks: [{ id: 'm2', name: 'Launch', type: 'milestone', start: '2026-01-05' }] },
  ]

  it('adds --below to the drag label for a milestone in the top row, not the bottom row', async () => {
    const wrapper = mount(Gantt, {
      props: { rows: milestoneRows, unit: 'day', columnWidth: 40, draggable: true },
    })
    const markers = wrapper.findAll('.gantt-milestone__marker')

    fire(markers[0]!.element, 'pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 })
    fire(window, 'pointermove', { clientX: 40, clientY: 0 })
    await nextTick()
    const topLabel = wrapper.find('.gantt-milestone[data-id="m1"] .gantt-drag-label')
    expect(topLabel.exists()).toBe(true)
    expect(topLabel.classes()).toContain('gantt-drag-label--below')
    fire(window, 'pointerup', {})
    await nextTick()

    fire(markers[1]!.element, 'pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 })
    fire(window, 'pointermove', { clientX: 40, clientY: 0 })
    await nextTick()
    const bottomLabel = wrapper.find('.gantt-milestone[data-id="m2"] .gantt-drag-label')
    expect(bottomLabel.exists()).toBe(true)
    expect(bottomLabel.classes()).not.toContain('gantt-drag-label--below')
    fire(window, 'pointerup', {})
    await nextTick()
  })

  it('adds --below to the hover tooltip for a milestone in the top row, not the bottom row', async () => {
    const wrapper = mount(Gantt, {
      props: { rows: milestoneRows, unit: 'day', columnWidth: 40, tooltip: true },
    })
    const markers = wrapper.findAll('.gantt-milestone__marker')

    await markers[0]!.trigger('pointerenter')
    await nextTick()
    const topTip = wrapper.find('.gantt-milestone[data-id="m1"] .gantt-tooltip')
    expect(topTip.exists()).toBe(true)
    expect(topTip.classes()).toContain('gantt-tooltip--below')
    await markers[0]!.trigger('pointerleave')
    await nextTick()

    await markers[1]!.trigger('pointerenter')
    await nextTick()
    const bottomTip = wrapper.find('.gantt-milestone[data-id="m2"] .gantt-tooltip')
    expect(bottomTip.exists()).toBe(true)
    expect(bottomTip.classes()).not.toContain('gantt-tooltip--below')
  })
})
