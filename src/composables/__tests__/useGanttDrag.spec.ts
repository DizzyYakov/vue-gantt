import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { computed, defineComponent, h, nextTick } from 'vue'
import GanttRoot from '../../components/GanttRoot.vue'
import { useGanttDrag } from '../useGanttDrag'
import { useGanttContext } from '../useGanttContext'
import type { GanttRootProps, ResolvedTask } from '../../types'

function fire(target: EventTarget, type: string, props: Record<string, unknown> = {}): void {
  target.dispatchEvent(Object.assign(new Event(type, { bubbles: true }), props))
}

const task: ResolvedTask = {
  id: 'a',
  name: 'Alpha',
  start: new Date(2026, 0, 1),
  end: new Date(2026, 0, 5),
  progress: 0,
  dependencies: [],
  type: 'task',
  meta: {},
  rowId: 'r1',
  order: 0,
  lane: 0,
}

/** Run `useGanttDrag` for `task` inside a GanttRoot and expose its API. */
function setup(rootProps: Partial<GanttRootProps>, resolved: ResolvedTask = task) {
  let api: ReturnType<typeof useGanttDrag> | undefined
  let ctx: ReturnType<typeof useGanttContext> | undefined
  const Harness = defineComponent({
    setup() {
      ctx = useGanttContext()
      api = useGanttDrag({
        resolved: computed(() => resolved),
        baseLeft: computed(() => ctx!.dateToX(resolved.start)),
      })
      return () => h('div', { class: 'bar', onPointerdown: api!.onPointerDown })
    },
  })
  const wrapper = mount(GanttRoot, {
    props: { rows: [{ id: 'r1', tasks: [resolved] }], unit: 'day', columnWidth: 40, ...rootProps } as Record<string, unknown>,
    slots: { default: () => h(Harness) },
  })
  return { wrapper, api: () => api!, ctx: () => ctx! }
}

describe('useGanttDrag', () => {
  it('is disabled unless draggable or rowMovable', () => {
    expect(setup({}).api().enabled.value).toBe(false)
    expect(setup({ draggable: true }).api().enabled.value).toBe(true)
    expect(setup({ rowMovable: true }).api().enabled.value).toBe(true)
  })

  it('ignores non-primary buttons', async () => {
    const { wrapper, api } = setup({ draggable: true })
    fire(wrapper.find('.bar').element, 'pointerdown', { button: 2, clientX: 0, clientY: 0, pointerId: 1 })
    await nextTick()
    expect(api().dragging.value).toBe(false)
  })

  it('does not start when disabled', async () => {
    const { wrapper, api } = setup({})
    fire(wrapper.find('.bar').element, 'pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 })
    await nextTick()
    expect(api().dragging.value).toBe(false)
  })

  it('builds a duration-preserving preview while dragging', async () => {
    const { wrapper, api } = setup({ draggable: true })
    fire(wrapper.find('.bar').element, 'pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 })
    fire(window, 'pointermove', { clientX: 80, clientY: 0 }) // +2 days at 40px/day
    await nextTick()
    const p = api().preview.value!
    expect(p.start.getDate()).toBe(3)
    expect(p.end.getDate()).toBe(7)
    fire(window, 'pointerup')
  })

  it('cancels cleanly without emitting a move', async () => {
    const { wrapper, api } = setup({ draggable: true })
    fire(wrapper.find('.bar').element, 'pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 })
    fire(window, 'pointermove', { clientX: 80, clientY: 0 })
    await nextTick()
    expect(api().dragging.value).toBe(true)

    fire(window, 'pointercancel')
    await nextTick()
    expect(api().dragging.value).toBe(false)
    expect(api().preview.value).toBeNull()
    expect(wrapper.emitted('move')).toBeUndefined()
  })

  it('formats a milestone label as a single date (no range)', async () => {
    const milestone: ResolvedTask = { ...task, type: 'milestone', end: task.start }
    const { wrapper, api } = setup({ draggable: true }, milestone)
    fire(wrapper.find('.bar').element, 'pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 })
    fire(window, 'pointermove', { clientX: 40, clientY: 0 })
    await nextTick()
    expect(api().previewLabel.value).not.toContain('→')
    fire(window, 'pointerup')
  })
})
