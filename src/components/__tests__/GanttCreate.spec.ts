import { format } from 'date-fns'
import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import GanttGrid from '../GanttGrid.vue'
import type { GanttCreateEvent, GanttRow } from '../../types'
import { mountInRoot } from '../../__tests__/helpers'

// jsdom's PointerEvent has read-only props (clientX/offsetX/button/...), so — like
// the existing drag specs (useGanttDrag.spec.ts, GanttEvents.spec.ts) — dispatch
// plain events with the props assigned directly.
function fire(target: EventTarget, type: string, props: Record<string, unknown> = {}): void {
  target.dispatchEvent(Object.assign(new Event(type, { bubbles: true }), props))
}

const rows: GanttRow[] = [
  { id: 'r1', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-20' }] },
  { id: 'r2', tasks: [{ id: 'b', start: '2026-01-01', end: '2026-01-20' }] },
]

// Fixed `startDate` pins day 1 at x=0, so `columnWidth: 40` (40px/day) makes every
// offsetX a round day offset — e.g. offsetX 80 == 2026-01-03 00:00.
function mountGrid(rootProps: Record<string, unknown> = {}) {
  return mountInRoot(GanttGrid, {
    rootProps: {
      rows,
      unit: 'day',
      columnWidth: 40,
      startDate: '2026-01-01',
      cellCreatable: true,
      ...rootProps,
    },
  })
}

describe('drag-to-create (useGanttCreate + GanttGrid)', () => {
  it('emits one create with the row and a normalized start<end span, previewed by a ghost', async () => {
    const { wrapper, ctx } = mountGrid()
    const band = wrapper.find('.gantt-grid__row[style*="top: 0px"]')

    expect(wrapper.find('.gantt-create-preview').exists()).toBe(false)

    fire(band.element, 'pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1, offsetX: 80 })
    fire(window, 'pointermove', { clientX: 240, clientY: 0 }) // currentX = 80 + 240 = 320
    await nextTick()

    expect(wrapper.find('.gantt-create-preview').exists()).toBe(true)

    fire(window, 'pointerup', {})
    await nextTick()

    expect(wrapper.find('.gantt-create-preview').exists()).toBe(false)
    expect(wrapper.emitted('create')).toHaveLength(1)
    const payload = wrapper.emitted('create')![0]![0] as GanttCreateEvent
    expect(payload.row.id).toBe('r1')
    expect(payload.start.getTime()).toBe(ctx().xToDate(80).getTime())
    expect(payload.end.getTime()).toBe(ctx().xToDate(320).getTime())
    expect(payload.start.getTime()).toBeLessThan(payload.end.getTime())
  })

  it('normalizes a right-to-left drag so start stays earlier than end', async () => {
    const { wrapper, ctx } = mountGrid()
    const band = wrapper.find('.gantt-grid__row[style*="top: 0px"]')

    fire(band.element, 'pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1, offsetX: 320 })
    fire(window, 'pointermove', { clientX: -240, clientY: 0 }) // currentX = 320 - 240 = 80
    await nextTick()
    fire(window, 'pointerup', {})
    await nextTick()

    const payload = wrapper.emitted('create')![0]![0] as GanttCreateEvent
    expect(payload.start.getTime()).toBe(ctx().xToDate(80).getTime())
    expect(payload.end.getTime()).toBe(ctx().xToDate(320).getTime())
    expect(payload.start.getTime()).toBeLessThan(payload.end.getTime())
  })

  it('does not create below the move threshold, and the normal cell-click still fires', async () => {
    const { wrapper } = mountGrid()
    const band = wrapper.find('.gantt-grid__row[style*="top: 0px"]')

    fire(band.element, 'pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1, offsetX: 100 })
    fire(window, 'pointerup', {}) // released without any move
    await nextTick()
    expect(wrapper.emitted('create')).toBeUndefined()

    await band.trigger('click')
    expect(wrapper.emitted('cell-click')).toHaveLength(1)
  })

  it('suppresses the trailing click that follows a real create-drag', async () => {
    const { wrapper } = mountGrid()
    const band = wrapper.find('.gantt-grid__row[style*="top: 0px"]')

    fire(band.element, 'pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1, offsetX: 80 })
    fire(window, 'pointermove', { clientX: 240, clientY: 0 })
    fire(window, 'pointerup', {})
    await nextTick()
    expect(wrapper.emitted('create')).toHaveLength(1)

    await band.trigger('click') // the synthetic click that trails the pointerup
    expect(wrapper.emitted('cell-click')).toBeUndefined()
  })

  it('does not start the gesture when cellCreatable is false, and cell-click works normally', async () => {
    const { wrapper } = mountGrid({ cellCreatable: false })
    const band = wrapper.find('.gantt-grid__row[style*="top: 0px"]')

    fire(band.element, 'pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1, offsetX: 80 })
    fire(window, 'pointermove', { clientX: 240, clientY: 0 })
    fire(window, 'pointerup', {})
    await nextTick()
    expect(wrapper.emitted('create')).toBeUndefined()
    expect(wrapper.find('.gantt-create-preview').exists()).toBe(false)

    await band.trigger('click')
    expect(wrapper.emitted('cell-click')).toHaveLength(1)
  })

  it('snaps start/end to the grid when snapToGrid is enabled', async () => {
    const { wrapper, ctx } = mountGrid({ snapToGrid: true })
    const band = wrapper.find('.gantt-grid__row[style*="top: 0px"]')

    // Off-grid anchor/target (2.25 and 6.75 days in) so we can assert they get snapped.
    fire(band.element, 'pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1, offsetX: 90 })
    fire(window, 'pointermove', { clientX: 180, clientY: 0 }) // currentX = 90 + 180 = 270
    await nextTick()
    fire(window, 'pointerup', {})
    await nextTick()

    const payload = wrapper.emitted('create')![0]![0] as GanttCreateEvent
    expect(payload.start.getTime()).toBe(ctx().snap(ctx().xToDate(90)).getTime())
    expect(payload.end.getTime()).toBe(ctx().snap(ctx().xToDate(270)).getTime())
    // Sanity: the snapped span differs from the raw (unsnapped) span.
    expect(payload.start.getTime()).not.toBe(ctx().xToDate(90).getTime())
  })

  it('cancels cleanly mid-drag: no create, and a fresh gesture still works afterwards', async () => {
    const { wrapper, ctx } = mountGrid()
    const band = wrapper.find('.gantt-grid__row[style*="top: 0px"]')

    fire(band.element, 'pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1, offsetX: 80 })
    fire(window, 'pointermove', { clientX: 200, clientY: 0 })
    await nextTick()
    expect(wrapper.find('.gantt-create-preview').exists()).toBe(true)

    fire(window, 'pointercancel', {})
    await nextTick()
    expect(wrapper.find('.gantt-create-preview').exists()).toBe(false)
    expect(wrapper.emitted('create')).toBeUndefined()

    // A subsequent gesture is unaffected (listeners were torn down cleanly).
    fire(band.element, 'pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1, offsetX: 80 })
    fire(window, 'pointermove', { clientX: 240, clientY: 0 })
    fire(window, 'pointerup', {})
    await nextTick()

    expect(wrapper.emitted('create')).toHaveLength(1)
    const payload = wrapper.emitted('create')![0]![0] as GanttCreateEvent
    expect(payload.start.getTime()).toBe(ctx().xToDate(80).getTime())
    expect(payload.end.getTime()).toBe(ctx().xToDate(320).getTime())
  })
})

describe('drag-to-create live label', () => {
  it('shows a "start → end" label tracking the live draft span', async () => {
    const { wrapper, ctx } = mountGrid()
    const band = wrapper.find('.gantt-grid__row[style*="top: 0px"]')

    fire(band.element, 'pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1, offsetX: 80 })
    fire(window, 'pointermove', { clientX: 240, clientY: 0 }) // currentX = 80 + 240 = 320
    await nextTick()

    const label = wrapper.find('.gantt-create-preview__label')
    expect(label.exists()).toBe(true)
    // Exact text uses date-fns with the configured `dragLabelFormat` — assert via the same formatter.
    const fmt = ctx().config.value.dragLabelFormat
    expect(label.text()).toBe(`${format(ctx().xToDate(80), fmt)} → ${format(ctx().xToDate(320), fmt)}`)

    fire(window, 'pointerup', {})
    await nextTick()
  })

  it('is empty (no ghost) once the draft is gone', async () => {
    const { wrapper } = mountGrid()
    expect(wrapper.find('.gantt-create-preview__label').exists()).toBe(false)
  })

  it('flips the label below the ghost on the top row (near the sticky header)', async () => {
    const { wrapper } = mountGrid()
    const band = wrapper.find('.gantt-grid__row[style*="top: 0px"]')

    fire(band.element, 'pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1, offsetX: 80 })
    fire(window, 'pointermove', { clientX: 240, clientY: 0 })
    await nextTick()

    const label = wrapper.find('.gantt-create-preview__label')
    expect(label.classes()).toContain('gantt-create-preview__label--below')

    fire(window, 'pointerup', {})
    await nextTick()
  })

  it('does not flip the label for a row further down the chart', async () => {
    const { wrapper } = mountGrid({ rowHeight: 36 })
    // r2 is the second row (top = 36px, clear of the sticky-header clearance).
    const band = wrapper.find('.gantt-grid__row[style*="top: 36px"]')

    fire(band.element, 'pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1, offsetX: 80 })
    fire(window, 'pointermove', { clientX: 240, clientY: 0 })
    await nextTick()

    const label = wrapper.find('.gantt-create-preview__label')
    expect(label.exists()).toBe(true)
    expect(label.classes()).not.toContain('gantt-create-preview__label--below')

    fire(window, 'pointerup', {})
    await nextTick()
  })
})
