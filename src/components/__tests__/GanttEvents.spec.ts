import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import Gantt from '../Gantt.vue'
import GanttRoot from '../GanttRoot.vue'
import GanttRow from '../GanttRow.vue'
import GanttTask from '../GanttTask.vue'
import type { GanttRowData } from '../../index'
import type {
  GanttCellEvent,
  GanttColumnEvent,
  GanttDependencyEvent,
  GanttRowEvent,
  GanttTaskEvent,
} from '../../types'

const rows: GanttRowData[] = [
  { id: 'r1', name: 'R1', tasks: [{ id: 'a', name: 'A', start: '2026-01-01', end: '2026-01-05' }] },
  {
    id: 'r2',
    name: 'R2',
    tasks: [
      { id: 'b', name: 'B', start: '2026-01-06', end: '2026-01-10', dependencies: ['a'] },
      { id: 'm', name: 'M', type: 'milestone', start: '2026-01-12' },
    ],
  },
]

const mountChart = () => mount(Gantt, { props: { rows, unit: 'day', columnWidth: 40, today: '2026-01-03' } })

describe('chart events (prop-driven, aggregated on Gantt)', () => {
  it('emits task-click / dblclick / contextmenu with the task', async () => {
    const wrapper = mountChart()
    const bar = wrapper.find('.gantt-bar[data-id="a"]')

    await bar.trigger('click')
    await bar.trigger('dblclick')
    await bar.trigger('contextmenu')

    expect((wrapper.emitted('task-click')![0]![0] as GanttTaskEvent).task.id).toBe('a')
    expect(wrapper.emitted('task-dblclick')).toHaveLength(1)
    expect(wrapper.emitted('task-contextmenu')).toHaveLength(1)
  })

  it('emits milestone-click with the milestone', async () => {
    const wrapper = mountChart()
    await wrapper.find('.gantt-milestone__marker').trigger('click')
    expect((wrapper.emitted('milestone-click')![0]![0] as GanttTaskEvent).task.id).toBe('m')
  })

  it('emits row-click with the row', async () => {
    const wrapper = mountChart()
    await wrapper.find('.gantt-task-list__row[data-id="r2"]').trigger('click')
    expect((wrapper.emitted('row-click')![0]![0] as GanttRowEvent).row.id).toBe('r2')
  })

  it('emits cell-click with the row and a date', async () => {
    const wrapper = mountChart()
    await wrapper.find('.gantt-grid__row').trigger('click')
    const payload = wrapper.emitted('cell-click')![0]![0] as GanttCellEvent
    expect(payload.row.id).toBe('r1')
    expect(payload.date).toBeInstanceOf(Date)
  })

  it('emits column-click with the column and tier', async () => {
    const wrapper = mountChart()
    await wrapper.find('.gantt-timeline__cell').trigger('click')
    const payload = wrapper.emitted('column-click')![0]![0] as GanttColumnEvent
    expect(payload.column).toBeTruthy()
    expect(payload.tier).toBe('day')
  })

  it('emits dependency-click with both endpoints', async () => {
    const wrapper = mountChart()
    await wrapper.find('.gantt-dependency').trigger('click')
    const payload = wrapper.emitted('dependency-click')![0]![0] as GanttDependencyEvent
    expect(payload.from.id).toBe('a')
    expect(payload.to.id).toBe('b')
  })
})

// jsdom's MouseEvent has read-only props, so dispatch plain events for the drag.
function fire(target: EventTarget, type: string, props: Record<string, unknown>): void {
  target.dispatchEvent(Object.assign(new Event(type, { bubbles: true }), props))
}

describe('chart events — drag vs click', () => {
  it('does not emit task-click for the click that follows a drag', async () => {
    const wrapper = mount(Gantt, {
      props: { rows, unit: 'day', columnWidth: 40, draggable: true },
    })
    const bar = wrapper.find('.gantt-bar[data-id="a"]')
    fire(bar.element, 'pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 })
    fire(window, 'pointermove', { clientX: 80, clientY: 0 })
    fire(window, 'pointerup', {})
    await nextTick()
    await bar.trigger('click')

    expect(wrapper.emitted('move')).toHaveLength(1)
    expect(wrapper.emitted('task-click')).toBeUndefined()
  })
})

describe('component events (declarative, local emit)', () => {
  it('GanttTask emits its own click', async () => {
    const wrapper = mount(
      {
        components: { GanttRoot, GanttRow, GanttTask },
        template: `
          <GanttRoot unit="day">
            <GanttRow id="r1"><GanttTask id="a" start="2026-01-01" end="2026-01-05" /></GanttRow>
          </GanttRoot>`,
      },
      {},
    )
    await nextTick()
    await wrapper.find('.gantt-bar').trigger('click')
    expect(wrapper.findComponent(GanttTask).emitted('click')).toHaveLength(1)
  })
})
