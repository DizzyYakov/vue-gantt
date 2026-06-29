import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import GanttTimeline from '../GanttTimeline.vue'
import type { GanttRow } from '../../types'
import { mountInRoot } from '../../__tests__/helpers'

const rows: GanttRow[] = [{ id: 'r', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-10' }] }]

describe('GanttTimeline', () => {
  it('renders one row per tier, ordered coarse→fine', () => {
    const { wrapper } = mountInRoot(GanttTimeline, {
      rootProps: { rows, tiers: ['day', 'month', 'week'] },
    })
    const tierRows = wrapper.findAll('.gantt-timeline__row')
    expect(tierRows.map(r => r.attributes('data-tier'))).toEqual(['month', 'week', 'day'])
  })

  it('renders cells with day labels and positions them by the scale', () => {
    const { wrapper } = mountInRoot(GanttTimeline, {
      rootProps: { rows, tiers: ['day'], columnWidth: 40 },
    })
    const cells = wrapper.findAll('.gantt-timeline__cell')
    expect(cells.length).toBeGreaterThan(0)
    expect(cells[0]!.attributes('style')).toContain('left: 0px')
    expect(cells[0]!.attributes('style')).toContain('width: 40px')
    // Default day label is the day-of-month number.
    expect(cells[0]!.find('.gantt-timeline__label').text()).toBe('1')
  })

  it('marks the column containing today', () => {
    const { wrapper } = mountInRoot(GanttTimeline, {
      rootProps: { rows, tiers: ['day'], today: '2026-01-03' },
    })
    const todayCell = wrapper.find('.gantt-timeline__cell[data-today]')
    expect(todayCell.exists()).toBe(true)
    expect(todayCell.find('.gantt-timeline__label').text()).toBe('3')
  })

  it('sets the container width to the content width', () => {
    const { wrapper, ctx } = mountInRoot(GanttTimeline, {
      rootProps: { rows, tiers: ['day'], columnWidth: 40 },
    })
    expect(wrapper.find('.gantt-timeline').attributes('style')).toContain(
      `width: ${ctx().contentWidth.value}px`,
    )
  })

  it('exposes a scoped column slot with column + tier', () => {
    const { wrapper } = mountInRoot(GanttTimeline, {
      rootProps: { rows, tiers: ['day'] },
      slots: {
        column: ({ column, tier }: { column: { label: string }; tier: string }) =>
          h('span', { class: 'custom' }, `${tier}:${column.label}`),
      },
    })
    const custom = wrapper.findAll('.custom')
    expect(custom.length).toBeGreaterThan(0)
    expect(custom[0]!.text()).toBe('day:1')
    expect(wrapper.find('.gantt-timeline__label').exists()).toBe(false)
  })
})
