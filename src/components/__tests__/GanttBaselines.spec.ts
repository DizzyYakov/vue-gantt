import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import GanttBaselines from '../GanttBaselines.vue'
import type { GanttRow, GanttTask } from '../../types'
import { mountInRoot } from '../../__tests__/helpers'

const withBaseline: GanttTask = {
  // Actual start precedes the baseline so the auto-derived axis origin sits at
  // 2026-01-02, keeping dateToX(baselineStart) a positive offset.
  id: 'a',
  start: '2026-01-02',
  end: '2026-01-20',
  baselineStart: '2026-01-05',
  baselineEnd: '2026-01-12',
}

const rows: GanttRow[] = [{ id: 'r1', tasks: [withBaseline] }]

function styleValue(style: string, prop: string): number {
  return parseFloat(style.match(new RegExp(`${prop}:\\s*([\\d.-]+)px`))![1]!)
}

describe('GanttBaselines', () => {
  it('renders one positioned baseline for a task with both endpoints', () => {
    const { wrapper, ctx } = mountInRoot(GanttBaselines, {
      rootProps: { rows, unit: 'day', columnWidth: 40, rowHeight: 36 },
    })

    const baselines = wrapper.findAll('.gantt-baseline[data-id]')
    expect(baselines).toHaveLength(1)

    const el = baselines[0]!
    expect(el.attributes('data-id')).toBe('a')

    // Geometry mirrors the shared context helpers.
    const expectedLeft = ctx().dateToX(new Date(2026, 0, 5))
    const expectedWidth = ctx().widthBetween(new Date(2026, 0, 5), new Date(2026, 0, 12))
    expect(expectedLeft).toBeGreaterThan(0)
    expect(expectedWidth).toBeGreaterThan(0)

    const style = el.attributes('style')!
    expect(styleValue(style, 'left')).toBeCloseTo(expectedLeft, 5)
    expect(styleValue(style, 'width')).toBeCloseTo(expectedWidth, 5)
    expect(style).toMatch(/top:\s*[\d.-]+px/)
    expect(style).toMatch(/height:\s*[\d.-]+px/)

    // The inner bar element is present.
    expect(el.find('.gantt-baseline__bar').exists()).toBe(true)
  })

  it('renders nothing for a task without a baseline', () => {
    const { wrapper } = mountInRoot(GanttBaselines, {
      rootProps: {
        rows: [{ id: 'r1', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-10' }] }],
        unit: 'day',
      },
    })
    expect(wrapper.findAll('.gantt-baseline[data-id]')).toHaveLength(0)
  })

  it('renders nothing when only baselineStart is set', () => {
    const { wrapper } = mountInRoot(GanttBaselines, {
      rootProps: {
        rows: [
          {
            id: 'r1',
            tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-10', baselineStart: '2026-01-02' }],
          },
        ],
        unit: 'day',
      },
    })
    expect(wrapper.findAll('.gantt-baseline[data-id]')).toHaveLength(0)
  })

  it('exposes the task via the default slot', () => {
    const { wrapper } = mountInRoot(GanttBaselines, {
      rootProps: { rows, unit: 'day', columnWidth: 40 },
      slots: {
        default: ({ task }: { task: { id: string } }) =>
          h('span', { class: 'plan', 'data-task': task.id }, task.id),
      },
    })
    const slot = wrapper.find('.plan')
    expect(slot.exists()).toBe(true)
    expect(slot.attributes('data-task')).toBe('a')
    expect(slot.text()).toBe('a')
  })
})
