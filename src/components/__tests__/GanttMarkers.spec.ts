import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { describe, expect, it } from 'vitest'
import Gantt from '../Gantt.vue'
import type { GanttMarker, GanttRow } from '../../types'

const px = (style: string | undefined, prop: 'left' | 'height'): number =>
  Number(new RegExp(`${prop}:\\s*([\\d.]+)px`).exec(style ?? '')?.[1])

const rows: GanttRow[] = [
  { id: 'r1', name: 'Backend', tasks: [{ id: 'a', start: '2026-06-02', end: '2026-06-10' }] },
]

const markers: GanttMarker[] = [
  { id: 'm1', date: '2026-06-03', label: 'Release 1' },
  { id: 'm2', date: '2026-06-08' },
]

// A fixed axis start so marker offsets don't depend on the task extent.
const fixedRange = { startDate: '2026-06-01' }

describe('GanttMarkers (reference lines)', () => {
  it('renders one line per marker, matching data-id', () => {
    const wrapper = mount(Gantt, { props: { rows, markers, unit: 'day', columnWidth: 40 } })
    const lines = wrapper.findAll('.gantt-marker')
    expect(lines).toHaveLength(2)
    expect(lines.map(l => l.attributes('data-id'))).toEqual(['m1', 'm2'])
  })

  it('shows the label when set, and omits it when absent', () => {
    const wrapper = mount(Gantt, { props: { rows, markers, unit: 'day', columnWidth: 40 } })
    const withLabel = wrapper.find('.gantt-marker[data-id="m1"]')
    expect(withLabel.find('.gantt-marker__label').text()).toBe('Release 1')

    const withoutLabel = wrapper.find('.gantt-marker[data-id="m2"]')
    expect(withoutLabel.find('.gantt-marker__label').exists()).toBe(false)
  })

  it('positions lines by date (40px/day): earlier date → smaller left offset', () => {
    const wrapper = mount(Gantt, {
      props: { rows, markers, unit: 'day', columnWidth: 40, ...fixedRange },
    })
    // Axis starts 2026-06-01 → m1 (06-03) is 2 days in: x=80px; m2 (06-08) is 7 days in: x=280px.
    const first = wrapper.find('.gantt-marker[data-id="m1"]')
    const second = wrapper.find('.gantt-marker[data-id="m2"]')
    const firstLeft = px(first.attributes('style'), 'left')
    const secondLeft = px(second.attributes('style'), 'left')
    expect(firstLeft).toBe(80)
    expect(secondLeft).toBe(280)
    expect(firstLeft).toBeLessThan(secondLeft)
  })

  it('spans the full content height', () => {
    const wrapper = mount(Gantt, { props: { rows, markers, unit: 'day', columnWidth: 40 } })
    const line = wrapper.find('.gantt-marker[data-id="m1"]')
    const contentHeight = px(wrapper.find('.gantt-timeline').attributes('style'), 'height')
    expect(px(line.attributes('style'), 'height')).toBeGreaterThan(0)
    // Line height tracks contentHeight, not the (typically much smaller) header.
    expect(px(line.attributes('style'), 'height')).not.toBe(contentHeight)
  })

  it('renders no lines when `markers` is not set, without throwing', () => {
    expect(() => {
      const wrapper = mount(Gantt, { props: { rows, unit: 'day', columnWidth: 40 } })
      expect(wrapper.findAll('.gantt-marker')).toHaveLength(0)
      expect(wrapper.find('.gantt-markers').exists()).toBe(true)
    }).not.toThrow()
  })

  it('renders no lines for an empty `markers` array, without throwing', () => {
    const wrapper = mount(Gantt, { props: { rows, markers: [], unit: 'day', columnWidth: 40 } })
    expect(wrapper.findAll('.gantt-marker')).toHaveLength(0)
  })

  it('forwards the `marker` slot through <Gantt> for custom per-marker content', () => {
    const wrapper = mount(Gantt, {
      props: { rows, markers, unit: 'day', columnWidth: 40 },
      slots: {
        marker: ({ marker }: { marker: unknown }) => {
          const m = marker as { id: string; label: string }
          return h('span', { class: 'custom-marker' }, `${m.id}:${m.label}`)
        },
      },
    })
    expect(wrapper.findAll('.custom-marker').map(n => n.text())).toEqual(['m1:Release 1', 'm2:'])
    // The default label is replaced, not duplicated.
    expect(wrapper.findAll('.gantt-marker__label')).toHaveLength(0)
  })

  it('forwards the `marker-lines` slot through <Gantt>, replacing the default overlay', () => {
    const wrapper = mount(Gantt, {
      props: { rows, markers, unit: 'day', columnWidth: 40 },
      slots: {
        'marker-lines': ({ markers: ms }: { markers: unknown }) =>
          h('div', { class: 'custom-markers' }, `markers:${(ms as unknown[]).length}`),
      },
    })
    expect(wrapper.find('.custom-markers').text()).toBe('markers:2')
    // The override replaces GanttMarkers, so its default lines are gone.
    expect(wrapper.findAll('.gantt-marker')).toHaveLength(0)
  })
})
