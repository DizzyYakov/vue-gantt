import { describe, expect, it } from 'vitest'
import GanttConflicts from '../GanttConflicts.vue'
import type { GanttRow } from '../../types'
import { mountInRoot } from '../../__tests__/helpers'

const overlapRows: GanttRow[] = [
  {
    id: 'r1',
    tasks: [
      { id: 'a', start: '2026-01-01', end: '2026-01-10' },
      { id: 'b', start: '2026-01-05', end: '2026-01-15' },
    ],
  },
  { id: 'r2', tasks: [{ id: 'c', start: '2026-01-02', end: '2026-01-04' }] },
]

describe('GanttConflicts', () => {
  it('renders a hatched rect + outline over the overlapping span', () => {
    const { wrapper } = mountInRoot(GanttConflicts, {
      rootProps: { rows: overlapRows, overlap: 'conflict', unit: 'day' },
    })
    expect(wrapper.find('.gantt-conflicts').exists()).toBe(true)
    const outlines = wrapper.findAll('.gantt-conflicts__outline')
    expect(outlines.length).toBeGreaterThan(0)
  })

  it('positions the conflict rect at its row band', () => {
    const { wrapper, ctx } = mountInRoot(GanttConflicts, {
      rootProps: {
        rows: overlapRows,
        overlap: 'conflict',
        unit: 'day',
        columnWidth: 40,
        rowHeight: 30,
      },
    })
    const conflict = ctx().conflicts.value[0]!
    const rect = wrapper.find('.gantt-conflicts__outline')
    expect(rect.attributes('x')).toBe(String(conflict.x))
    expect(rect.attributes('width')).toBe(String(conflict.width))
  })

  it('renders nothing when no tasks overlap', () => {
    const { wrapper } = mountInRoot(GanttConflicts, {
      rootProps: {
        rows: [{ id: 'r', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-03' }] }],
        overlap: 'conflict',
        unit: 'day',
      },
    })
    expect(wrapper.findAll('.gantt-conflicts__outline')).toHaveLength(0)
  })

  it('produces no conflict spans outside conflict mode', () => {
    const { ctx } = mountInRoot(GanttConflicts, {
      rootProps: { rows: overlapRows, overlap: 'lanes', unit: 'day' },
    })
    expect(ctx().conflicts.value).toHaveLength(0)
  })
})
