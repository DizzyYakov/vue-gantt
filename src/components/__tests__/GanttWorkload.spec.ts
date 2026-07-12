import { describe, expect, it } from 'vitest'
import GanttWorkload from '../GanttWorkload.vue'
import type { GanttResource, GanttRow } from '../../types'
import { mountInRoot } from '../../__tests__/helpers'

const resources: GanttResource[] = [
  { id: 'u1', name: 'Ada' },
  { id: 'u2', name: 'Bob' },
]

const rows: GanttRow[] = [
  {
    id: 'r1',
    tasks: [
      { id: 'a', start: '2026-01-01', end: '2026-01-10', resourceIds: ['u1'] },
      { id: 'b', start: '2026-01-05', end: '2026-01-15', resourceIds: ['u1'] },
      { id: 'c', start: '2026-01-01', end: '2026-01-04', resourceIds: ['u2'] },
    ],
  },
]

describe('GanttWorkload', () => {
  it('renders one row per resource with tasks, keyed by resourceId, labelled by name', () => {
    const { wrapper } = mountInRoot(GanttWorkload, {
      rootProps: { rows, resources, unit: 'day' },
    })
    const workloadRows = wrapper.findAll('.gantt-workload__row')
    expect(workloadRows).toHaveLength(2)
    expect(workloadRows.map(r => r.attributes('data-id'))).toEqual(['u1', 'u2'])
    expect(workloadRows[0]!.find('.gantt-workload__name').text()).toBe('Ada')
    expect(workloadRows[1]!.find('.gantt-workload__name').text()).toBe('Bob')
  })

  it('renders bars with correct data-count and positive, geometry-consistent left/width', () => {
    const { wrapper, ctx } = mountInRoot(GanttWorkload, {
      rootProps: { rows, resources, unit: 'day' },
    })
    const u1Row = wrapper.findAll('.gantt-workload__row')[0]!
    const bars = u1Row.findAll('.gantt-workload__bar')
    // u1: a(1-10) + b(5-15) overlapping → segments with count 1, 2, 1.
    expect(bars.map(b => b.attributes('data-count'))).toEqual(['1', '2', '1'])

    for (const bar of bars) {
      const left = Number.parseFloat(bar.attributes('style')?.match(/left:\s*([\d.]+)px/)?.[1] ?? '')
      const width = Number.parseFloat(bar.attributes('style')?.match(/width:\s*([\d.]+)px/)?.[1] ?? '')
      expect(left).toBeGreaterThanOrEqual(0)
      expect(width).toBeGreaterThan(0)
    }

    // Geometry matches ctx.dateToX / widthBetween for the first (count=1) segment.
    const workload = ctx().resources.value
    expect(workload.map(r => r.id)).toEqual(['u1', 'u2'])
    const expectedLeft = ctx().dateToX(new Date(2026, 0, 1))
    const expectedWidth = ctx().widthBetween(new Date(2026, 0, 1), new Date(2026, 0, 5))
    const firstBarStyle = bars[0]!.attributes('style') ?? ''
    expect(firstBarStyle).toContain(`left: ${expectedLeft}px`)
    expect(firstBarStyle).toContain(`width: ${expectedWidth}px`)
  })

  it('scales bar height (%) proportionally to count/peak', () => {
    const { wrapper } = mountInRoot(GanttWorkload, {
      rootProps: { rows, resources, unit: 'day' },
    })
    const u1Row = wrapper.findAll('.gantt-workload__row')[0]!
    const bars = u1Row.findAll('.gantt-workload__bar')
    // peak for u1 is 2 → count=1 bars at 50%, count=2 bar at 100%.
    const heights = bars.map(
      b => Number.parseFloat(b.attributes('style')?.match(/height:\s*([\d.]+)%/)?.[1] ?? ''),
    )
    expect(heights).toEqual([50, 100, 50])
  })

  it('renders no rows when there are no resources', () => {
    const { wrapper } = mountInRoot(GanttWorkload, {
      rootProps: { rows, unit: 'day' },
    })
    expect(wrapper.findAll('.gantt-workload__row')).toHaveLength(0)
  })
})
