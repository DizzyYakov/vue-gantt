import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import GanttDeadlines from '../GanttDeadlines.vue'
import type { GanttRow } from '../../types'
import { mountInRoot } from '../../__tests__/helpers'

const rows: GanttRow[] = [
  {
    id: 'r1',
    tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-05', deadline: '2026-01-10' }],
  },
  { id: 'r2', tasks: [{ id: 'b', start: '2026-01-02', end: '2026-01-06' }] },
]

function styleOf(el: { attributes: (a: string) => string | undefined }): string {
  return el.attributes('style') ?? ''
}

describe('GanttDeadlines', () => {
  it('renders exactly one marker per task with a deadline, keyed by task id', () => {
    const { wrapper } = mountInRoot(GanttDeadlines, {
      rootProps: { rows, unit: 'day', columnWidth: 40 },
    })
    const lines = wrapper.findAll('.gantt-deadline')
    expect(lines).toHaveLength(1)
    expect(lines[0]!.attributes('data-id')).toBe('a')
  })

  it('positions the marker at dateToX(deadline) with a top and height', () => {
    const { wrapper, ctx } = mountInRoot(GanttDeadlines, {
      rootProps: { rows, unit: 'day', columnWidth: 40, rowHeight: 36 },
    })
    const line = wrapper.find('.gantt-deadline')
    const expectedX = ctx().dateToX(new Date(2026, 0, 10))
    expect(expectedX).toBeGreaterThan(0)

    const style = styleOf(line)
    expect(style).toContain(`left: ${expectedX}px`)
    expect(style).toMatch(/top:\s*[\d.]+px/)
    expect(style).toMatch(/height:\s*[\d.]+px/)
  })

  it('renders no markers when no task has a deadline', () => {
    const { wrapper } = mountInRoot(GanttDeadlines, {
      rootProps: {
        rows: [{ id: 'r', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-05' }] }],
        unit: 'day',
      },
    })
    expect(wrapper.findAll('.gantt-deadline')).toHaveLength(0)
  })

  it('exposes a scoped slot with taskId and deadline', () => {
    const { wrapper } = mountInRoot(GanttDeadlines, {
      rootProps: { rows, unit: 'day', columnWidth: 40 },
      slots: {
        default: ({ taskId }: { taskId: string; deadline: Date }) =>
          h('span', { class: 'flag' }, taskId),
      },
    })
    expect(wrapper.find('.flag').text()).toBe('a')
  })
})
