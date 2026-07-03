import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Gantt from '../Gantt.vue'
import type { GanttRow } from '../../types'

const px = (style: string | undefined, prop: 'left' | 'width'): number =>
  Number(new RegExp(`${prop}:\\s*([\\d.]+)px`).exec(style ?? '')?.[1])

const rows: GanttRow[] = [
  { id: 'r1', name: 'Backend', tasks: [{ id: 'a', start: '2026-06-02', end: '2026-06-10' }] },
]

// A fixed two-week axis (2026-06-01 is a Monday) so the derived range doesn't
// depend on the task extent: it covers two weekends —
// Sat 06-06/Sun 06-07 and Sat 06-13/Sun 06-14.
const fixedRange = { startDate: '2026-06-01', endDate: '2026-06-15' }

describe('GanttNonWorking (working calendar shading)', () => {
  it('renders no bands when `nonWorking` is not set', () => {
    const wrapper = mount(Gantt, {
      props: { rows, unit: 'day', columnWidth: 40, ...fixedRange },
    })
    expect(wrapper.findAll('.gantt-nonworking-band')).toHaveLength(0)
  })

  it('shades each weekend as one merged band when `nonWorking` is `true`', () => {
    const wrapper = mount(Gantt, {
      props: { rows, nonWorking: true, unit: 'day', columnWidth: 40, ...fixedRange },
    })
    const bands = wrapper.findAll('.gantt-nonworking-band')
    expect(bands).toHaveLength(2)
  })

  it('positions bands by date (40px/day) with the right width', () => {
    const wrapper = mount(Gantt, {
      props: { rows, nonWorking: true, unit: 'day', columnWidth: 40, ...fixedRange },
    })
    const bands = wrapper.findAll('.gantt-nonworking-band')

    // Axis starts 2026-06-01 → Sat 06-06 is 5 days in: x=200px, 2 days wide=80px.
    const first = bands[0]!.attributes('style')
    expect(px(first, 'left')).toBe(200)
    expect(px(first, 'width')).toBe(80)

    // Sat 06-13 is 12 days in: x=480px, 2 days wide=80px.
    const second = bands[1]!.attributes('style')
    expect(px(second, 'left')).toBe(480)
    expect(px(second, 'width')).toBe(80)
  })

  it('shades only explicit holidays when `weekends` is disabled', () => {
    const wrapper = mount(Gantt, {
      props: {
        rows,
        nonWorking: { weekends: [], holidays: ['2026-06-03'] },
        unit: 'day',
        columnWidth: 40,
        ...fixedRange,
      },
    })
    const bands = wrapper.findAll('.gantt-nonworking-band')
    expect(bands).toHaveLength(1)
    // 2026-06-03 is 2 days after the 06-01 axis start: x=80px, 1 day wide=40px.
    const style = bands[0]!.attributes('style')
    expect(px(style, 'left')).toBe(80)
    expect(px(style, 'width')).toBe(40)
  })
})
