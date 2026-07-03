import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import GanttView from '../GanttView.vue'
import type { GanttRow, ResolvedRow, ResolvedTask } from '../../types'
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

  it('fills the parent height (height: 100%) when no height is given', () => {
    const { wrapper } = mountInRoot(GanttView, { rootProps: { rows } })
    const style = wrapper.find('.gantt').attributes('style') ?? ''
    expect(style).toContain('height: 100%')
    // No max-height cap is applied in the default (fill) mode.
    expect(style).not.toContain('max-height')
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

  describe('per-variant item slots', () => {
    const variantRows: GanttRow[] = [
      {
        id: 'r1',
        tasks: [
          { id: 'a', start: '2026-01-01', end: '2026-01-05', variant: 'summary' },
          { id: 'b', start: '2026-01-06', end: '2026-01-10' },
          { id: 'm', type: 'milestone', start: '2026-01-08', variant: 'release' },
          { id: 'n', type: 'milestone', start: '2026-01-12' },
        ],
      },
    ]

    it('routes a task to its `task-${variant}` slot, others fall back to `bar`', () => {
      const { wrapper } = mountInRoot(GanttView, {
        rootProps: { rows: variantRows, unit: 'day' },
        slots: {
          'task-summary': ({ task }: { task: ResolvedTask }) =>
            h('span', { class: 'summary-slot' }, task.id),
          bar: ({ task }: { task: ResolvedTask }) => h('span', { class: 'generic-bar' }, task.id),
        },
      })
      // The variant-matched task uses the typed slot…
      expect(wrapper.findAll('.summary-slot').map(n => n.text())).toEqual(['a'])
      // …while the un-tagged task falls back to the generic `bar` slot.
      expect(wrapper.findAll('.generic-bar').map(n => n.text())).toEqual(['b'])
    })

    it('falls back to `bar` when no matching `task-${variant}` slot is provided', () => {
      const { wrapper } = mountInRoot(GanttView, {
        rootProps: { rows: variantRows, unit: 'day' },
        slots: { bar: ({ task }: { task: ResolvedTask }) => h('span', { class: 'generic-bar' }, task.id) },
      })
      // Both tasks (variant + plain) render through the generic slot.
      expect(wrapper.findAll('.generic-bar').map(n => n.text())).toEqual(['a', 'b'])
    })

    it('routes a milestone to its `milestone-${variant}` slot, others keep the default diamond', () => {
      const { wrapper } = mountInRoot(GanttView, {
        rootProps: { rows: variantRows, unit: 'day' },
        slots: {
          'milestone-release': ({ task }: { task: ResolvedTask }) =>
            h('span', { class: 'release-marker' }, task.id),
        },
      })
      expect(wrapper.findAll('.release-marker').map(n => n.text())).toEqual(['m'])
      // The un-tagged milestone still renders the built-in diamond.
      expect(wrapper.findAll('.gantt-milestone__diamond')).toHaveLength(1)
    })

    it('falls back to the built-in default render when a variant has no matching slot and no generic slot either', () => {
      // No `task-*`/`milestone-*`/`bar`/`milestone` slots at all — even the
      // variant-tagged items must still render their default markup.
      const { wrapper } = mountInRoot(GanttView, {
        rootProps: { rows: variantRows, unit: 'day' },
      })
      expect(wrapper.find('.summary-slot').exists()).toBe(false)
      expect(wrapper.find('.release-marker').exists()).toBe(false)
      // All four items still render: two bars (default label markup) and two diamonds.
      expect(wrapper.findAll('.gantt-bar__label').map(n => n.text())).toEqual(['a', 'b'])
      expect(wrapper.findAll('.gantt-milestone__diamond')).toHaveLength(2)
    })
  })
})
