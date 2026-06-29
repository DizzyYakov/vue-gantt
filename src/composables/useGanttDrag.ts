import { computed, onUnmounted, ref, type ComputedRef } from 'vue'
import { format } from 'date-fns'
import { useGanttContext } from './useGanttContext'
import type { ResolvedTask } from '../types'

export interface DragOptions {
  /** The resolved task being dragged. */
  resolved: ComputedRef<ResolvedTask>
  /** The bar's un-offset left edge (px from the chart origin). */
  baseLeft: ComputedRef<number>
}

/** Whether a pointer drag moves the bar, resizes an edge, or edits progress. */
export type DragMode = 'move' | 'resize-start' | 'resize-end' | 'progress'

/** Where the task would land if the drag ended now. */
export interface DragPreview {
  start: Date
  end: Date
  order: number
  rowId: string
  /** Live progress (unchanged except in `progress` mode), 0–100. */
  progress: number
}

/**
 * Pointer-driven move for a single bar/marker. While dragging it exposes a live
 * `preview` of where the task will land (full precision by default — no grid
 * snapping unless `snapToGrid`) and a `previewLabel` of the resulting time. On
 * release it preserves duration and emits via `context.moveTask`; the library
 * stays controlled — the consumer applies the change to its data.
 */
export function useGanttDrag(options: DragOptions) {
  const ctx = useGanttContext()
  const dragging = ref(false)
  // True once a press has moved past the threshold — lets a bar distinguish a
  // genuine drag from a click (the synthetic click fires right after pointerup,
  // before the next pointerdown resets this).
  const moved = ref(false)
  const mode = ref<DragMode>('move')
  const dx = ref(0)
  const dy = ref(0)

  const MOVE_THRESHOLD = 3 // px before a press counts as a drag, not a click

  /** Move drag is available if either axis is unlocked. */
  const enabled = computed(() => ctx.config.value.draggable || ctx.config.value.rowMovable)

  let originX = 0
  let originY = 0
  // Viewport scroll at drag start — folded into the deltas so the preview stays
  // anchored to the content (not the screen) while edge auto-scroll moves it.
  let originScrollLeft = 0
  let originScrollTop = 0
  let capturedEl: HTMLElement | null = null
  let capturedId = 0

  // Drag deltas in content space: client delta + how far the viewport has
  // auto-scrolled since the drag began.
  const effDx = computed(() => dx.value + (ctx.viewport.scrollLeft - originScrollLeft))
  const effDy = computed(() => dy.value + (ctx.viewport.scrollTop - originScrollTop))

  function onPointerDown(event: PointerEvent, dragMode: DragMode = 'move'): void {
    const cfg = ctx.config.value
    const allowed =
      dragMode === 'move'
        ? enabled.value
        : dragMode === 'progress'
          ? cfg.progressDraggable
          : cfg.resizable
    if (event.button !== 0 || !allowed) return
    mode.value = dragMode
    dragging.value = true
    moved.value = false
    originX = event.clientX
    originY = event.clientY
    originScrollLeft = ctx.viewport.scrollLeft
    originScrollTop = ctx.viewport.scrollTop
    dx.value = 0
    dy.value = 0
    capturedEl = event.currentTarget as HTMLElement
    capturedId = event.pointerId
    try {
      capturedEl.setPointerCapture(capturedId)
    } catch {
      // setPointerCapture is unavailable (e.g. jsdom) — fine, window listeners cover it.
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
    event.preventDefault()
    event.stopPropagation()
  }

  function onPointerMove(event: PointerEvent): void {
    if (!dragging.value) return
    if (mode.value === 'move') {
      dx.value = ctx.config.value.draggable ? event.clientX - originX : 0
      dy.value = ctx.config.value.rowMovable ? event.clientY - originY : 0
    } else {
      // Resize is always horizontal, regardless of the move toggles.
      dx.value = event.clientX - originX
      dy.value = 0
    }
    if (Math.abs(dx.value) > MOVE_THRESHOLD || Math.abs(dy.value) > MOVE_THRESHOLD) {
      moved.value = true
    }
    // Auto-scroll toward the viewport edge for move/resize (not progress).
    if (mode.value !== 'progress') {
      ctx.autoScroll({ x: event.clientX, y: event.clientY })
    }
  }

  function onPointerUp(): void {
    if (!dragging.value) return
    commit()
    teardown()
  }

  function onPointerCancel(): void {
    if (!dragging.value) return
    dx.value = 0
    dy.value = 0
    teardown()
  }

  // Live target of the in-progress drag (null when not dragging).
  const preview = computed<DragPreview | null>(() => {
    if (!dragging.value) return null
    const task = options.resolved.value
    const config = ctx.config.value

    // Progress: map the horizontal drag onto 0–100 across the bar's width.
    if (mode.value === 'progress') {
      const barWidth = ctx.widthBetween(task.start, task.end)
      const delta = barWidth > 0 ? (dx.value / barWidth) * 100 : 0
      const progress = Math.round(Math.min(100, Math.max(0, task.progress + delta)))
      return { start: task.start, end: task.end, order: task.order, rowId: task.rowId, progress }
    }

    // Resize: drag one edge; the other stays fixed. Using min/max of the fixed
    // and dragged dates makes the sides flip automatically when the dragged edge
    // crosses the fixed one — the user then keeps dragging the other side.
    if (mode.value !== 'move') {
      const isStart = mode.value === 'resize-start'
      const baseX = ctx.dateToX(isStart ? task.start : task.end)
      const draggedRaw = ctx.xToDate(baseX + effDx.value)
      const dragged = config.snapToGrid ? ctx.snap(draggedRaw) : draggedRaw
      const fixed = isStart ? task.end : task.start
      const start = dragged < fixed ? dragged : fixed
      const end = dragged < fixed ? fixed : dragged
      return { start, end, order: task.order, rowId: task.rowId, progress: task.progress }
    }

    let start = task.start
    let end = task.end
    let order = task.order
    let rowId = task.rowId

    if (config.draggable && effDx.value !== 0) {
      const target = ctx.xToDate(options.baseLeft.value + effDx.value)
      // Full precision by default; snap to the grid only when asked.
      start = config.snapToGrid ? ctx.snap(target) : target
      // Preserve the duration (a milestone keeps end === start).
      end = new Date(start.getTime() + (task.end.getTime() - task.start.getTime()))
    }

    if (config.rowMovable && effDy.value !== 0) {
      // Move the task into the row under the pointer (not reorder the rows).
      // Anchor at the dragged bar's own band centre (its lane), not the row
      // centre — otherwise a task in a lower lane of a tall `lanes` row would
      // need an extra row-height of drag to cross into the next row.
      const rows = ctx.rows.value
      const band = ctx.taskBand(task)
      const pointerY = band.top + band.height / 2 + effDy.value
      let target = task.order
      for (const row of rows) {
        // Collapsed-group rows take no space and aren't drop targets.
        if (row.hidden) continue
        if (pointerY >= row.top && pointerY < row.top + row.height) {
          target = row.order
          break
        }
        // Past the last row → clamp to it.
        if (pointerY >= row.top) target = row.order
      }
      order = Math.min(Math.max(0, target), Math.max(0, rows.length - 1))
      rowId = rows[order]?.id ?? task.rowId
    }

    return { start, end, order, rowId, progress: task.progress }
  })

  const previewLabel = computed(() => {
    const p = preview.value
    if (!p) return ''
    const task = options.resolved.value
    const kind = mode.value === 'progress' ? 'progress' : mode.value === 'move' ? 'move' : 'resize'
    // A consumer-supplied formatter wins for every drag kind.
    const formatter = ctx.config.value.dragLabel
    if (formatter) {
      return formatter({ mode: kind, task, start: p.start, end: p.end, progress: p.progress })
    }
    if (kind === 'progress') return `${p.progress}%`
    const fmt = ctx.config.value.dragLabelFormat
    if (task.type === 'milestone') return format(p.start, fmt)
    return `${format(p.start, fmt)} → ${format(p.end, fmt)}`
  })

  function commit(): void {
    const p = preview.value
    const task = options.resolved.value
    if (p) {
      const datesChanged =
        p.start.getTime() !== task.start.getTime() || p.end.getTime() !== task.end.getTime()
      if (mode.value === 'progress') {
        if (p.progress !== task.progress) {
          ctx.progressTask({ id: task.id, progress: p.progress, task })
        }
      } else if (mode.value !== 'move') {
        if (datesChanged) {
          ctx.resizeTask({ id: task.id, start: p.start, end: p.end, task })
        }
      } else if (datesChanged || p.rowId !== task.rowId) {
        ctx.moveTask({
          id: task.id,
          start: p.start,
          end: p.end,
          fromRowId: task.rowId,
          toRowId: p.rowId,
          task,
        })
      }
    }
    dx.value = 0
    dy.value = 0
  }

  function teardown(): void {
    dragging.value = false
    ctx.autoScroll(null)
    try {
      capturedEl?.releasePointerCapture(capturedId)
    } catch {
      // ignore
    }
    capturedEl = null
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerCancel)
  }

  onUnmounted(teardown)

  return { dragging, moved, dx, dy, enabled, preview, previewLabel, onPointerDown }
}
