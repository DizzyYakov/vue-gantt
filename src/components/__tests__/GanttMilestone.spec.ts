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
      links: [],
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
