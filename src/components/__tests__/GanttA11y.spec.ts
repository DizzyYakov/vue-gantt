import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Gantt from '../Gantt.vue'
import type { GanttRowData } from '../../index'
import type { GanttMoveEvent, GanttResizeEvent, GanttTaskEvent } from '../../types'

const rows: GanttRowData[] = [
  { id: 'r1', name: 'R1', tasks: [{ id: 'a', name: 'A', start: '2026-01-01', end: '2026-01-05' }] },
  {
    id: 'r2',
    name: 'R2',
    tasks: [{ id: 'm', name: 'M', type: 'milestone', start: '2026-01-12' }],
  },
]

const mountChart = (extraProps: Record<string, unknown> = {}) =>
  mount(Gantt, {
    props: { rows, unit: 'day', columnWidth: 40, today: '2026-01-03', ...extraProps },
  })

// Rows/tasks for roving-tabindex + arrow-key navigation: two rows, each with two
// tasks declared out of chronological order (so sorting-by-start is exercised).
const navRows: GanttRowData[] = [
  {
    id: 'r1',
    name: 'R1',
    tasks: [
      { id: 'b', name: 'B', start: '2026-01-10', end: '2026-01-12' },
      { id: 'a', name: 'A', start: '2026-01-01', end: '2026-01-05' },
    ],
  },
  {
    id: 'r2',
    name: 'R2',
    tasks: [{ id: 'c', name: 'C', start: '2026-01-03', end: '2026-01-06' }],
  },
]

const mountNavChart = (extraProps: Record<string, unknown> = {}) =>
  mount(Gantt, {
    props: { rows: navRows, unit: 'day', columnWidth: 40, today: '2026-01-03', keyboard: true, ...extraProps },
  })

/** Map of task id -> its bar's rendered `tabindex` attribute. */
function tabIndexById(wrapper: ReturnType<typeof mountNavChart>): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {}
  for (const bar of wrapper.findAll('.gantt-bar')) {
    const id = bar.attributes('data-id')
    if (id) out[id] = bar.attributes('tabindex')
  }
  return out
}

describe('accessibility (opt-in via `keyboard`)', () => {
  describe('keyboard: true', () => {
    it('gives the task bar a button role, tabindex and a descriptive aria-label', () => {
      const wrapper = mountChart({ keyboard: true })
      const bar = wrapper.find('.gantt-bar[data-id="a"]')

      expect(bar.attributes('role')).toBe('button')
      expect(bar.attributes('tabindex')).toBe('0')
      const label = bar.attributes('aria-label')
      expect(label).toContain('A')
      expect(label).toContain('complete')
    })

    it('gives the milestone marker a button role and a descriptive aria-label', async () => {
      const wrapper = mountChart({ keyboard: true })
      const marker = wrapper.find('.gantt-milestone__marker')

      expect(marker.attributes('role')).toBe('button')
      const label = marker.attributes('aria-label')
      expect(label).toContain('M')
      expect(label).toContain('(milestone)')

      // With roving tabindex, only the active item is a `0` tab stop (see the
      // dedicated describe block below); this task bar isn't it by default, so
      // focus it first to check it does get `0` once it becomes the anchor.
      await marker.trigger('focus')
      expect(marker.attributes('tabindex')).toBe('0')
    })

    it('activates the task bar with Enter and with Space', async () => {
      const wrapper = mountChart({ keyboard: true })
      const bar = wrapper.find('.gantt-bar[data-id="a"]')

      bar.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await wrapper.vm.$nextTick()
      expect(wrapper.emitted('task-click')).toHaveLength(1)
      expect((wrapper.emitted('task-click')![0]![0] as GanttTaskEvent).task.id).toBe('a')

      bar.element.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      await wrapper.vm.$nextTick()
      expect(wrapper.emitted('task-click')).toHaveLength(2)
    })

    it('activates the milestone marker with Enter', async () => {
      const wrapper = mountChart({ keyboard: true })
      const marker = wrapper.find('.gantt-milestone__marker')

      marker.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await wrapper.vm.$nextTick()
      expect(wrapper.emitted('milestone-click')).toHaveLength(1)
      expect((wrapper.emitted('milestone-click')![0]![0] as GanttTaskEvent).task.id).toBe('m')
    })

    it('ignores non-activation, non-navigation keys (no emit, no preventDefault)', async () => {
      const wrapper = mountChart({ keyboard: true })
      const bar = wrapper.find('.gantt-bar[data-id="a"]')

      const otherKey = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true })
      bar.element.dispatchEvent(otherKey)
      await wrapper.vm.$nextTick()
      expect(wrapper.emitted('task-click')).toBeUndefined()
      expect(otherKey.defaultPrevented).toBe(false)
      // Arrow keys are a *navigation* key (roving focus), not an activation key —
      // covered separately in the roving-tabindex describe block below, including
      // their `preventDefault`.
    })
  })

  describe('keyboard: false (default)', () => {
    it('renders no role/tabindex/aria-label on the task bar or milestone marker', () => {
      const wrapper = mountChart()
      const bar = wrapper.find('.gantt-bar[data-id="a"]')
      const marker = wrapper.find('.gantt-milestone__marker')

      expect(bar.attributes('role')).toBeUndefined()
      expect(bar.attributes('tabindex')).toBeUndefined()
      expect(bar.attributes('aria-label')).toBeUndefined()
      expect(marker.attributes('role')).toBeUndefined()
      expect(marker.attributes('tabindex')).toBeUndefined()
      expect(marker.attributes('aria-label')).toBeUndefined()
    })

    it('does not emit task-click on Enter', async () => {
      const wrapper = mountChart()
      const bar = wrapper.find('.gantt-bar[data-id="a"]')

      bar.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await wrapper.vm.$nextTick()
      expect(wrapper.emitted('task-click')).toBeUndefined()
    })

    it('renders no role/aria-label on the root', () => {
      const wrapper = mountChart()
      const root = wrapper.find('.gantt-root')

      expect(root.attributes('role')).toBeUndefined()
      expect(root.attributes('aria-label')).toBeUndefined()
    })
  })

  describe('root group role/label', () => {
    it('marks the root as a group with the default aria-label when keyboard is on', () => {
      const wrapper = mountChart({ keyboard: true })
      const root = wrapper.find('.gantt-root')

      expect(root.attributes('role')).toBe('group')
      expect(root.attributes('aria-label')).toBe('Gantt chart')
    })

    it('reflects a custom ariaLabel', () => {
      const wrapper = mountChart({ keyboard: true, ariaLabel: 'My schedule' })
      const root = wrapper.find('.gantt-root')

      expect(root.attributes('aria-label')).toBe('My schedule')
    })
  })

  describe('roving tabindex + arrow-key navigation (keyboard: true)', () => {
    it('gives exactly one task tabindex=0 (the earliest by start, by default) and -1 to the rest', () => {
      const wrapper = mountNavChart()
      const tabIndexes = tabIndexById(wrapper)

      // `a` (Jan 1) is the earliest task in the first navigable row, so it's the default anchor.
      expect(tabIndexes).toEqual({ b: '-1', a: '0', c: '-1' })
    })

    it('moves the roving anchor to whichever bar receives focus', async () => {
      const wrapper = mountNavChart()

      await wrapper.find('.gantt-bar[data-id="c"]').trigger('focus')

      expect(tabIndexById(wrapper)).toEqual({ b: '-1', a: '-1', c: '0' })
    })

    it('moves the roving anchor to the next-by-time task in the row on ArrowRight', async () => {
      const wrapper = mountNavChart()
      const barA = wrapper.find('.gantt-bar[data-id="a"]')

      // `a` (Jan 1) is the default anchor; ArrowRight should move to `b` (Jan 10),
      // the next task by start time in the same row (declared before `a` in props).
      barA.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
      await wrapper.vm.$nextTick()

      expect(tabIndexById(wrapper)).toEqual({ b: '0', a: '-1', c: '-1' })
    })

    it('moves the roving anchor down into the other row on ArrowDown', async () => {
      const wrapper = mountNavChart()
      const barA = wrapper.find('.gantt-bar[data-id="a"]')

      barA.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await wrapper.vm.$nextTick()

      expect(tabIndexById(wrapper)).toEqual({ b: '-1', a: '-1', c: '0' })
    })

    it('prevents the default action on a navigation key', async () => {
      const wrapper = mountNavChart()
      const barA = wrapper.find('.gantt-bar[data-id="a"]')

      const arrowKey = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
      barA.element.dispatchEvent(arrowKey)
      await wrapper.vm.$nextTick()

      expect(arrowKey.defaultPrevented).toBe(true)
    })
  })

  describe('roving tabindex + arrow-key navigation (keyboard: false)', () => {
    it('renders no tabindex at all, and arrow keys are a no-op (no preventDefault, no anchor move)', async () => {
      const wrapper = mountNavChart({ keyboard: false })
      const barA = wrapper.find('.gantt-bar[data-id="a"]')

      expect(tabIndexById(wrapper)).toEqual({ b: undefined, a: undefined, c: undefined })

      const arrowKey = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
      barA.element.dispatchEvent(arrowKey)
      await wrapper.vm.$nextTick()

      expect(arrowKey.defaultPrevented).toBe(false)
      expect(tabIndexById(wrapper)).toEqual({ b: undefined, a: undefined, c: undefined })
    })
  })

  describe('keyboard move/resize (Shift/Alt + ArrowLeft/ArrowRight)', () => {
    // Single row/task, unit 'day': a 3-day task so a -1-day resize still leaves a
    // positive span, distinct from the clamp fixture below.
    const editRows: GanttRowData[] = [
      { id: 'r1', name: 'R1', tasks: [{ id: 'a', name: 'A', start: '2026-01-05', end: '2026-01-08' }] },
    ]
    // A single-day task: resizing its end back by 1 day would collapse it onto
    // its own start, so this is the fixture for the clamp/no-emit case.
    const oneDayRows: GanttRowData[] = [
      { id: 'r1', name: 'R1', tasks: [{ id: 'a', name: 'A', start: '2026-01-05', end: '2026-01-06' }] },
    ]
    const milestoneRows: GanttRowData[] = [
      { id: 'r1', name: 'R1', tasks: [{ id: 'm', name: 'M', type: 'milestone', start: '2026-01-05' }] },
    ]

    const dispatchArrow = (
      element: Element,
      key: 'ArrowRight' | 'ArrowLeft',
      modifiers: Partial<Pick<KeyboardEventInit, 'shiftKey' | 'altKey'>>,
    ) => element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...modifiers }))

    it('Shift+ArrowRight emits one `move` shifting start and end +1 day (duration preserved)', async () => {
      const wrapper = mount(Gantt, {
        props: { rows: editRows, unit: 'day', columnWidth: 40, keyboard: true, draggable: true },
      })
      const bar = wrapper.find('.gantt-bar[data-id="a"]')

      dispatchArrow(bar.element, 'ArrowRight', { shiftKey: true })
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('move')).toHaveLength(1)
      const event = wrapper.emitted('move')![0]![0] as GanttMoveEvent
      expect(event.id).toBe('a')
      expect(event.start.getTime()).toBe(new Date(2026, 0, 6).getTime())
      expect(event.end.getTime()).toBe(new Date(2026, 0, 9).getTime())
      expect(event.fromRowId).toBe('r1')
      expect(event.toRowId).toBe('r1')
      expect(wrapper.emitted('resize')).toBeUndefined()
    })

    it('Shift+ArrowLeft emits one `move` shifting start and end -1 day', async () => {
      const wrapper = mount(Gantt, {
        props: { rows: editRows, unit: 'day', columnWidth: 40, keyboard: true, draggable: true },
      })
      const bar = wrapper.find('.gantt-bar[data-id="a"]')

      dispatchArrow(bar.element, 'ArrowLeft', { shiftKey: true })
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('move')).toHaveLength(1)
      const event = wrapper.emitted('move')![0]![0] as GanttMoveEvent
      expect(event.start.getTime()).toBe(new Date(2026, 0, 4).getTime())
      expect(event.end.getTime()).toBe(new Date(2026, 0, 7).getTime())
    })

    it('Alt+ArrowRight emits one `resize` shifting only end +1 day (start unchanged)', async () => {
      const wrapper = mount(Gantt, {
        props: { rows: editRows, unit: 'day', columnWidth: 40, keyboard: true, resizable: true },
      })
      const bar = wrapper.find('.gantt-bar[data-id="a"]')

      dispatchArrow(bar.element, 'ArrowRight', { altKey: true })
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('resize')).toHaveLength(1)
      const event = wrapper.emitted('resize')![0]![0] as GanttResizeEvent
      expect(event.id).toBe('a')
      expect(event.start.getTime()).toBe(new Date(2026, 0, 5).getTime())
      expect(event.end.getTime()).toBe(new Date(2026, 0, 9).getTime())
      expect(wrapper.emitted('move')).toBeUndefined()
    })

    it('Alt+ArrowLeft emits one `resize` shrinking end -1 day while it stays after start', async () => {
      const wrapper = mount(Gantt, {
        props: { rows: editRows, unit: 'day', columnWidth: 40, keyboard: true, resizable: true },
      })
      const bar = wrapper.find('.gantt-bar[data-id="a"]')

      dispatchArrow(bar.element, 'ArrowLeft', { altKey: true })
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('resize')).toHaveLength(1)
      const event = wrapper.emitted('resize')![0]![0] as GanttResizeEvent
      expect(event.start.getTime()).toBe(new Date(2026, 0, 5).getTime())
      expect(event.end.getTime()).toBe(new Date(2026, 0, 7).getTime())
    })

    it('Alt+ArrowLeft on a 1-day task does not emit `resize` (would collapse end onto start)', async () => {
      const wrapper = mount(Gantt, {
        props: { rows: oneDayRows, unit: 'day', columnWidth: 40, keyboard: true, resizable: true },
      })
      const bar = wrapper.find('.gantt-bar[data-id="a"]')

      dispatchArrow(bar.element, 'ArrowLeft', { altKey: true })
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('resize')).toBeUndefined()
    })

    it('gates move behind `draggable`: Shift+Arrow does not emit `move` when draggable is false', async () => {
      const wrapper = mount(Gantt, {
        props: { rows: editRows, unit: 'day', columnWidth: 40, keyboard: true, draggable: false },
      })
      const bar = wrapper.find('.gantt-bar[data-id="a"]')

      dispatchArrow(bar.element, 'ArrowRight', { shiftKey: true })
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('move')).toBeUndefined()
    })

    it('gates resize behind `resizable`: Alt+Arrow does not emit `resize` when resizable is false', async () => {
      const wrapper = mount(Gantt, {
        props: { rows: editRows, unit: 'day', columnWidth: 40, keyboard: true, resizable: false },
      })
      const bar = wrapper.find('.gantt-bar[data-id="a"]')

      dispatchArrow(bar.element, 'ArrowRight', { altKey: true })
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('resize')).toBeUndefined()
    })

    it('never emits `resize` on a milestone via Alt+Arrow, even when resizable is true', async () => {
      const wrapper = mount(Gantt, {
        props: {
          rows: milestoneRows,
          unit: 'day',
          columnWidth: 40,
          keyboard: true,
          draggable: true,
          resizable: true,
        },
      })
      const marker = wrapper.find('.gantt-milestone__marker')

      dispatchArrow(marker.element, 'ArrowRight', { altKey: true })
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('resize')).toBeUndefined()
    })

    it('emits `move` for a milestone via Shift+Arrow when draggable is true', async () => {
      const wrapper = mount(Gantt, {
        props: { rows: milestoneRows, unit: 'day', columnWidth: 40, keyboard: true, draggable: true },
      })
      const marker = wrapper.find('.gantt-milestone__marker')

      dispatchArrow(marker.element, 'ArrowRight', { shiftKey: true })
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('move')).toHaveLength(1)
      const event = wrapper.emitted('move')![0]![0] as GanttMoveEvent
      expect(event.id).toBe('m')
      expect(event.start.getTime()).toBe(new Date(2026, 0, 6).getTime())
    })

    it('a plain ArrowRight (no modifier) emits neither `move` nor `resize`', async () => {
      const wrapper = mount(Gantt, {
        props: {
          rows: editRows,
          unit: 'day',
          columnWidth: 40,
          keyboard: true,
          draggable: true,
          resizable: true,
        },
      })
      const bar = wrapper.find('.gantt-bar[data-id="a"]')

      dispatchArrow(bar.element, 'ArrowRight', {})
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('move')).toBeUndefined()
      expect(wrapper.emitted('resize')).toBeUndefined()
    })
  })
})
