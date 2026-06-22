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

/** Where the task would land if the drag ended now. */
export interface DragPreview {
  start: Date
  end: Date
  order: number
  rowId: string
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
  const dx = ref(0)
  const dy = ref(0)

  /** Drag is available if either axis is unlocked. */
  const enabled = computed(() => ctx.config.value.draggable || ctx.config.value.rowMovable)

  let originX = 0
  let originY = 0
  let capturedEl: HTMLElement | null = null
  let capturedId = 0

  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || !enabled.value) return
    dragging.value = true
    originX = event.clientX
    originY = event.clientY
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
    dx.value = ctx.config.value.draggable ? event.clientX - originX : 0
    dy.value = ctx.config.value.rowMovable ? event.clientY - originY : 0
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
    let start = task.start
    let end = task.end
    let order = task.order
    let rowId = task.rowId

    if (config.draggable && dx.value !== 0) {
      const target = ctx.xToDate(options.baseLeft.value + dx.value)
      // Full precision by default; snap to the grid only when asked.
      start = config.snapToGrid ? ctx.snap(target) : target
      // Preserve the duration (a milestone keeps end === start).
      end = new Date(start.getTime() + (task.end.getTime() - task.start.getTime()))
    }

    if (config.rowMovable && dy.value !== 0) {
      // Move the task into the row under the pointer (not reorder the rows).
      // Anchor at the dragged bar's own band centre (its lane), not the row
      // centre — otherwise a task in a lower lane of a tall `lanes` row would
      // need an extra row-height of drag to cross into the next row.
      const rows = ctx.rows.value
      const band = ctx.taskBand(task)
      const pointerY = band.top + band.height / 2 + dy.value
      let target = task.order
      for (const row of rows) {
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

    return { start, end, order, rowId }
  })

  const previewLabel = computed(() => {
    const p = preview.value
    if (!p) return ''
    const fmt = ctx.config.value.dragLabelFormat
    if (options.resolved.value.type === 'milestone') return format(p.start, fmt)
    return `${format(p.start, fmt)} → ${format(p.end, fmt)}`
  })

  function commit(): void {
    const p = preview.value
    const task = options.resolved.value
    if (p) {
      const changed =
        p.start.getTime() !== task.start.getTime() ||
        p.end.getTime() !== task.end.getTime() ||
        p.rowId !== task.rowId
      if (changed) {
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

  return { dragging, dx, dy, enabled, preview, previewLabel, onPointerDown }
}
