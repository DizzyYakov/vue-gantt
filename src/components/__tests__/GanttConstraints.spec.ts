import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Gantt from '../Gantt.vue'
import type { GanttRow } from '../../types'

const mountBar = (task: Record<string, unknown>) =>
  mount(Gantt, {
    props: {
      rows: [{ id: 'r1', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-10', ...task }] }] as GanttRow[],
      unit: 'day',
      columnWidth: 40,
    },
  })

describe('GanttTask deadline / constraint flags', () => {
  it('marks the bar data-overdue when the finish is past the deadline', () => {
    const bar = mountBar({ deadline: '2026-01-05' }).find('.gantt-bar')
    expect(bar.attributes('data-overdue')).toBe('true')
  })

  it('has no data-overdue when the finish is within the deadline', () => {
    const bar = mountBar({ deadline: '2026-01-15' }).find('.gantt-bar')
    expect(bar.attributes('data-overdue')).toBeUndefined()
  })

  it('marks data-constraint-violation for finish-no-later-than breached', () => {
    const bar = mountBar({
      constraint: { type: 'finish-no-later-than', date: '2026-01-05' },
    }).find('.gantt-bar')
    expect(bar.attributes('data-constraint-violation')).toBe('true')
  })

  it('has no violation attribute when the constraint is satisfied', () => {
    const bar = mountBar({
      constraint: { type: 'finish-no-later-than', date: '2026-01-15' },
    }).find('.gantt-bar')
    expect(bar.attributes('data-constraint-violation')).toBeUndefined()
  })

  it('has no deadline / constraint attributes for a plain task', () => {
    const bar = mountBar({}).find('.gantt-bar')
    expect(bar.attributes('data-overdue')).toBeUndefined()
    expect(bar.attributes('data-constraint-violation')).toBeUndefined()
  })
})
