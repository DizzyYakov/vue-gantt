import { computed, inject } from 'vue'
import { GANTT_ROW, normalizeTask } from '../context'
import type { GanttConstraint, GanttSegment, GanttTask, ResolvedTask } from '../types'
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
  segments?: GanttSegment[]
  deadline?: Date | string | number
  constraint?: GanttConstraint
  baselineStart?: Date | string | number
  baselineEnd?: Date | string | number
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
    segments: props.segments,
    deadline: props.deadline,
    constraint: props.constraint,
    baselineStart: props.baselineStart,
    baselineEnd: props.baselineEnd,
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
      ctx.tasks.value.find(t => t.id === input.value.id) ??
      normalizeTask(input.value, rowId.value, order.value)
    )
  })

  const overlapping = computed(() => (ctx.rows.value[resolved.value.order]?.laneCount ?? 1) > 1)

  // True when the item's row belongs to a collapsed group. Declarative items
  // render themselves (unlike `GanttView`, which only renders `visibleTasks`),
  // so each one must hide while its group is collapsed.
  const hidden = computed(() => ctx.rows.value[resolved.value.order]?.hidden ?? false)

  const rowTop = (o: number) => ctx.rows.value[o]?.top ?? o * ctx.config.value.rowHeight

  const baseLeft = computed(() => ctx.dateToX(resolved.value.start))

  // Drag & drop: the original stays put; a live preview drives a translucent ghost.
  const {
    dragging,
    moved,
    enabled: draggable,
    preview,
    previewLabel,
    onPointerDown,
  } = useGanttDrag({
    resolved,
    baseLeft,
  })

  /** Start an edge-resize drag (from a left/right handle on the bar). */
  function startResize(event: PointerEvent, edge: 'start' | 'end'): void {
    onPointerDown(event, edge === 'start' ? 'resize-start' : 'resize-end')
  }

  /** Start a progress drag (from the progress handle on the bar). */
  function startProgress(event: PointerEvent): void {
    onPointerDown(event, 'progress')
  }

  // Progress to render: the live drag value while dragging, else the resolved one.
  const liveProgress = computed(() => preview.value?.progress ?? resolved.value.progress)

  // Split-task segments as percentages of the bar (`[start, end]`). Progress
  // fills cumulatively through the segments' working time — earlier segments fill
  // first — so the completion "flows" across the working spans (MS-Project style).
  const segmentBars = computed(() => {
    const segs = resolved.value.segments
    if (!segs?.length) return []
    const origin = resolved.value.start.getTime()
    const span = resolved.value.end.getTime() - origin
    if (span <= 0) return []
    const clamp = (n: number) => Math.max(0, Math.min(100, n))
    const totalWork = segs.reduce((sum, s) => sum + Math.max(0, s.end.getTime() - s.start.getTime()), 0)
    const filledWork = (liveProgress.value / 100) * totalWork
    let workBefore = 0
    return segs.map(s => {
      const segStart = s.start.getTime()
      const segWork = Math.max(0, s.end.getTime() - segStart)
      const fill = segWork > 0 ? Math.max(0, Math.min(1, (filledWork - workBefore) / segWork)) : 0
      workBefore += segWork
      return {
        leftPct: clamp(((segStart - origin) / span) * 100),
        widthPct: clamp((segWork / span) * 100),
        progressPct: fill * 100,
      }
    })
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
    // The ghost is positioned relative to the bar's own band (`rowStyle`), whose
    // top already includes any lane/cascade offset. On a pure horizontal move
    // (same row) keep that offset; when crossing into another row, snap the
    // ghost to the target row's top (lane 0) — measuring from the band top, not
    // the row top, so a task in a lower lane/cascade step doesn't land one
    // lane/step too low.
    const bandTop = ctx.taskBand(resolved.value).top
    const translateY = p.order === resolved.value.order ? 0 : rowTop(p.order) - bandTop
    return {
      left: ctx.dateToX(p.start),
      width: ctx.widthBetween(p.start, p.end),
      translateY,
    }
  })

  return {
    ctx,
    resolved,
    rowStyle,
    left,
    width,
    dragging,
    moved,
    draggable,
    onPointerDown,
    startResize,
    startProgress,
    liveProgress,
    segmentBars,
    ghost,
    previewLabel,
    overlapping,
    hidden,
  }
}
