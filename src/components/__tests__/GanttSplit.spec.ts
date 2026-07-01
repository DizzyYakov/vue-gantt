import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Gantt from '../Gantt.vue'
import type { GanttTask } from '../../types'

// Mount a single task; `unit: 'day'` + `columnWidth: 40` gives 40px/day so the
// 10-day bar is 400px wide (mirrors the GanttProgress.spec harness).
const mountTask = (task: GanttTask) =>
  mount(Gantt, {
    props: {
      rows: [{ id: 'r1', tasks: [task] }],
      unit: 'day',
      columnWidth: 40,
    },
  })

// Read an inline `width`/`left` percentage off an element's style attribute.
const pct = (style: string, prop: 'left' | 'width'): number =>
  parseFloat(new RegExp(`${prop}:\\s*([\\d.]+)%`).exec(style)![1]!)

describe('split tasks', () => {
  it('renders one bar with segments, a split line and cumulative progress', () => {
    // Arrange: a 10-day bar split into three 2-day working segments (6 days work).
    const wrapper = mountTask({
      id: 'a',
      start: '2026-01-01',
      end: '2026-01-11',
      progress: 50,
      segments: [
        { start: '2026-01-01', end: '2026-01-03' },
        { start: '2026-01-05', end: '2026-01-07' },
        { start: '2026-01-09', end: '2026-01-11' },
      ],
    })

    // Assert: still exactly one bar, marked as split.
    const bars = wrapper.findAll('.gantt-bar')
    expect(bars).toHaveLength(1)
    const bar = bars[0]!
    expect(bar.attributes('data-split')).toBe('')

    // A single split line + three segments (the plain progress bar is gone).
    expect(wrapper.findAll('.gantt-bar__split-line')).toHaveLength(1)
    expect(wrapper.find('.gantt-bar__progress').exists()).toBe(false)
    const segments = wrapper.findAll('.gantt-bar__segment')
    expect(segments).toHaveLength(3)

    // First segment geometry: left 0%, width 20% (2 of 10 days).
    const seg1Style = segments[0]!.attributes('style')!
    expect(pct(seg1Style, 'left')).toBeCloseTo(0, 5)
    expect(pct(seg1Style, 'width')).toBeCloseTo(20, 5)

    // Cumulative progress: filledWork = 50% * 6d = 3d → seg1 full, seg2 half, seg3 empty.
    const fills = segments.map(s =>
      pct(s.find('.gantt-bar__segment-progress').attributes('style')!, 'width'),
    )
    expect(fills[0]).toBeCloseTo(100, 5)
    expect(fills[1]).toBeCloseTo(50, 5)
    expect(fills[2]).toBeCloseTo(0, 5)
  })

  it('renders a plain bar (no segments, no data-split) when not split', () => {
    // Arrange: same bar without segments.
    const wrapper = mountTask({ id: 'a', start: '2026-01-01', end: '2026-01-11', progress: 50 })

    // Assert: one bar, no split affordances, the classic progress fill instead.
    const bar = wrapper.find('.gantt-bar')
    expect(bar.attributes('data-split')).toBeUndefined()
    expect(wrapper.findAll('.gantt-bar__segment')).toHaveLength(0)
    expect(wrapper.find('.gantt-bar__split-line').exists()).toBe(false)
    expect(wrapper.find('.gantt-bar__progress').exists()).toBe(true)
  })
})
