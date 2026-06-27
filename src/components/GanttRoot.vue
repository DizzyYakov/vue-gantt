<script setup lang="ts">
import {
  addDays,
  endOfDay,
  endOfHour,
  endOfMinute,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  max as maxDate,
  min as minDate,
  startOfDay,
  startOfHour,
  startOfMinute,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from 'date-fns'
import { computed, onMounted, onUnmounted, provide, reactive, ref, toRef, watch } from 'vue'
import { useGanttAutoscroll } from '../composables/useGanttAutoscroll'
import { useGanttLink } from '../composables/useGanttLink'
import { useGanttScale } from '../composables/useGanttScale'
import { useGanttRegistry } from '../composables/useTaskRegistry'
import { triangleArrow } from '../arrowHeads'
import { GANTT_CONTEXT, GANTT_DEFAULTS, normalizeRow, toDate } from '../context'
import { elbowPath } from '../dependencyPaths'
import { conflictSegments, layoutGroups, type GroupMeta } from '../layout'
import { addDependency, applyMove, removeDependency, updateTask } from '../utils'
import type {
  GanttBand,
  GanttCellEvent,
  GanttColumn,
  GanttColumnEvent,
  GanttConfig,
  GanttConflict,
  GanttContext,
  GanttDependencyChange,
  GanttDependencyEvent,
  GanttDependencyUpdate,
  GanttEventMap,
  GanttGroup,
  GanttGroupToggleEvent,
  GanttMoveEvent,
  GanttProgressEvent,
  GanttResizeEvent,
  GanttRootProps,
  GanttRow,
  GanttRowEvent,
  GanttTaskEvent,
  GanttUnit,
  GanttViewport,
  ResolvedGroup,
  ResolvedRow,
  ResolvedTask,
} from '../types'

const props = withDefaults(defineProps<GanttRootProps>(), {
    rows: undefined,
    unit: GANTT_DEFAULTS.unit,
    tiers: undefined,
    columnWidth: GANTT_DEFAULTS.columnWidth,
    groups: undefined,
    rowHeight: GANTT_DEFAULTS.rowHeight,
    headerRowHeight: GANTT_DEFAULTS.headerRowHeight,
    groupHeaderHeight: GANTT_DEFAULTS.groupHeaderHeight,
    sidebarWidth: GANTT_DEFAULTS.sidebarWidth,
    overlap: GANTT_DEFAULTS.overlap,
    draggable: GANTT_DEFAULTS.draggable,
    rowMovable: GANTT_DEFAULTS.rowMovable,
    resizable: GANTT_DEFAULTS.resizable,
    progressDraggable: GANTT_DEFAULTS.progressDraggable,
    linkable: GANTT_DEFAULTS.linkable,
    dependencyShape: elbowPath,
    arrowHead: triangleArrow,
    snapToGrid: GANTT_DEFAULTS.snapToGrid,
    dragLabelFormat: GANTT_DEFAULTS.dragLabelFormat,
    dragLabel: undefined,
    startDate: undefined,
    endDate: undefined,
    today: undefined,
    labelFormat: undefined,
  },
)

const emit = defineEmits<{
  move: [event: GanttMoveEvent]
  resize: [event: GanttResizeEvent]
  progress: [event: GanttProgressEvent]
  /** `v-model:rows` — emitted with the rows after applying a task change. */
  'update:rows': [rows: GanttRow[]]
  'group-toggle': [event: GanttGroupToggleEvent]
  'dependency-create': [event: GanttDependencyChange]
  'dependency-remove': [event: GanttDependencyChange]
  'dependency-update': [event: GanttDependencyUpdate]
  'task-click': [event: GanttTaskEvent]
  'task-dblclick': [event: GanttTaskEvent]
  'task-contextmenu': [event: GanttTaskEvent]
  'milestone-click': [event: GanttTaskEvent]
  'milestone-dblclick': [event: GanttTaskEvent]
  'milestone-contextmenu': [event: GanttTaskEvent]
  'row-click': [event: GanttRowEvent]
  'row-dblclick': [event: GanttRowEvent]
  'row-contextmenu': [event: GanttRowEvent]
  'cell-click': [event: GanttCellEvent]
  'cell-dblclick': [event: GanttCellEvent]
  'column-click': [event: GanttColumnEvent]
  'dependency-click': [event: GanttDependencyEvent]
}>()

// `v-model:rows` convenience layer (additive — runs alongside the controlled
// events, never replaces them). Only active when `rows` is prop-driven; in
// declarative mode (`<GanttRow>`) there is no `rows` model to update.
function emitModelUpdate(apply: (rows: GanttRow[]) => GanttRow[]): void {
  if (props.rows) emit('update:rows', apply(props.rows))
}

// Bubble child interactions up as the matching chart event. Components call this
// via the context so prop-driven `<Gantt>` consumers can listen at the root.
function dispatch<K extends keyof GanttEventMap>(name: K, payload: GanttEventMap[K]): void {
  ;(emit as (n: string, p: unknown) => void)(name, payload)
  // Mirror dependency edits into `v-model:rows`.
  if (name === 'dependency-create') {
    const p = payload as GanttDependencyChange
    emitModelUpdate((rows) => addDependency(rows, p.from, p.to))
  } else if (name === 'dependency-remove') {
    const p = payload as GanttDependencyChange
    emitModelUpdate((rows) => removeDependency(rows, p.from, p.to))
  } else if (name === 'dependency-update') {
    const p = payload as GanttDependencyUpdate
    emitModelUpdate((rows) =>
      addDependency(removeDependency(rows, p.previous.from, p.previous.to), p.from, p.to),
    )
  }
}

const {
  registerGroup,
  unregisterGroup,
  registerRow,
  unregisterRow,
  registerTask,
  unregisterTask,
  rows: registeredRows,
  groups: registeredGroups,
} = useGanttRegistry()

// Coarse → fine ranking, used to order tier rows and pick base/coarsest tiers.
const TIER_RANK: Record<GanttUnit, number> = {
  year: 0,
  quarter: 1,
  month: 2,
  week: 3,
  day: 4,
  hour: 5,
  minute: 6,
}

// Displayed time-group rows, deduped and ordered coarse → fine.
const tiers = computed<GanttUnit[]>(() => {
  const requested = props.tiers?.length ? props.tiers : [props.unit]
  return [...new Set(requested)].sort((a, b) => TIER_RANK[a] - TIER_RANK[b])
})

// The finest displayed tier drives pixel density; the coarsest snaps the bounds.
const baseUnit = computed<GanttUnit>(() => tiers.value[tiers.value.length - 1] ?? props.unit)
const coarsestUnit = computed<GanttUnit>(() => tiers.value[0] ?? props.unit)

// Live "now" so the today-column highlight stays on the column containing the
// current time — including hours/minutes at fine tiers. Ticks once a minute
// (the finest tier is minute); the red today line keeps its own per-second clock.
const now = ref(new Date())
let nowTimer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  nowTimer = setInterval(() => {
    now.value = new Date()
  }, 60_000)
})
onUnmounted(() => {
  if (nowTimer) clearInterval(nowTimer)
})

const today = computed(() => (props.today ? toDate(props.today) : now.value))

// Single source of truth: the `rows` prop wins; otherwise declarative children.
const sourceRows = computed<GanttRow[]>(() => props.rows ?? registeredRows.value)
const sourceGroups = computed<GanttGroup[]>(() => props.groups ?? registeredGroups.value)

// --- Group collapse state -------------------------------------------------
// Uncontrolled: a user toggle is recorded as an explicit override that wins over
// the group's `collapsed` default; without an override the default applies. This
// is fully derived (no async seeding), so the default takes effect synchronously
// in both prop-driven and declarative (post-mount registration) modes, and
// re-renders / dynamic groups never clobber a user toggle. `toggleGroup` flips
// the override and re-emits as the `group-toggle` event.
const collapseOverrides = reactive(new Map<string, boolean>())

function isCollapsed(group: GanttGroup): boolean {
  return collapseOverrides.get(group.id) ?? group.collapsed ?? false
}

const groupMeta = computed<Map<string, GroupMeta>>(
  () =>
    new Map(
      sourceGroups.value.map((group) => [
        group.id,
        {
          name: group.name ?? group.id,
          collapsed: isCollapsed(group),
          meta: group.meta ?? {},
        },
      ]),
    ),
)

function toggleGroup(id: string): void {
  const group = sourceGroups.value.find((g) => g.id === id)
  const current = group ? isCollapsed(group) : (collapseOverrides.get(id) ?? false)
  collapseOverrides.set(id, !current)
  emit('group-toggle', { id, collapsed: !current })
}

// Resolve rows, then inject group header bands + assign lanes/top/height.
const layout = computed(() =>
  layoutGroups(
    sourceRows.value.map((row, order) => normalizeRow(row, order)),
    {
      mode: props.overlap,
      rowHeight: props.rowHeight,
      groupHeaderHeight: props.groupHeaderHeight,
      groupMeta: groupMeta.value,
    },
  ),
)

const rows = computed<ResolvedRow[]>(() => layout.value.rows)
const groups = computed<ResolvedGroup[]>(() => layout.value.groups)

// All tasks flattened across rows (each carries its row's order + lane).
const tasks = computed<ResolvedTask[]>(() => rows.value.flatMap((row) => row.tasks))

const taskOrder = computed(() => {
  const map = new Map<string, number>()
  for (const task of tasks.value) map.set(task.id, task.order)
  return map
})

const start = computed<Date>(() => {
  if (props.startDate != null) return toDate(props.startDate)
  const starts = tasks.value.map((t) => t.start)
  const base = starts.length ? minDate(starts) : today.value
  return floorToUnit(base, coarsestUnit.value)
})

const end = computed<Date>(() => {
  if (props.endDate != null) return toDate(props.endDate)
  const ends = tasks.value.map((t) => t.end)
  const base = ends.length ? maxDate(ends) : addDays(today.value, 14)
  return ceilToUnit(base, coarsestUnit.value)
})

const scale = useGanttScale({
  unit: baseUnit,
  columnWidth: toRef(props, 'columnWidth'),
  start,
  end,
  today,
  labelFormat: toRef(props, 'labelFormat'),
})

const config = computed<GanttConfig>(() => ({
  unit: baseUnit.value,
  tiers: tiers.value,
  columnWidth: props.columnWidth,
  rowHeight: props.rowHeight,
  headerRowHeight: props.headerRowHeight,
  groupHeaderHeight: props.groupHeaderHeight,
  sidebarWidth: props.sidebarWidth,
  overlap: props.overlap,
  draggable: props.draggable || props.rowMovable,
  rowMovable: props.rowMovable,
  resizable: props.resizable,
  progressDraggable: props.progressDraggable,
  linkable: props.linkable,
  dependencyShape: props.dependencyShape,
  arrowHead: props.arrowHead,
  snapToGrid: props.snapToGrid,
  dragLabelFormat: props.dragLabelFormat,
  dragLabel: props.dragLabel,
  start: start.value,
  end: end.value,
  today: today.value,
}))

// Row lookup by render index (rows are produced in order).
const rowByOrder = computed(() => rows.value)

const contentHeight = computed(() => layout.value.contentHeight)

const CASCADE_OFFSET = 8 // px vertical step between cascaded lanes

// Vertical band a task's bar occupies, depending on the overlap mode.
function taskBand(task: ResolvedTask): GanttBand {
  const row = rowByOrder.value[task.order]
  const top = row ? row.top : task.order * props.rowHeight
  const h = props.rowHeight
  if (props.overlap === 'lanes') {
    return { top: top + task.lane * h, height: h }
  }
  if (props.overlap === 'cascade') {
    const lanes = row ? row.laneCount : 1
    const step = Math.min(CASCADE_OFFSET, lanes > 1 ? (h * 0.4) / (lanes - 1) : 0)
    return { top: top + task.lane * step, height: h - (lanes - 1) * step }
  }
  // overlap / conflict: one shared band.
  return { top, height: h }
}

// --- Viewport + virtualization -------------------------------------------
// The scroll container (the `Gantt` wrapper / a consumer) reports its metrics
// here. Until measured (width/height 0) nothing is virtualized, so primitives
// used without a scroll container still render everything.
const OVERSCAN = 240 // px rendered beyond the viewport on each axis
const MARKER_PAD = 24 // px slack so edge milestones aren't clipped

const viewport = reactive<GanttViewport>({
  scrollLeft: 0,
  scrollTop: 0,
  width: 0,
  height: 0,
})

function setViewport(metrics: Partial<GanttViewport>): void {
  Object.assign(viewport, metrics)
}

const headerHeight = computed(() => tiers.value.length * props.headerRowHeight)

// --- Imperative scroll API ------------------------------------------------
// The scroll container (registered by `GanttView`) lives below the frozen
// sidebar/header in the scroll flow, so a content-x maps to scrollLeft directly
// (the sidebar occupies the first `sidebarWidth` px of the scrollable row).
const scrollerEl = ref<HTMLElement | null>(null)

function setScroller(el: HTMLElement | null): void {
  scrollerEl.value = el
}

// Edge auto-scroll during a drag (move/resize/link): scrolls the viewport toward
// whichever edge the pointer approaches so off-screen destinations are reachable.
// Clamp to the content extent (not `el.scrollWidth/Height`, which a dragged ghost
// inflates by overflowing the body — that would let the scroll run away).
const autoscroll = useGanttAutoscroll(
  () => scrollerEl.value,
  (el) => ({
    x: Math.max(0, props.sidebarWidth + scale.contentWidth.value - el.clientWidth),
    y: Math.max(0, headerHeight.value + contentHeight.value - el.clientHeight),
  }),
)
onUnmounted(() => autoscroll.update(null))

function applyScroll(left: number | undefined, top: number | undefined, behavior: ScrollBehavior): void {
  const el = scrollerEl.value
  if (!el) return
  const x = left == null ? undefined : Math.max(0, left)
  const y = top == null ? undefined : Math.max(0, top)
  if (typeof el.scrollTo === 'function') {
    el.scrollTo({ left: x, top: y, behavior })
  } else {
    // jsdom / older engines: assign directly.
    if (x != null) el.scrollLeft = x
    if (y != null) el.scrollTop = y
  }
}

function leftForDate(date: Date | string | number, align: 'start' | 'center'): number {
  const el = scrollerEl.value
  const x = scale.dateToX(toDate(date))
  if (align === 'center' && el) return x - (el.clientWidth - props.sidebarWidth) / 2
  return x
}

function scrollToDate(date: Date | string | number, options: { behavior?: ScrollBehavior; align?: 'start' | 'center' } = {}): void {
  applyScroll(leftForDate(date, options.align ?? 'start'), undefined, options.behavior ?? 'smooth')
}

function scrollToTask(id: string, options: { behavior?: ScrollBehavior; align?: 'start' | 'center' } = {}): void {
  const task = tasks.value.find((t) => t.id === id)
  if (!task) return
  const row = rowByOrder.value[task.order]
  const top = row ? row.top : task.order * props.rowHeight
  applyScroll(leftForDate(task.start, options.align ?? 'start'), top, options.behavior ?? 'smooth')
}

function scrollToToday(options: { behavior?: ScrollBehavior; align?: 'start' | 'center' } = {}): void {
  scrollToDate(today.value, options)
}

// Visible body-local window on each axis. The frozen sidebar/header offset both
// the content origin and the sticky cover, so those terms cancel out.
const horizontalWindow = computed(() => {
  if (viewport.width <= 0) return null
  const inner = viewport.width - props.sidebarWidth
  return { min: viewport.scrollLeft - OVERSCAN, max: viewport.scrollLeft + inner + OVERSCAN }
})

const verticalWindow = computed(() => {
  if (viewport.height <= 0) return null
  const inner = viewport.height - headerHeight.value
  return { min: viewport.scrollTop - OVERSCAN, max: viewport.scrollTop + inner + OVERSCAN }
})

function rowInWindow(order: number): boolean {
  const win = verticalWindow.value
  if (!win) return true
  const row = rowByOrder.value[order]
  if (!row) return true
  return row.top + row.height >= win.min && row.top <= win.max
}

function bandInWindow(top: number, height: number): boolean {
  const win = verticalWindow.value
  if (!win) return true
  return top + height >= win.min && top <= win.max
}

// Collapsed groups hide their member rows: drop `hidden` rows from every view.
const visibleRows = computed<ResolvedRow[]>(() =>
  rows.value.filter((r) => !r.hidden && rowInWindow(r.order)),
)

const visibleTasks = computed<ResolvedTask[]>(() => {
  const h = horizontalWindow.value
  return tasks.value.filter((t) => {
    const row = rowByOrder.value[t.order]
    if (row?.hidden) return false
    if (!rowInWindow(t.order)) return false
    if (!h) return true
    const x = scale.dateToX(t.start)
    const w = scale.widthBetween(t.start, t.end)
    return x + w >= h.min - MARKER_PAD && x <= h.max + MARKER_PAD
  })
})

const visibleGroups = computed<ResolvedGroup[]>(() =>
  groups.value.filter((g) => bandInWindow(g.top, g.height)),
)

function visibleColumnsFor(tier: GanttUnit): GanttColumn[] {
  const win = horizontalWindow.value
  // Generate only the windowed columns (cheap even for an hour/minute tier over
  // a long range); fall back to the full set when the viewport is unmeasured.
  if (!win) return scale.columnsFor(tier)
  return scale.columnsBetween(tier, win.min, win.max)
}

// Overlapping spans per row (only meaningful in `conflict` mode).
const conflicts = computed<GanttConflict[]>(() => {
  if (props.overlap !== 'conflict') return []
  const out: GanttConflict[] = []
  for (const row of rows.value) {
    for (const seg of conflictSegments(row.tasks)) {
      const x = scale.dateToX(seg.start)
      out.push({ rowId: row.id, order: row.order, x, width: scale.dateToX(seg.end) - x })
    }
  }
  return out
})

// Interactive dependency creation / re-routing (emits intents; data is controlled).
const { linkDraft, beginLink, endLink, refresh: refreshLink } = useGanttLink({
  dispatch,
  tasks: () => tasks.value,
  autoScroll: autoscroll.update,
})

// While auto-scrolling reveals new tasks, re-resolve the link target / endpoint.
watch([() => viewport.scrollLeft, () => viewport.scrollTop], () => refreshLink())

const context: GanttContext = {
  config,
  rows,
  visibleRows,
  groups,
  visibleGroups,
  tasks,
  visibleTasks,
  columns: scale.columns,
  columnsFor: scale.columnsFor,
  visibleColumnsFor,
  contentWidth: scale.contentWidth,
  contentHeight,
  dateToX: scale.dateToX,
  widthBetween: scale.widthBetween,
  xToDate: scale.xToDate,
  snap: scale.snap,
  rowIndexOf: (rowId) => rows.value.findIndex((r) => r.id === rowId),
  rowOf: (taskId) => taskOrder.value.get(taskId) ?? -1,
  taskBand,
  conflicts,
  registerRow,
  unregisterRow,
  registerGroup,
  unregisterGroup,
  toggleGroup,
  registerTask,
  unregisterTask,
  moveTask: (event) => {
    emit('move', event)
    emitModelUpdate((rows) => applyMove(rows, event))
  },
  resizeTask: (event) => {
    emit('resize', event)
    emitModelUpdate((rows) => updateTask(rows, event.id, { start: event.start, end: event.end }))
  },
  progressTask: (event) => {
    emit('progress', event)
    emitModelUpdate((rows) => updateTask(rows, event.id, { progress: event.progress }))
  },
  autoScroll: autoscroll.update,
  linkDraft,
  beginLink,
  endLink,
  dispatch,
  setScroller,
  scrollToDate,
  scrollToTask,
  scrollToToday,
  viewport,
  setViewport,
}

provide(GANTT_CONTEXT, context)

const rootStyle = computed(() => ({
  '--gantt-column-width': `${props.columnWidth}px`,
  '--gantt-row-height': `${props.rowHeight}px`,
  '--gantt-group-header-height': `${props.groupHeaderHeight}px`,
  '--gantt-header-row-height': `${props.headerRowHeight}px`,
  '--gantt-header-height': `${headerHeight.value}px`,
  '--gantt-sidebar-width': `${props.sidebarWidth}px`,
  '--gantt-content-width': `${scale.contentWidth.value}px`,
  '--gantt-content-height': `${contentHeight.value}px`,
}))

function floorToUnit(date: Date, unit: GanttUnit): Date {
  switch (unit) {
    case 'year':
      return startOfYear(date)
    case 'quarter':
      return startOfQuarter(date)
    case 'month':
      return startOfMonth(date)
    case 'week':
      return startOfWeek(date)
    case 'hour':
      return startOfHour(date)
    case 'minute':
      return startOfMinute(date)
    default:
      return startOfDay(date)
  }
}

function ceilToUnit(date: Date, unit: GanttUnit): Date {
  switch (unit) {
    case 'year':
      return endOfYear(date)
    case 'quarter':
      return endOfQuarter(date)
    case 'month':
      return endOfMonth(date)
    case 'week':
      return endOfWeek(date)
    case 'hour':
      return endOfHour(date)
    case 'minute':
      return endOfMinute(date)
    default:
      return endOfDay(date)
  }
}

defineExpose({ rows, tasks, columns: scale.columns, config, scrollToDate, scrollToTask, scrollToToday })
</script>

<template>
  <div class="gantt-root" :data-unit="config.unit" :style="rootStyle">
    <slot :rows="rows" :tasks="tasks" :columns="scale.columns.value" :config="config" />
  </div>
</template>

<style scoped>
.gantt-root {
  position: relative;
  /* Pass a height-constrained ancestor's height down to GanttView so its default
     `height: 100%` (fill) can scroll. Resolves to `auto` under an auto-height
     parent, so the common case still grows to content. */
  height: 100%;
  font: var(--gantt-font, inherit);
  color: var(--gantt-color, inherit);
}
</style>
