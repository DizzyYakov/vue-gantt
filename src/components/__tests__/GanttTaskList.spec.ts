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
})
