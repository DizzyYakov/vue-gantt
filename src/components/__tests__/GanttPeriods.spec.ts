import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { describe, expect, it } from 'vitest'
import Gantt from '../Gantt.vue'
import type { GanttPeriod, GanttRow } from '../../types'

const px = (style: string | undefined, prop: 'left' | 'width'): number =>
  Number(new RegExp(`${prop}:\\s*([\\d.]+)px`).exec(style ?? '')?.[1])

const rows: GanttRow[] = [
  { id: 'r1', name: 'Backend', tasks: [{ id: 'a', start: '2026-06-02', end: '2026-06-10' }] },
]

// Two contiguous 1-week periods starting on the axis origin.
const periods: GanttPeriod[] = [
  { id: 'p1', start: '2026-06-01', end: '2026-06-08', label: 'Sprint 1' },
  { id: 'p2', start: '2026-06-08', end: '2026-06-15', label: 'Sprint 2' },
]

describe('GanttPeriods (timeline period bands)', () => {
  it('renders a body band per period with alternating parity', () => {
    const wrapper = mount(Gantt, { props: { rows, periods, unit: 'day', columnWidth: 40 } })
    const bands = wrapper.findAll('.gantt-period-band')
    expect(bands).toHaveLength(2)
    expect(bands[0]!.attributes('data-parity')).toBe('0')
    expect(bands[1]!.attributes('data-parity')).toBe('1')
  })

  it('positions bands by date (40px/day) with the right width', () => {
    const wrapper = mount(Gantt, { props: { rows, periods, unit: 'day', columnWidth: 40 } })
    const first = wrapper.find('.gantt-period-band[data-id="p1"]')
    // Axis starts at 2026-06-01 → x=0; one week × 40px/day = 280px wide.
    expect(first.attributes('style')).toContain('left: 0px')
    expect(first.attributes('style')).toContain('width: 280px')
    const second = wrapper.find('.gantt-period-band[data-id="p2"]')
    expect(second.attributes('style')).toContain('left: 280px')
  })

  it('shows the period labels in the timeline header', () => {
    const wrapper = mount(Gantt, { props: { rows, periods, unit: 'day', columnWidth: 40 } })
    const labels = wrapper.findAll('.gantt-timeline__label--period').map(l => l.text())
    expect(labels).toEqual(['Sprint 1', 'Sprint 2'])
  })

  it('grows the header height by one row when periods are present', () => {
    const withPeriods = mount(Gantt, {
      props: { rows, periods, tiers: ['month', 'week', 'day'], headerRowHeight: 30 },
    })
    const without = mount(Gantt, {
      props: { rows, tiers: ['month', 'week', 'day'], headerRowHeight: 30 },
    })
    const rootStyle = (w: typeof withPeriods) =>
      w.find('.gantt-root').attributes('style') ?? ''
    // 3 tiers → 90px; the period row adds one more headerRowHeight → 120px.
    expect(rootStyle(without)).toContain('--gantt-header-height: 90px')
    expect(rootStyle(withPeriods)).toContain('--gantt-header-height: 120px')
  })

  it('renders no bands and no extra header row without periods', () => {
    const wrapper = mount(Gantt, { props: { rows, unit: 'day', columnWidth: 40 } })
    expect(wrapper.findAll('.gantt-period-band')).toHaveLength(0)
    expect(wrapper.findAll('.gantt-timeline__row--periods')).toHaveLength(0)
  })

  it('extends the auto axis to a period that ends after every task (upper bound)', () => {
    // The lone task ends 2026-06-10; this period sits entirely past it.
    const late: GanttPeriod[] = [
      { id: 'future', start: '2026-06-20', end: '2026-06-27', label: 'Future' },
    ]
    const withPeriod = mount(Gantt, { props: { rows, periods: late, unit: 'day', columnWidth: 40 } })
    const baseline = mount(Gantt, { props: { rows, unit: 'day', columnWidth: 40 } })

    const band = withPeriod.find('.gantt-period-band[data-id="future"]')
    const left = px(band.attributes('style'), 'left')
    const width = px(band.attributes('style'), 'width')
    // One week × 40px/day, offset well past the task extent (> 0).
    expect(width).toBe(280)
    expect(left).toBeGreaterThan(0)

    // The content overlay (its width == contentWidth) grows to include the late
    // band's right edge — proving the axis extended past the last task.
    const contentWidth = px(withPeriod.find('.gantt-periods').attributes('style'), 'width')
    expect(contentWidth).toBeGreaterThanOrEqual(left + width)
    // And it is wider than the task-only axis would be (task ends 2026-06-10).
    const baseWidth = px(baseline.find('.gantt-timeline').attributes('style'), 'width')
    expect(contentWidth).toBeGreaterThan(baseWidth)
  })

  it('forwards the `period` header slot through <Gantt> for custom labels', () => {
    const wrapper = mount(Gantt, {
      props: { rows, periods, unit: 'day', columnWidth: 40 },
      slots: {
        period: ({ period }: { period: unknown }) => {
          const p = period as { id: string; label: string }
          return h('span', { class: 'custom-period' }, `${p.id}:${p.label}`)
        },
      },
    })
    expect(wrapper.findAll('.custom-period').map(n => n.text())).toEqual([
      'p1:Sprint 1',
      'p2:Sprint 2',
    ])
    // The default header label is replaced, not duplicated.
    expect(wrapper.findAll('.gantt-timeline__label--period')).toHaveLength(0)
  })

  it('forwards the `period-bands` body slot through <Gantt>, replacing default bands', () => {
    const wrapper = mount(Gantt, {
      props: { rows, periods, unit: 'day', columnWidth: 40 },
      slots: {
        'period-bands': ({ periods: ps }: { periods: unknown }) =>
          h('div', { class: 'custom-bands' }, `bands:${(ps as unknown[]).length}`),
      },
    })
    expect(wrapper.find('.custom-bands').text()).toBe('bands:2')
    // The override replaces GanttPeriods, so its default body bands are gone.
    expect(wrapper.findAll('.gantt-period-band')).toHaveLength(0)
  })
})
