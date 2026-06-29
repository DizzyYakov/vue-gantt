import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
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
    props: {
      rows: [{ id: 'r1', tasks: [resolved] }],
      unit: 'day',
      columnWidth: 40,
      ...rootProps,
    } as Record<string, unknown>,
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
    fire(wrapper.find('.bar').element, 'pointerdown', {
      button: 2,
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    })
    await nextTick()
    expect(api().dragging.value).toBe(false)
  })

  it('does not start when disabled', async () => {
    const { wrapper, api } = setup({})
    fire(wrapper.find('.bar').element, 'pointerdown', {
      button: 0,
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    })
    await nextTick()
    expect(api().dragging.value).toBe(false)
  })

  it('builds a duration-preserving preview while dragging', async () => {
    const { wrapper, api } = setup({ draggable: true })
    fire(wrapper.find('.bar').element, 'pointerdown', {
      button: 0,
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    })
    fire(window, 'pointermove', { clientX: 80, clientY: 0 }) // +2 days at 40px/day
    await nextTick()
    const p = api().preview.value!
    expect(p.start.getDate()).toBe(3)
    expect(p.end.getDate()).toBe(7)
    fire(window, 'pointerup')
  })

  it('cancels cleanly without emitting a move', async () => {
    const { wrapper, api } = setup({ draggable: true })
    fire(wrapper.find('.bar').element, 'pointerdown', {
      button: 0,
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    })
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
    fire(wrapper.find('.bar').element, 'pointerdown', {
      button: 0,
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    })
    fire(window, 'pointermove', { clientX: 40, clientY: 0 })
    await nextTick()
    expect(api().previewLabel.value).not.toContain('→')
    fire(window, 'pointerup')
  })

  describe('edge auto-scroll wiring', () => {
    // `onPointerMove` reads `ctx.autoScroll` off the context object at call time
    // (`ctx.autoScroll({ x, y })`), so swapping it on the live context before the
    // move dispatch lets us observe the call without touching the rAF loop.

    it('drives ctx.autoScroll with the pointer during a move drag', async () => {
      const { wrapper, ctx } = setup({ draggable: true })
      const spy = vi.fn<(pointer: { x: number; y: number } | null) => void>()
      ctx().autoScroll = spy

      fire(wrapper.find('.bar').element, 'pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 })
      fire(window, 'pointermove', { clientX: 80, clientY: 12 })
      await nextTick()

      expect(spy).toHaveBeenCalledWith({ x: 80, y: 12 })
      fire(window, 'pointerup')
    })

    it('drives ctx.autoScroll during a resize drag', async () => {
      const { api, ctx } = setup({ resizable: true })
      const spy = vi.fn<(pointer: { x: number; y: number } | null) => void>()
      ctx().autoScroll = spy

      api().onPointerDown(
        Object.assign(new Event('pointerdown'), { button: 0, clientX: 0, clientY: 0, pointerId: 1 }) as unknown as PointerEvent,
        'resize-end',
      )
      fire(window, 'pointermove', { clientX: 60, clientY: 0 })
      await nextTick()

      expect(spy).toHaveBeenCalledWith({ x: 60, y: 0 })
      fire(window, 'pointerup')
    })

    it('does NOT auto-scroll during a progress drag', async () => {
      const { api, ctx } = setup({ progressDraggable: true })
      const spy = vi.fn<(pointer: { x: number; y: number } | null) => void>()
      ctx().autoScroll = spy

      api().onPointerDown(
        Object.assign(new Event('pointerdown'), { button: 0, clientX: 0, clientY: 0, pointerId: 1 }) as unknown as PointerEvent,
        'progress',
      )
      fire(window, 'pointermove', { clientX: 40, clientY: 0 })
      await nextTick()

      expect(spy).not.toHaveBeenCalled()
      fire(window, 'pointerup')
    })

    it('reactively folds viewport scroll into the move preview (effDx)', async () => {
      const { wrapper, api, ctx } = setup({ draggable: true })

      fire(wrapper.find('.bar').element, 'pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 })
      // No client movement yet — preview sits at the task's own start.
      fire(window, 'pointermove', { clientX: 0, clientY: 0 })
      await nextTick()
      const before = api().preview.value!.start.getTime()

      // The viewport auto-scrolls under the bar: +40px == +1 day at 40px/day.
      ctx().setViewport({ scrollLeft: 40 })
      await nextTick()
      const after = api().preview.value!.start.getTime()

      expect(after).toBeGreaterThan(before)
      fire(window, 'pointerup')
    })

    it('does not move the preview on scroll when no drag is active', async () => {
      const { api, ctx } = setup({ draggable: true })
      // No pointerdown → not dragging → preview is null regardless of scroll.
      ctx().setViewport({ scrollLeft: 120 })
      await nextTick()
      expect(api().preview.value).toBeNull()
    })
  })
})
