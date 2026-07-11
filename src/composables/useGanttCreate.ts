import { computed, onUnmounted, ref, type ComputedRef, type Ref } from 'vue'
import type { GanttContext, ResolvedRow } from '../types'

/** Live span of an in-progress drag-to-create gesture (null when idle). */
export interface CreateDraft {
  row: ResolvedRow
  start: Date
  end: Date
}

export interface GanttCreateApi {
  /** The span being dragged out, for a ghost preview (null when idle). */
  createDraft: ComputedRef<CreateDraft | null>
  /** True once the current press has moved past the drag threshold. Read it in
   *  the band's `click` handler to swallow the click that trails a create-drag
   *  (it stays true until the next pointerdown resets it — like useGanttDrag). */
  moved: Ref<boolean>
  /** Begin a create gesture from a pointerdown on an empty grid row band. */
  onBandPointerDown: (row: ResolvedRow, event: PointerEvent) => void
}

// Slop before a press counts as a drag (mouse vs touch), mirroring useGanttDrag.
const MOVE_THRESHOLD = 3
const TOUCH_MOVE_THRESHOLD = 8

/**
 * Drives "drag across an empty grid row to create a task". A pointerdown on a
 * grid band anchors a date; the live `createDraft` drives a ghost bar; on release
 * past the move threshold it emits the `create` intent (the consumer applies it —
 * the library stays controlled). Below the threshold nothing is emitted, so the
 * band's normal `cell-click` still fires. Opt-in via `config.cellCreatable`.
 */
export function useGanttCreate(ctx: GanttContext): GanttCreateApi {
  const activeRow = ref<ResolvedRow | null>(null)
  const lastClientX = ref(0)
  const moved = ref(false)
  // Constants captured on pointerdown (not reactive — fixed for the gesture).
  let anchorX = 0
  let originClientX = 0
  let originScrollLeft = 0
  let moveThreshold = MOVE_THRESHOLD

  // Content-space x now = anchor + pointer delta + how far we auto-scrolled since
  // (reads reactive `viewport.scrollLeft`, so autoscroll keeps the ghost anchored).
  const createDraft = computed<CreateDraft | null>(() => {
    const row = activeRow.value
    if (!row) return null
    const scrolledBy = ctx.viewport.scrollLeft - originScrollLeft
    const currentX = anchorX + (lastClientX.value - originClientX) + scrolledBy
    const rawStart = ctx.xToDate(Math.min(anchorX, currentX))
    const rawEnd = ctx.xToDate(Math.max(anchorX, currentX))
    if (!ctx.config.value.snapToGrid) return { row, start: rawStart, end: rawEnd }
    return { row, start: ctx.snap(rawStart), end: ctx.snap(rawEnd) }
  })

  function onPointerMove(event: PointerEvent): void {
    if (!activeRow.value) return
    lastClientX.value = event.clientX
    if (Math.abs(event.clientX - originClientX) > moveThreshold) moved.value = true
    ctx.autoScroll({ x: event.clientX, y: event.clientY })
  }

  function onPointerUp(event: PointerEvent): void {
    const draft = createDraft.value
    // Emit only a real drag; a below-threshold press falls through to `cell-click`.
    if (draft && moved.value) {
      ctx.dispatch('create', { row: draft.row, start: draft.start, end: draft.end, event })
    }
    teardown()
  }

  function onPointerCancel(): void {
    teardown()
  }

  function teardown(): void {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerCancel)
    document.body.style.userSelect = ''
    ctx.autoScroll(null)
    activeRow.value = null
    // `moved` is left as-is: the synthetic click fires right after pointerup and
    // reads it to suppress itself; the next pointerdown resets it.
  }

  function onBandPointerDown(row: ResolvedRow, event: PointerEvent): void {
    // Opt-in, left button only (so context menus / secondary clicks pass through).
    if (!ctx.config.value.cellCreatable || event.button !== 0) return
    anchorX = event.offsetX
    originClientX = event.clientX
    originScrollLeft = ctx.viewport.scrollLeft
    lastClientX.value = event.clientX
    moved.value = false
    moveThreshold = event.pointerType === 'touch' ? TOUCH_MOVE_THRESHOLD : MOVE_THRESHOLD
    // Suppress text selection for the drag (cleared in teardown).
    event.preventDefault()
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
    activeRow.value = row
  }

  // Safety net if the grid unmounts mid-gesture (mirrors useGanttDrag).
  onUnmounted(teardown)

  return { createDraft, moved, onBandPointerDown }
}
