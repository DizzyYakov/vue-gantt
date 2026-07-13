import { describe, expect, it } from 'vitest'
import GanttGrid from '../GanttGrid.vue'
import type { GanttRow } from '../../types'
import { mountInRoot } from '../../__tests__/helpers'

const rows: GanttRow[] = [
  { id: 'r1', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-05' }] },
  { id: 'r2', tasks: [{ id: 'b', start: '2026-01-03', end: '2026-01-08' }] },
]

describe('GanttGrid', () => {
  it('renders one horizontal line per row', () => {
    const { wrapper } = mountInRoot(GanttGrid, { rootProps: { rows, unit: 'day' } })
    expect(wrapper.findAll('.gantt-grid__row')).toHaveLength(2)
  })

  it('positions row lines at each row top/height', () => {
    const { wrapper } = mountInRoot(GanttGrid, { rootProps: { rows, unit: 'day', rowHeight: 30 } })
    const lines = wrapper.findAll('.gantt-grid__row')
    expect(lines[0]!.attributes('style')).toContain('top: 0px')
    expect(lines[0]!.attributes('style')).toContain('height: 30px')
    expect(lines[1]!.attributes('style')).toContain('top: 30px')
  })

  it('renders vertical columns for the base unit', () => {
    const { wrapper } = mountInRoot(GanttGrid, {
      rootProps: { rows, unit: 'day', columnWidth: 40 },
    })
    const cols = wrapper.findAll('.gantt-grid__col')
    expect(cols.length).toBeGreaterThan(0)
    expect(cols[0]!.attributes('style')).toContain('left: 0px')
    expect(cols[0]!.attributes('style')).toContain('width: 40px')
  })

  it('follows the tier prop for column density', () => {
    const { wrapper: dayGrid } = mountInRoot(GanttGrid, {
      rootProps: { rows, tiers: ['month', 'day'] },
      props: { tier: 'day' },
    })
    const { wrapper: monthGrid } = mountInRoot(GanttGrid, {
      rootProps: { rows, tiers: ['month', 'day'] },
      props: { tier: 'month' },
    })
    expect(dayGrid.findAll('.gantt-grid__col').length).toBeGreaterThan(
      monthGrid.findAll('.gantt-grid__col').length,
    )
  })

  it('flags the column containing today', () => {
    const { wrapper } = mountInRoot(GanttGrid, {
      rootProps: { rows, unit: 'day', today: '2026-01-03' },
    })
    expect(wrapper.find('.gantt-grid__col[data-today]').exists()).toBe(true)
  })
})

describe('GanttGrid ("drag to create" hint, cellCreatable)', () => {
  const hintRows: GanttRow[] = [
    { id: 'empty', tasks: [] },
    { id: 'withTask', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-05' }] },
    { id: 'parent', tasks: [] },
    { id: 'child', parentId: 'parent', tasks: [] },
  ]

  it('renders the hint only in empty leaf rows, with the default text', () => {
    const { wrapper } = mountInRoot(GanttGrid, {
      rootProps: { rows: hintRows, unit: 'day', cellCreatable: true },
    })
    const hints = wrapper.findAll('.gantt-grid__create-hint')
    // "empty" and "child" are leaf rows with no tasks; "withTask" has a task,
    // and "parent" has children (its own `tasks` is empty but it isn't a leaf).
    expect(hints).toHaveLength(2)
    expect(wrapper.find('.gantt-grid__create-hint-label').text()).toBe('Drag to create')
  })

  it('does not render the hint at all when cellCreatable is off', () => {
    const { wrapper } = mountInRoot(GanttGrid, {
      rootProps: { rows: hintRows, unit: 'day', cellCreatable: false },
    })
    expect(wrapper.find('.gantt-grid__create-hint').exists()).toBe(false)
  })

  it('lets the create-hint slot override the default content', () => {
    const { wrapper } = mountInRoot(GanttGrid, {
      rootProps: { rows: [{ id: 'empty', tasks: [] }], unit: 'day', cellCreatable: true },
      slots: {
        'create-hint': ({ row }: { row: { id: string } }) => `custom:${row.id}`,
      },
    })
    const hint = wrapper.find('.gantt-grid__create-hint')
    expect(hint.text()).toBe('custom:empty')
    expect(hint.find('.gantt-grid__create-hint-label').exists()).toBe(false)
  })
})
