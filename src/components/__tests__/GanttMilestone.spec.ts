import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'
import GanttRoot from '../GanttRoot.vue'
import GanttRow from '../GanttRow.vue'
import GanttMilestone from '../GanttMilestone.vue'
import type { ResolvedTask } from '../../types'
import { mountInRoot } from '../../__tests__/helpers'

// jsdom's MouseEvent has read-only clientX/button, so dispatch plain events.
function fire(target: EventTarget, type: string, props: Record<string, unknown>): void {
  target.dispatchEvent(Object.assign(new Event(type, { bubbles: true }), props))
}

describe('GanttMilestone (presentational)', () => {
  function makeTask(): ResolvedTask {
    return {
      id: 'm',
      name: 'Launch',
      start: new Date(2026, 0, 5),
      end: new Date(2026, 0, 5),
      progress: 0,
      dependencies: [],
      resourceIds: [],
      type: 'milestone',
      meta: {},
      rowId: 'r',
      order: 0,
      lane: 0,
    }
  }

  it('renders a diamond positioned on the milestone date', () => {
    const { wrapper, ctx } = mountInRoot(GanttMilestone, {
      rootProps: { rows: [{ id: 'r', tasks: [] }], unit: 'day', columnWidth: 40 },
      props: { task: makeTask() },
    })
    expect(wrapper.find('.gantt-milestone__diamond').exists()).toBe(true)
    const marker = wrapper.find('.gantt-milestone__marker')
    expect(marker.attributes('style')).toContain(`left: ${ctx().dateToX(makeTask().start)}px`)
    expect(wrapper.find('.gantt-milestone').attributes('data-id')).toBe('m')
  })

  it('reflects the overlap mode via data-overlap', () => {
    const { wrapper } = mountInRoot(GanttMilestone, {
      rootProps: { rows: [{ id: 'r', tasks: [] }], overlap: 'cascade' },
      props: { task: makeTask() },
    })
    expect(wrapper.find('.gantt-milestone').attributes('data-overlap')).toBe('cascade')
  })

  it('is not draggable unless enabled', () => {
    const { wrapper } = mountInRoot(GanttMilestone, {
      rootProps: { rows: [{ id: 'r', tasks: [] }] },
      props: { task: makeTask() },
    })
    expect(wrapper.find('.gantt-milestone__marker').attributes('data-draggable')).toBeUndefined()
  })

  it('exposes a default slot carrying the resolved task', () => {
    const { wrapper } = mountInRoot(GanttMilestone, {
      rootProps: { rows: [{ id: 'r', tasks: [] }] },
      props: { task: makeTask() },
      slots: {
        default: ({ task }: { task: ResolvedTask }) => h('span', { class: 'flag' }, task.name),
      },
    })
    expect(wrapper.find('.flag').text()).toBe('Launch')
    expect(wrapper.find('.gantt-milestone__diamond').exists()).toBe(false)
  })

  it('shows a ghost + date-only label while dragging when draggable', async () => {
    const { wrapper } = mountInRoot(GanttMilestone, {
      rootProps: {
        rows: [{ id: 'r', tasks: [] }],
        unit: 'day',
        columnWidth: 40,
        draggable: true,
      },
      props: { task: makeTask() },
    })
    fire(wrapper.find('.gantt-milestone__marker').element, 'pointerdown', {
      button: 0,
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    })
    fire(window, 'pointermove', { clientX: 80, clientY: 0 })
    await nextTick()

    expect(wrapper.find('.gantt-milestone__marker--ghost').exists()).toBe(true)
    // A milestone's label is the single resulting date (no `→` range).
    expect(wrapper.find('.gantt-drag-label').text()).not.toContain('→')

    fire(window, 'pointerup', {})
    await nextTick()
    expect(wrapper.find('.gantt-milestone__marker--ghost').exists()).toBe(false)
  })
})

describe('GanttMilestone (labelMaxWidth slot prop)', () => {
  function makeMilestone(id: string, start: Date, order = 0, rowId = 'r'): ResolvedTask {
    return {
      id,
      name: id,
      start,
      end: start,
      progress: 0,
      dependencies: [],
      resourceIds: [],
      type: 'milestone',
      meta: {},
      rowId,
      order,
      lane: 0,
    }
  }

  function probeValue(wrapper: ReturnType<typeof mountInRoot>['wrapper']): number {
    return Number(wrapper.find('.probe').text())
  }

  it('is the gap to the next milestone on the same row, minus the 8px gutter', () => {
    const m1Start = new Date(2026, 0, 5)
    const m2Start = new Date(2026, 0, 10)
    const { wrapper, ctx } = mountInRoot(GanttMilestone, {
      rootProps: {
        rows: [
          {
            id: 'r',
            tasks: [
              { id: 'm1', start: '2026-01-05', type: 'milestone' },
              { id: 'm2', start: '2026-01-10', type: 'milestone' },
            ],
          },
        ],
        unit: 'day',
        columnWidth: 40,
      },
      props: { task: makeMilestone('m1', m1Start) },
      slots: {
        default: ({ labelMaxWidth }: { labelMaxWidth: number }) =>
          h('span', { class: 'probe' }, String(labelMaxWidth)),
      },
    })

    const expected = ctx().dateToX(m2Start) - ctx().dateToX(m1Start) - 8
    expect(expected).toBeGreaterThan(0)
    expect(probeValue(wrapper)).toBe(expected)
  })

  it('falls back to the remaining content width when it is the last item on its row', () => {
    const m1Start = new Date(2026, 0, 5)
    const { wrapper, ctx } = mountInRoot(GanttMilestone, {
      rootProps: {
        rows: [{ id: 'r', tasks: [{ id: 'm1', start: '2026-01-05', type: 'milestone' }] }],
        unit: 'day',
        columnWidth: 40,
      },
      props: { task: makeMilestone('m1', m1Start) },
      slots: {
        default: ({ labelMaxWidth }: { labelMaxWidth: number }) =>
          h('span', { class: 'probe' }, String(labelMaxWidth)),
      },
    })

    const expected = ctx().contentWidth.value - ctx().dateToX(m1Start) - 8
    expect(probeValue(wrapper)).toBe(expected)
  })

  it('measures the gap to a following task bar too, not just other milestones', () => {
    const m1Start = new Date(2026, 0, 5)
    const t2Start = new Date(2026, 0, 8)
    const { wrapper, ctx } = mountInRoot(GanttMilestone, {
      rootProps: {
        rows: [
          {
            id: 'r',
            tasks: [
              { id: 'm1', start: '2026-01-05', type: 'milestone' },
              { id: 't2', start: '2026-01-08', end: '2026-01-12', type: 'task' },
            ],
          },
        ],
        unit: 'day',
        columnWidth: 40,
      },
      props: { task: makeMilestone('m1', m1Start) },
      slots: {
        default: ({ labelMaxWidth }: { labelMaxWidth: number }) =>
          h('span', { class: 'probe' }, String(labelMaxWidth)),
      },
    })

    const expected = ctx().dateToX(t2Start) - ctx().dateToX(m1Start) - 8
    expect(probeValue(wrapper)).toBe(expected)
  })

  it('ignores items on other rows even when closer in X than any same-row item', () => {
    const m1Start = new Date(2026, 0, 5)
    const { wrapper, ctx } = mountInRoot(GanttMilestone, {
      rootProps: {
        rows: [
          { id: 'r', tasks: [{ id: 'm1', start: '2026-01-05', type: 'milestone' }] },
          // Closer in X, but on a different row — must not shrink m1's label width.
          { id: 'r2', tasks: [{ id: 'other', start: '2026-01-06', type: 'milestone' }] },
        ],
        unit: 'day',
        columnWidth: 40,
      },
      props: { task: makeMilestone('m1', m1Start, 0, 'r') },
      slots: {
        default: ({ labelMaxWidth }: { labelMaxWidth: number }) =>
          h('span', { class: 'probe' }, String(labelMaxWidth)),
      },
    })

    const expected = ctx().contentWidth.value - ctx().dateToX(m1Start) - 8
    expect(probeValue(wrapper)).toBe(expected)
  })
})

describe('GanttMilestone (declarative)', () => {
  it('registers itself into the enclosing row', async () => {
    const wrapper = mount({
      components: { GanttRoot, GanttRow, GanttMilestone },
      template: `
        <GanttRoot unit="day">
          <GanttRow id="r" name="Row">
            <GanttMilestone id="m1" start="2026-01-05" />
          </GanttRow>
        </GanttRoot>
      `,
    })
    await nextTick()
    expect(wrapper.findAll('.gantt-milestone__diamond')).toHaveLength(1)
    expect(wrapper.find('.gantt-milestone').attributes('data-id')).toBe('m1')
  })
})
