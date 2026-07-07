import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import GanttTaskList from '../GanttTaskList.vue'
import type { GanttRow, ResolvedRow } from '../../types'
import { mountInRoot } from '../../__tests__/helpers'

const rows: GanttRow[] = [
  { id: 'r1', name: 'Backend', tasks: [] },
  { id: 'r2', name: 'Frontend', tasks: [] },
]

describe('GanttTaskList', () => {
  it('renders one row per row with its name', () => {
    const { wrapper } = mountInRoot(GanttTaskList, { rootProps: { rows } })
    const rendered = wrapper.findAll('.gantt-task-list__row')
    expect(rendered).toHaveLength(2)
    expect(rendered.map(r => r.attributes('data-id'))).toEqual(['r1', 'r2'])
    expect(wrapper.text()).toContain('Backend')
    expect(wrapper.text()).toContain('Frontend')
  })

  it('falls back to the row id when no name is given', () => {
    const { wrapper } = mountInRoot(GanttTaskList, {
      rootProps: { rows: [{ id: 'solo', tasks: [] }] },
    })
    expect(wrapper.find('.gantt-task-list__name').text()).toBe('solo')
  })

  it('positions rows by their top/height', () => {
    const { wrapper } = mountInRoot(GanttTaskList, {
      rootProps: { rows, rowHeight: 36 },
    })
    const rendered = wrapper.findAll('.gantt-task-list__row')
    expect(rendered[0]!.attributes('style')).toContain('top: 0px')
    expect(rendered[0]!.attributes('style')).toContain('height: 36px')
    expect(rendered[1]!.attributes('style')).toContain('top: 36px')
  })

  it('exposes a scoped row slot with row + index', () => {
    const { wrapper } = mountInRoot(GanttTaskList, {
      rootProps: { rows },
      slots: {
        row: ({ row, index }: { row: ResolvedRow; index: number }) =>
          h('span', { class: 'custom-row' }, `${index}:${row.name}`),
      },
    })
    const custom = wrapper.findAll('.custom-row')
    expect(custom.map(c => c.text())).toEqual(['0:Backend', '1:Frontend'])
    expect(wrapper.find('.gantt-task-list__name').exists()).toBe(false)
  })

  it('renders #row-suffix after the default #row content without suppressing it', () => {
    const { wrapper } = mountInRoot(GanttTaskList, {
      rootProps: { rows },
      slots: {
        'row-suffix': ({ row }: { row: ResolvedRow }) =>
          h('span', { class: 'row-badge' }, `badge:${row.id}`),
      },
    })
    // The default name render is untouched...
    expect(wrapper.findAll('.gantt-task-list__name').map(n => n.text())).toEqual([
      'Backend',
      'Frontend',
    ])
    // ...and the suffix slot content is appended per row.
    const rendered = wrapper.findAll('.gantt-task-list__row')
    expect(rendered[0]!.find('.row-badge').text()).toBe('badge:r1')
    expect(rendered[1]!.find('.row-badge').text()).toBe('badge:r2')
    // The suffix comes after the name in DOM order.
    const nameIndex = rendered[0]!.html().indexOf('gantt-task-list__name')
    const badgeIndex = rendered[0]!.html().indexOf('row-badge')
    expect(nameIndex).toBeGreaterThan(-1)
    expect(badgeIndex).toBeGreaterThan(nameIndex)
  })

  it('surfaces primitive row.meta entries as data-* attributes on the row', () => {
    const rowsWithMeta: GanttRow[] = [
      {
        id: 'r1',
        name: 'Backend',
        tasks: [],
        meta: { status: 'blocked', priority: 2, urgent: true },
      },
    ]
    const { wrapper } = mountInRoot(GanttTaskList, { rootProps: { rows: rowsWithMeta } })
    const row = wrapper.find('.gantt-task-list__row')
    expect(row.attributes('data-status')).toBe('blocked')
    expect(row.attributes('data-priority')).toBe('2')
    expect(row.attributes('data-urgent')).toBe('true')
  })

  it('never lets meta clobber the reserved data-* attributes', () => {
    const rowsWithMeta: GanttRow[] = [
      {
        id: 'r1',
        name: 'Backend',
        tasks: [],
        meta: { id: 'spoofed', group: 'spoofed', depth: 99, collapsed: true },
      },
    ]
    const { wrapper } = mountInRoot(GanttTaskList, { rootProps: { rows: rowsWithMeta } })
    const row = wrapper.find('.gantt-task-list__row')
    // Reserved attributes keep their real values, not the meta-supplied ones.
    expect(row.attributes('data-id')).toBe('r1')
    expect(row.attributes('data-group')).toBeUndefined()
    expect(row.attributes('data-depth')).toBeUndefined()
    expect(row.attributes('data-collapsed')).toBeUndefined()
  })

  it('ignores non-primitive meta values (objects/arrays) — no data-* is emitted for them', () => {
    const rowsWithMeta: GanttRow[] = [
      {
        id: 'r1',
        name: 'Backend',
        tasks: [],
        meta: { owner: { name: 'Ada' }, tags: ['a', 'b'], nothing: null },
      },
    ]
    const { wrapper } = mountInRoot(GanttTaskList, { rootProps: { rows: rowsWithMeta } })
    const row = wrapper.find('.gantt-task-list__row')
    expect(row.attributes('data-owner')).toBeUndefined()
    expect(row.attributes('data-tags')).toBeUndefined()
    expect(row.attributes('data-nothing')).toBeUndefined()
  })
})
