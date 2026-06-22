import { computed, inject } from 'vue'
import { GANTT_ROW, normalizeTask } from '../context'
import type { GanttTask, ResolvedTask } from '../types'
import { useGanttContext } from './useGanttContext'
import { useGanttDrag } from './useGanttDrag'
import { useRegisteredTask } from './useTaskRegistry'

/** Props shared by `GanttTask` and `GanttMilestone` (both data modes). */
export interface GanttItemProps {
  /** Presentational mode: render this already-resolved task without registering it. */
  task?: GanttTask | ResolvedTask
  /** Declarative mode fields. */
  id?: string
  name?: string
  start?: Date | string | number
  end?: Date | string | number
  progress?: number
  dependencies?: string[]
  meta?: Record<string, unknown>
  /** Explicit row id (declarative mode, overrides the enclosing `GanttRow`). */
  rowId?: string
}

/**
 * Powers both data modes for a single plotted item:
 * - presentational: a resolved `task` is supplied (by the `Gantt` wrapper); its
 *   `rowId`/`order` are used and nothing is registered.
 * - declarative: individual fields are supplied; the item registers itself into
 *   the enclosing `GanttRow` (or `rowId` prop) with `GanttRoot`.
 *
 * Returns the resolved task, geometry, and drag wiring.
 */
export function useGanttItem(props: GanttItemProps, overrides: Partial<GanttTask> = {}) {
  const ctx = useGanttContext()
  const declarative = props.task == null
  const injectedRow = inject(GANTT_ROW, null)

  const rowId = computed<string>(() => {
    if (props.task) return (props.task as ResolvedTask).rowId ?? ''
    return props.rowId ?? (injectedRow ? injectedRow.value : '')
  })

  const input = computed<GanttTask>(() => ({
    id: props.id ?? '',
    name: props.name,
    start: props.start ?? new Date(0),
    end: props.end ?? props.start ?? new Date(0),
    progress: props.progress,
    dependencies: props.dependencies,
    meta: props.meta,
    ...(props.task as GanttTask | undefined),
    ...overrides,
  }))

  if (declarative) {
    useRegisteredTask(input, rowId)
  }

  const order = computed(() => {
    if (props.task) return (props.task as ResolvedTask).order ?? 0
    const index = ctx.rowIndexOf(rowId.value)
    return index < 0 ? 0 : index
  })

  // Prefer GanttRoot's laid-out copy (it carries `lane`); fall back to a local
  // resolve until registration has propagated.
  const resolved = computed<ResolvedTask>(() => {
    if (props.task) return props.task as ResolvedTask
    return (
      ctx.tasks.value.find((t) => t.id === input.value.id) ??
      normalizeTask(input.value, rowId.value, order.value)
    )
  })

  const overlapping = computed(
    () => (ctx.rows.value[resolved.value.order]?.laneCount ?? 1) > 1,
  )

  const rowTop = (o: number) => ctx.rows.value[o]?.top ?? o * ctx.config.value.rowHeight

  const baseLeft = computed(() => ctx.dateToX(resolved.value.start))

  // Drag & drop: the original stays put; a live preview drives a translucent ghost.
  const { dragging, enabled: draggable, preview, previewLabel, onPointerDown } = useGanttDrag({
    resolved,
    baseLeft,
  })

  // Vertical band per overlap mode (lanes/cascade offset handled by the context).
  const rowStyle = computed(() => {
    const band = ctx.taskBand(resolved.value)
    return { top: `${band.top}px`, height: `${band.height}px` }
  })

  const left = baseLeft
  const width = computed(() => ctx.widthBetween(resolved.value.start, resolved.value.end))

  // Geometry of the drag ghost (precise x; row-snapped y), or null when idle.
  const ghost = computed(() => {
    const p = preview.value
    if (!p) return null
    return {
      left: ctx.dateToX(p.start),
      width: ctx.widthBetween(p.start, p.end),
      translateY: rowTop(p.order) - rowTop(resolved.value.order),
    }
  })

  return {
    ctx,
    resolved,
    rowStyle,
    left,
    width,
    dragging,
    draggable,
    onPointerDown,
    ghost,
    previewLabel,
    overlapping,
  }
}
