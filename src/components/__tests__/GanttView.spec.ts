import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import GanttView from '../GanttView.vue'
import type { GanttRow, ResolvedRow } from '../../types'
import { mountInRoot } from '../../__tests__/helpers'

const rows: GanttRow[] = [
  {
    id: 'r1',
    name: 'Backend',
    tasks: [
      { id: 'a', start: '2026-01-01', end: '2026-01-05' },
      { id: 'm', type: 'milestone', start: '2026-01-08' },
    ],
  },
]

describe('GanttView', () => {
  it('renders the frozen head, sidebar and body scaffolding', () => {
    const { wrapper } = mountInRoot(GanttView, { rootProps: { rows, unit: 'day' } })
    expect(wrapper.find('.gantt').exists()).toBe(true)
    expect(wrapper.find('.gantt__head').exists()).toBe(true)
    expect(wrapper.find('.gantt__sidebar').exists()).toBe(true)
    expect(wrapper.find('.gantt__body').exists()).toBe(true)
    expect(wrapper.find('.gantt__corner').exists()).toBe(true)
  })

  it('renders default timeline, task list, grid, bars and a milestone', () => {
    const { wrapper } = mountInRoot(GanttView, { rootProps: { rows, unit: 'day' } })
    expect(wrapper.find('.gantt-timeline').exists()).toBe(true)
    expect(wrapper.find('.gantt-task-list').exists()).toBe(true)
    expect(wrapper.find('.gantt-grid').exists()).toBe(true)
    expect(wrapper.findAll('.gantt-bar')).toHaveLength(1)
    expect(wrapper.findAll('.gantt-milestone__diamond')).toHaveLength(1)
    expect(wrapper.find('.gantt-dependencies').exists()).toBe(true)
  })

  it('applies a numeric height as a pixel max-height', () => {
    const { wrapper } = mountInRoot(GanttView, {
      rootProps: { rows },
      props: { height: 300 },
    })
    expect(wrapper.find('.gantt').attributes('style')).toContain('max-height: 300px')
  })

  it('passes a string height through verbatim', () => {
    const { wrapper } = mountInRoot(GanttView, {
      rootProps: { rows },
      props: { height: '50vh' },
    })
    expect(wrapper.find('.gantt').attributes('style')).toContain('max-height: 50vh')
  })

  it('renders the conflicts overlay only in conflict mode', () => {
    const { wrapper: off } = mountInRoot(GanttView, { rootProps: { rows, unit: 'day' } })
    expect(off.find('.gantt-conflicts').exists()).toBe(false)

    const conflicting: GanttRow[] = [
      {
        id: 'r',
        tasks: [
          { id: 'a', start: '2026-01-01', end: '2026-01-10' },
          { id: 'b', start: '2026-01-05', end: '2026-01-15' },
        ],
      },
    ]
    const { wrapper: on } = mountInRoot(GanttView, {
      rootProps: { rows: conflicting, overlap: 'conflict', unit: 'day' },
    })
    expect(on.find('.gantt-conflicts').exists()).toBe(true)
  })

  it('forwards the corner and row slots', () => {
    const { wrapper } = mountInRoot(GanttView, {
      rootProps: { rows },
      slots: {
        corner: () => h('span', { class: 'my-corner' }, 'Name'),
        row: ({ row }: { row: ResolvedRow }) => h('span', { class: 'my-row' }, row.name),
      },
    })
    expect(wrapper.find('.my-corner').text()).toBe('Name')
    expect(wrapper.find('.my-row').text()).toBe('Backend')
  })

  it('lets a custom grid slot replace the default grid', () => {
    const { wrapper } = mountInRoot(GanttView, {
      rootProps: { rows },
      slots: { grid: () => h('div', { class: 'my-grid' }) },
    })
    expect(wrapper.find('.my-grid').exists()).toBe(true)
    expect(wrapper.find('.gantt-grid').exists()).toBe(false)
  })
})
