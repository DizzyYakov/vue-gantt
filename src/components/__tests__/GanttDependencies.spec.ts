import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import GanttDependencies from '../GanttDependencies.vue'
import type { GanttRow } from '../../types'
import { mountInRoot } from '../../__tests__/helpers'

const rows: GanttRow[] = [
  {
    id: 'r1',
    tasks: [
      { id: 'a', start: '2026-01-01', end: '2026-01-05' },
      { id: 'b', start: '2026-01-06', end: '2026-01-10', dependencies: ['a'] },
    ],
  },
]

describe('GanttDependencies', () => {
  it('draws a finish-to-start arrow per dependency link', () => {
    const { wrapper } = mountInRoot(GanttDependencies, { rootProps: { rows, unit: 'day' } })
    const dep = wrapper.findAll('.gantt-dependency')
    expect(dep).toHaveLength(1)
    expect(dep[0]!.attributes('data-from')).toBe('a')
    expect(dep[0]!.attributes('data-to')).toBe('b')
    expect(dep[0]!.attributes('d')).toMatch(/^M /)
    expect(dep[0]!.attributes('marker-end')).toMatch(/^url\(#gantt-arrow-/)
  })

  it('ignores dependencies that reference an unknown task', () => {
    const { wrapper } = mountInRoot(GanttDependencies, {
      rootProps: {
        rows: [{ id: 'r', tasks: [{ id: 'x', start: '2026-01-01', end: '2026-01-03', dependencies: ['ghost'] }] }],
        unit: 'day',
      },
    })
    expect(wrapper.findAll('.gantt-dependency')).toHaveLength(0)
  })

  it('renders no arrows when there are no dependencies', () => {
    const { wrapper } = mountInRoot(GanttDependencies, {
      rootProps: {
        rows: [{ id: 'r', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-03' }] }],
        unit: 'day',
      },
    })
    expect(wrapper.findAll('.gantt-dependency')).toHaveLength(0)
  })

  it('routes a backward link with a mid-height jog (more segments)', () => {
    // b precedes a in time but depends on it → tight/backward gap path.
    const { wrapper } = mountInRoot(GanttDependencies, {
      rootProps: {
        rows: [
          {
            id: 'r',
            tasks: [
              { id: 'a', start: '2026-01-10', end: '2026-01-15' },
              { id: 'b', start: '2026-01-01', end: '2026-01-05', dependencies: ['a'] },
            ],
          },
        ],
        unit: 'day',
      },
    })
    const d = wrapper.find('.gantt-dependency').attributes('d')!
    // The jog path has 4 V/H direction changes vs the simple elbow's fewer.
    expect(d.split(/[VH]/).length).toBeGreaterThan(3)
  })

  it('sizes the svg to the content box', () => {
    const { wrapper, ctx } = mountInRoot(GanttDependencies, { rootProps: { rows, unit: 'day' } })
    const svg = wrapper.find('svg.gantt-dependencies')
    expect(svg.attributes('width')).toBe(String(ctx().contentWidth.value))
    expect(svg.attributes('height')).toBe(String(ctx().contentHeight.value))
  })

  it('exposes a scoped slot carrying the computed links', () => {
    const { wrapper } = mountInRoot(GanttDependencies, {
      rootProps: { rows, unit: 'day' },
      slots: {
        default: ({ links }: { links: { key: string }[] }) =>
          h('text', { class: 'count' }, String(links.length)),
      },
    })
    expect(wrapper.find('.count').text()).toBe('1')
  })
})
