import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import Gantt from '../Gantt.vue'
import GanttSlack from '../GanttSlack.vue'
import { slack } from '../../utils'
import type { GanttRow } from '../../types'
import { mountInRoot } from '../../__tests__/helpers'

// a → b chain with a 3-day gap (a ends Jan-03, b starts Jan-06), plus an
// independent c with no successors. Only `a` carries free-float slack.
const slackRows: GanttRow[] = [
  { id: 'r1', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-03' }] },
  {
    id: 'r2',
    tasks: [{ id: 'b', start: '2026-01-06', end: '2026-01-10', dependencies: ['a'] }],
  },
  { id: 'r3', tasks: [{ id: 'c', start: '2026-01-02', end: '2026-01-04' }] },
]

describe('GanttSlack', () => {
  it('renders one bar per task with positive slack, tagged by id', () => {
    const { wrapper } = mountInRoot(GanttSlack, {
      rootProps: { rows: slackRows, slack: true, unit: 'day', columnWidth: 40 },
    })

    expect(wrapper.find('.gantt-slack').exists()).toBe(true)
    const bars = wrapper.findAll('.gantt-slack__bar')
    // Only `a` has a positive gap → exactly one bar.
    expect(bars).toHaveLength(slack(slackRows).size)
    expect(bars).toHaveLength(1)
    expect(bars[0]!.attributes('data-id')).toBe('a')
  })

  it('positions the slack bar after the task end with a width proportional to the gap', () => {
    const columnWidth = 40 // px per day
    const { wrapper, ctx } = mountInRoot(GanttSlack, {
      rootProps: { rows: slackRows, slack: true, unit: 'day', columnWidth },
    })

    const bar = wrapper.find('.gantt-slack__bar')
    const style = bar.attributes('style') ?? ''

    // left = x of a.end; non-zero (a.end is Jan-03, three days into the axis).
    const aEndX = ctx().dateToX(new Date(2026, 0, 3))
    expect(style).toContain(`left: ${aEndX}px`)
    expect(aEndX).toBeGreaterThan(0)

    // width ∝ slack days (3 days → 3 columns).
    const days = slack(slackRows).get('a')!
    expect(days).toBeCloseTo(3)
    const widthMatch = /width:\s*([\d.]+)px/.exec(style)
    expect(widthMatch).not.toBeNull()
    const width = Number(widthMatch![1])
    expect(width).toBeCloseTo(days * columnWidth)
    expect(width).toBeGreaterThan(0)

    // a vertical band is allocated.
    expect(style).toMatch(/top:\s*[\d.]+px/)
    expect(style).toMatch(/height:\s*[\d.]+px/)
  })

  it('renders no bars when the slack prop is off', () => {
    const off = mountInRoot(GanttSlack, {
      rootProps: { rows: slackRows, slack: false, unit: 'day', columnWidth: 40 },
    })
    expect(off.wrapper.findAll('.gantt-slack__bar')).toHaveLength(0)

    const undef = mountInRoot(GanttSlack, {
      rootProps: { rows: slackRows, unit: 'day', columnWidth: 40 },
    })
    expect(undef.wrapper.findAll('.gantt-slack__bar')).toHaveLength(0)
  })

  it('exposes taskId + slack to the default slot', () => {
    const { wrapper } = mountInRoot(GanttSlack, {
      rootProps: { rows: slackRows, slack: true, unit: 'day', columnWidth: 40 },
      slots: {
        default: (props: { taskId: string; slack: number }) =>
          h('span', { class: 'slot-content', 'data-task': props.taskId }, String(props.slack)),
      },
    })

    const content = wrapper.find('.slot-content')
    expect(content.exists()).toBe(true)
    expect(content.attributes('data-task')).toBe('a')
    expect(Number(content.text())).toBeCloseTo(3)
  })
})

// A long chain a → b vs. a short branch c; the critical path is [a, b].
const criticalRows: GanttRow[] = [
  {
    id: 'r1',
    tasks: [
      { id: 'a', start: '2026-01-01', end: '2026-01-03' },
      { id: 'b', start: '2026-01-03', end: '2026-01-12', dependencies: ['a'] }, // long
      { id: 'c', start: '2026-01-03', end: '2026-01-04', dependencies: ['a'] }, // short branch
    ],
  },
]

describe('critical-path highlight', () => {
  it('marks only critical-path bars with data-critical', () => {
    const wrapper = mount(Gantt, {
      props: { rows: criticalRows, criticalPath: true, unit: 'day', columnWidth: 40 },
    })

    const criticalIds = wrapper
      .findAll('.gantt-bar[data-critical]')
      .map(bar => bar.attributes('data-id'))
      .sort()
    expect(criticalIds).toEqual(['a', 'b'])

    // The short branch is not on the critical path.
    const c = wrapper.find('.gantt-bar[data-id="c"]')
    expect(c.attributes('data-critical')).toBeUndefined()
  })

  it('adds no data-critical without the criticalPath prop', () => {
    const wrapper = mount(Gantt, {
      props: { rows: criticalRows, unit: 'day', columnWidth: 40 },
    })
    expect(wrapper.findAll('.gantt-bar[data-critical]')).toHaveLength(0)
  })

  it('marks a critical-path milestone marker', () => {
    // a → m (milestone) → z forms the only chain, so the milestone is critical.
    const rows: GanttRow[] = [
      {
        id: 'r1',
        tasks: [
          { id: 'a', start: '2026-01-01', end: '2026-01-05' },
          { id: 'm', type: 'milestone', start: '2026-01-05', dependencies: ['a'] },
          { id: 'z', start: '2026-01-05', end: '2026-01-08', dependencies: ['m'] },
        ],
      },
    ]
    const wrapper = mount(Gantt, {
      props: { rows, criticalPath: true, unit: 'day', columnWidth: 40 },
    })
    const marker = wrapper.find('.gantt-milestone__marker[data-critical]')
    expect(marker.exists()).toBe(true)
  })
})
