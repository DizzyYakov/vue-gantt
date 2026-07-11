<script setup lang="ts">
import { addDays, max as maxDate, min as minDate } from 'date-fns'
import { computed, onMounted, onUnmounted, provide, reactive, shallowRef, toRef, watch } from 'vue'
import { useGanttAutoscroll } from '../composables/useGanttAutoscroll'
import { useGanttGroups } from '../composables/useGanttGroups'
import { useGanttRows } from '../composables/useGanttRows'
import { useGanttLink } from '../composables/useGanttLink'
import { useGanttScale } from '../composables/useGanttScale'
import { useGanttScrollApi } from '../composables/useGanttScrollApi'
import { useGanttKeyboardNav } from '../composables/useGanttKeyboardNav'
import { useGanttTimelineEdges } from '../composables/useGanttTimelineEdges'
import { useGanttZoom } from '../composables/useGanttZoom'
import { useGanttRegistry } from '../composables/useTaskRegistry'
import { triangleArrow } from '../arrowHeads'
import { GANTT_CONTEXT, GANTT_DEFAULTS, normalizeRow, toDate } from '../context'
import { ceilToUnit, floorToUnit } from '../dateUnits'
import { elbowPath } from '../dependencyPaths'
import { conflictSegments, layoutGroups, layoutTree } from '../layout'
import {
  addDependency,
  applyMove,
  autoSchedule,
  criticalPath,
  nonWorkingBands,
  removeDependency,
  slack,
  updateRow,
  updateTask,
} from '../utils'
import { DEFAULT_ZOOM_LEVELS } from '../zoom'
import type {
  GanttBand,
  GanttCellEvent,
  GanttCreateEvent,
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
  GanttRowToggleEvent,
  GanttMoveEvent,
  GanttProgressEvent,
  GanttRangeChangeEvent,
  GanttResizeEvent,
  GanttRowEditEvent,
  GanttTaskEditEvent,
  GanttRootProps,
  GanttRow,
  GanttRowEvent,
  GanttTaskEvent,
  GanttUnit,
  GanttViewport,
  GanttZoomEvent,
  ResolvedGroup,
  ResolvedNonWorkingBand,
  ResolvedMarker,
  ResolvedPeriod,
  ResolvedResource,
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
  summaryStyle: GANTT_DEFAULTS.summaryStyle,
  draggable: GANTT_DEFAULTS.draggable,
  rowMovable: GANTT_DEFAULTS.rowMovable,
  resizable: GANTT_DEFAULTS.resizable,
  editable: GANTT_DEFAULTS.editable,
  touchTargets: GANTT_DEFAULTS.touchTargets,
  progressDraggable: GANTT_DEFAULTS.progressDraggable,
  tooltip: GANTT_DEFAULTS.tooltip,
  criticalPath: GANTT_DEFAULTS.criticalPath,
  slack: GANTT_DEFAULTS.slack,
  linkable: GANTT_DEFAULTS.linkable,
  keyboard: GANTT_DEFAULTS.keyboard,
  ariaLabel: GANTT_DEFAULTS.ariaLabel,
  cellCreatable: GANTT_DEFAULTS.cellCreatable,
  dependencyShape: elbowPath,
  arrowHead: triangleArrow,
  snapToGrid: GANTT_DEFAULTS.snapToGrid,
  autoSchedule: GANTT_DEFAULTS.autoSchedule,
  timelineMode: GANTT_DEFAULTS.timelineMode,
  dragLabelFormat: GANTT_DEFAULTS.dragLabelFormat,
  dragLabel: undefined,
  startDate: undefined,
  endDate: undefined,
  today: undefined,
  labelFormat: undefined,
  locale: undefined,
  weekStartsOn: undefined,
  zoomLevels: () => DEFAULT_ZOOM_LEVELS,
  zoom: undefined,
  periods: undefined,
  resources: undefined,
  markers: undefined,
  nonWorking: undefined,
})

const emit = defineEmits<{
  move: [event: GanttMoveEvent]
  resize: [event: GanttResizeEvent]
  progress: [event: GanttProgressEvent]
  'task-edit': [event: GanttTaskEditEvent]
  'row-edit': [event: GanttRowEditEvent]
  /** `v-model:rows` — emitted with the rows after applying a task change. */
  'update:rows': [rows: GanttRow[]]
  /** `v-model:zoom` — emitted with the active zoom level id when it changes. */
  'update:zoom': [id: string]
  'zoom-change': [event: GanttZoomEvent]
  'range-change': [event: GanttRangeChangeEvent]
  'group-toggle': [event: GanttGroupToggleEvent]
  'row-toggle': [event: GanttRowToggleEvent]
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
  'create': [event: GanttCreateEvent]
  'column-click': [event: GanttColumnEvent]
  'dependency-click': [event: GanttDependencyEvent]
}>()

// `v-model:rows` convenience layer (additive — runs alongside the controlled
// events, never replaces them). Only active when `rows` is prop-driven; in
// declarative mode (`<GanttRow>`) there is no `rows` model to update.
function emitModelUpdate(apply: (rows: GanttRow[]) => GanttRow[]): void {
  if (props.rows) emit('update:rows', apply(props.rows))
}

// Opt-in auto-scheduling: after an interactive edit cascades into `v-model:rows`,
// push `changedId`'s finish-to-start successors forward (preserving durations).
// A no-op (returns the same rows) when off or when nothing needs shifting.
function maybeAutoSchedule(rows: GanttRow[], changedId: string): GanttRow[] {
  return props.autoSchedule ? autoSchedule(rows, changedId) : rows
}

// Vue's generated `emit` type is an intersection of per-event call signatures,
// which a generic forward can't satisfy directly; bridge it once to a
// GanttEventMap-keyed dispatcher so `dispatch` stays type-safe at every call site.
const emitEvent = emit as unknown as <K extends keyof GanttEventMap>(
  name: K,
  payload: GanttEventMap[K],
) => void

// Bubble child interactions up as the matching chart event. Components call this
// via the context so prop-driven `<Gantt>` consumers can listen at the root.
function dispatch<K extends keyof GanttEventMap>(name: K, payload: GanttEventMap[K]): void {
  emitEvent(name, payload)
  // Mirror dependency edits into `v-model:rows`.
  if (name === 'dependency-create') {
    const change = payload as GanttDependencyChange
    emitModelUpdate(rows => maybeAutoSchedule(addDependency(rows, change.from, change.to), change.from))
  } else if (name === 'dependency-remove') {
    const change = payload as GanttDependencyChange
    emitModelUpdate(rows => removeDependency(rows, change.from, change.to))
  } else if (name === 'dependency-update') {
    const update = payload as GanttDependencyUpdate
    emitModelUpdate(rows =>
      maybeAutoSchedule(
        addDependency(
          removeDependency(rows, update.previous.from, update.previous.to),
          update.from,
          update.to,
        ),
        update.from,
      ),
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

// Zoom / view-mode + the derived tier list and base/coarsest units the rest of
// the geometry hangs off. Falls back to the raw `tiers`/`columnWidth`/`unit`
// props when no zoom level is active.
const {
  tiers,
  columnWidth,
  baseUnit,
  coarsestUnit,
  zoomLevels,
  activeZoom,
  canZoomIn,
  canZoomOut,
  setZoom,
  zoomIn,
  zoomOut,
} = useGanttZoom({
  zoomLevels: () => props.zoomLevels,
  zoom: () => props.zoom,
  tiers: () => props.tiers,
  unit: () => props.unit,
  columnWidth: () => props.columnWidth,
  onUpdateZoom: id => emit('update:zoom', id),
  onZoomChange: event => emit('zoom-change', event),
})

// Live "now" so the today-column highlight stays on the column containing the
// current time — including hours/minutes at fine tiers. Ticks once a minute
// (the finest tier is minute); the red today line keeps its own per-second clock.
const now = shallowRef(new Date())
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

// Stable anchor for the auto-derived range when the chart is empty, so the
// ticking `now` never drifts the axis under an empty chart (only observable at
// hour/minute coarsest tiers). Captured once; real data derives the range from
// its own tasks/periods, and an explicit `today` prop still anchors it.
const mountTime = new Date()
const emptyRangeAnchor = computed<Date>(() => (props.today ? toDate(props.today) : mountTime))

// Single source of truth: the `rows` prop wins; otherwise declarative children.
const sourceRows = computed<GanttRow[]>(() => props.rows ?? registeredRows.value)
const sourceGroups = computed<GanttGroup[]>(() => props.groups ?? registeredGroups.value)

// Group collapse state (uncontrolled; a user toggle overrides the `collapsed`
// default). Produces the rollup metadata `layoutGroups` needs.
const { groupMeta, toggleGroup } = useGanttGroups({
  sourceGroups: () => sourceGroups.value,
  onToggle: event => emit('group-toggle', event),
})

// Tree-row collapse state (uncontrolled; same model as groups).
const { rowCollapse, toggleRow } = useGanttRows({
  sourceRows: () => sourceRows.value,
  onToggle: event => emit('row-toggle', event),
})

// A `parentId` anywhere switches to the tree layout; otherwise the flat/group
// layout. The two modes are mutually exclusive within a dataset.
const isTree = computed(() => sourceRows.value.some(row => Boolean(row.parentId)))

// Resolve rows, then either build the tree (depth/collapse/rollup) or inject
// group header bands. Both yield `{ rows, groups, contentHeight }`.
const layout = computed(() => {
  const resolved = sourceRows.value.map((row, order) => normalizeRow(row, order))
  if (isTree.value) {
    const tree = layoutTree(resolved, {
      mode: props.overlap,
      rowHeight: props.rowHeight,
      rowCollapse: rowCollapse.value,
    })
    return { rows: tree.rows, groups: [] as ResolvedGroup[], contentHeight: tree.contentHeight }
  }
  return layoutGroups(resolved, {
    mode: props.overlap,
    rowHeight: props.rowHeight,
    groupHeaderHeight: props.groupHeaderHeight,
    groupMeta: groupMeta.value,
  })
})

const rows = computed<ResolvedRow[]>(() => layout.value.rows)
const groups = computed<ResolvedGroup[]>(() => layout.value.groups)

// All tasks flattened across rows (each carries its row's order + lane).
const tasks = computed<ResolvedTask[]>(() => rows.value.flatMap(row => row.tasks))

const taskOrder = computed(() => {
  const map = new Map<string, number>()
  for (const task of tasks.value) map.set(task.id, task.order)
  return map
})

// Range derived from the props/data alone (before any infinite-scroll growth).
// Week-boundary options so the auto range snaps weeks to the locale/`weekStartsOn`.
const weekBoundary = computed(() => ({
  weekStartsOn: props.weekStartsOn,
  locale: props.locale,
}))

const derivedStart = computed<Date>(() => {
  if (props.startDate != null) return toDate(props.startDate)
  // Periods extend the auto range so a sprint before the first task stays visible.
  const starts = [
    ...tasks.value.map(t => t.start),
    ...(props.periods ?? []).map(p => toDate(p.start)),
  ]
  const base = starts.length ? minDate(starts) : emptyRangeAnchor.value
  return floorToUnit(base, coarsestUnit.value, weekBoundary.value)
})

const derivedEnd = computed<Date>(() => {
  if (props.endDate != null) return toDate(props.endDate)
  const ends = [
    ...tasks.value.map(t => t.end),
    ...(props.periods ?? []).map(p => toDate(p.end)),
  ]
  const base = ends.length ? maxDate(ends) : addDays(emptyRangeAnchor.value, 14)
  return ceilToUnit(base, coarsestUnit.value, weekBoundary.value)
})

// Infinite-scroll growth beyond the derived range (null until an edge extends
// it). The effective axis is the derived range widened by these, so `fixed` mode
// (where they stay null) behaves exactly as the plain derived range. Root-owned
// (so the `start`/`end` computeds don't depend on `useGanttTimelineEdges`'s init
// order) but driven by it.
const extendedStart = shallowRef<Date | null>(null)
const extendedEnd = shallowRef<Date | null>(null)

const start = computed<Date>(() => {
  const grown = extendedStart.value
  if (grown && grown < derivedStart.value) return grown
  return derivedStart.value
})

const end = computed<Date>(() => {
  const grown = extendedEnd.value
  if (grown && grown > derivedEnd.value) return grown
  return derivedEnd.value
})

const scale = useGanttScale({
  unit: baseUnit,
  columnWidth,
  start,
  end,
  today,
  labelFormat: toRef(props, 'labelFormat'),
  locale: toRef(props, 'locale'),
  weekStartsOn: toRef(props, 'weekStartsOn'),
})

const config = computed<GanttConfig>(() => ({
  unit: baseUnit.value,
  tiers: tiers.value,
  columnWidth: columnWidth.value,
  rowHeight: props.rowHeight,
  headerRowHeight: props.headerRowHeight,
  groupHeaderHeight: props.groupHeaderHeight,
  sidebarWidth: props.sidebarWidth,
  overlap: props.overlap,
  summaryStyle: props.summaryStyle,
  draggable: props.draggable || props.rowMovable,
  rowMovable: props.rowMovable,
  resizable: props.resizable,
  editable: props.editable,
  touchTargets: props.touchTargets,
  progressDraggable: props.progressDraggable,
  tooltip: props.tooltip,
  criticalPath: props.criticalPath,
  slack: props.slack,
  linkable: props.linkable,
  keyboard: props.keyboard,
  ariaLabel: props.ariaLabel,
  cellCreatable: props.cellCreatable,
  dependencyShape: props.dependencyShape,
  arrowHead: props.arrowHead,
  snapToGrid: props.snapToGrid,
  autoSchedule: props.autoSchedule,
  dragLabelFormat: props.dragLabelFormat,
  locale: props.locale,
  weekStartsOn: props.weekStartsOn,
  dragLabel: props.dragLabel,
  start: start.value,
  end: end.value,
  today: today.value,
  timelineMode: props.timelineMode,
}))

const contentHeight = computed(() => layout.value.contentHeight)

const CASCADE_OFFSET = 8 // px vertical step between cascaded lanes

// Vertical band a task's bar occupies, depending on the overlap mode.
function taskBand(task: ResolvedTask): GanttBand {
  // Row array is indexed by order (rows are produced in order).
  const row = rows.value[task.order]
  const top = row ? row.top : task.order * props.rowHeight
  const height = props.rowHeight
  if (props.overlap === 'lanes') {
    return { top: top + task.lane * height, height }
  }
  if (props.overlap === 'cascade') {
    const lanes = row ? row.laneCount : 1
    const cascadeStep = Math.min(CASCADE_OFFSET, lanes > 1 ? (height * 0.4) / (lanes - 1) : 0)
    return { top: top + task.lane * cascadeStep, height: height - (lanes - 1) * cascadeStep }
  }
  // overlap / conflict: one shared band.
  return { top, height }
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

// Custom timeline periods (sprints), positioned in pixels via the scale.
const periods = computed<ResolvedPeriod[]>(() =>
  (props.periods ?? []).map((period, index) => {
    const start = toDate(period.start)
    const end = toDate(period.end)
    const x = scale.dateToX(start)
    return {
      id: period.id,
      label: period.label ?? period.id,
      start,
      end,
      x,
      width: scale.widthBetween(start, end),
      index,
      meta: period.meta ?? {},
    }
  }),
)

// Resources (people/equipment) tasks can be assigned to. A flat lookup table; the
// `resourcesFor` helper resolves a task's `resourceIds` into these objects.
const resources = computed<ResolvedResource[]>(() =>
  (props.resources ?? []).map(resource => ({
    id: resource.id,
    name: resource.name ?? resource.id,
    color: resource.color,
    meta: resource.meta ?? {},
  })),
)
const resourceById = computed(() => new Map(resources.value.map(resource => [resource.id, resource])))
function resourcesFor(task: ResolvedTask): ResolvedResource[] {
  const byId = resourceById.value
  const out: ResolvedResource[] = []
  for (const id of task.resourceIds) {
    const resource = byId.get(id)
    if (resource) out.push(resource)
  }
  return out
}

// Reference markers (quarter boundaries, release dates), positioned in pixels via
// the scale. Purely decorative — like `nonWorking`, they never extend the axis.
const markers = computed<ResolvedMarker[]>(() =>
  (props.markers ?? []).map((marker, index) => {
    const date = toDate(marker.date)
    return {
      id: marker.id,
      label: marker.label ?? '',
      date,
      x: scale.dateToX(date),
      index,
      meta: marker.meta ?? {},
    }
  }),
)

// Non-working bands (weekends/holidays/off periods), positioned in pixels. Unlike
// `periods` these never extend the axis or add a header row — pure body shading.
const nonWorking = computed<ResolvedNonWorkingBand[]>(() =>
  nonWorkingBands(props.nonWorking ?? false, { start: start.value, end: end.value }).map(band => ({
    ...band,
    x: scale.dateToX(band.start),
    width: scale.widthBetween(band.start, band.end),
  })),
)

// A non-empty `periods` adds a labelled header row above the tiers.
const headerHeight = computed(
  () => (tiers.value.length + (periods.value.length ? 1 : 0)) * props.headerRowHeight,
)

// --- Imperative scroll API ------------------------------------------------
const { scrollerEl, setScroller, applyScroll, scrollToDate, scrollToTask, scrollToToday } =
  useGanttScrollApi({
    dateToX: scale.dateToX,
    sidebarWidth: () => props.sidebarWidth,
    rowHeight: () => props.rowHeight,
    tasks: () => tasks.value,
    rows: () => rows.value,
    today: () => today.value,
  })

// Roving keyboard focus across bars/milestones (a11y `keyboard` layer).
const { keyboardActiveId, setKeyboardActive, moveKeyboardFocus } = useGanttKeyboardNav({
  rows,
  tasks,
  scrollToTask,
  scrollerEl,
})

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
  const row = rows.value[order]
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
  rows.value.filter(r => !r.hidden && rowInWindow(r.order)),
)

const visibleTasks = computed<ResolvedTask[]>(() => {
  const horizontal = horizontalWindow.value
  return tasks.value.filter(t => {
    const row = rows.value[t.order]
    if (row?.hidden) return false
    if (!rowInWindow(t.order)) return false
    if (!horizontal) return true
    const x = scale.dateToX(t.start)
    const width = scale.widthBetween(t.start, t.end)
    return x + width >= horizontal.min - MARKER_PAD && x <= horizontal.max + MARKER_PAD
  })
})

const visibleGroups = computed<ResolvedGroup[]>(() =>
  groups.value.filter(g => bandInWindow(g.top, g.height)),
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
    for (const segment of conflictSegments(row.tasks)) {
      const x = scale.dateToX(segment.start)
      out.push({ rowId: row.id, order: row.order, x, width: scale.dateToX(segment.end) - x })
    }
  }
  return out
})

// Critical-path ids + free-float slack (days) per task. Gated by their props so
// the pure utilities only run when the visualization is on. Both read the source
// model (the controlled `rows` / declarative registration).
const criticalTasks = computed<Set<string>>(() =>
  props.criticalPath ? new Set(criticalPath(sourceRows.value)) : new Set(),
)
const slackMap = computed<Map<string, number>>(() =>
  props.slack ? slack(sourceRows.value) : new Map(),
)

// Interactive dependency creation / re-routing (emits intents; data is controlled).
const { linkDraft, beginLink, endLink, refresh: refreshLink } = useGanttLink({
  dispatch,
  tasks: () => tasks.value,
  autoScroll: autoscroll.update,
})

// While auto-scrolling reveals new tasks, re-resolve the link target / endpoint.
watch([() => viewport.scrollLeft, () => viewport.scrollTop], () => refreshLink())

// Timeline edges: emit `range-change` and (in `infinite` mode) grow the axis via
// the root-owned `extendedStart`/`extendedEnd`.
useGanttTimelineEdges({
  viewport,
  sidebarWidth: () => props.sidebarWidth,
  timelineMode: () => props.timelineMode,
  contentWidth: () => scale.contentWidth.value,
  pxPerDay: () => scale.pxPerDay.value,
  widthBetween: scale.widthBetween,
  start: () => start.value,
  end: () => end.value,
  coarsestUnit: () => coarsestUnit.value,
  weekBoundary: () => weekBoundary.value,
  applyScroll,
  onRangeChange: event => emit('range-change', event),
  edgeThreshold: OVERSCAN,
  extendedStart,
  extendedEnd,
})

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
  rowIndexOf: rowId => rows.value.findIndex(r => r.id === rowId),
  rowOf: taskId => taskOrder.value.get(taskId) ?? -1,
  taskBand,
  conflicts,
  periods,
  resources,
  resourcesFor,
  markers,
  nonWorking,
  criticalTasks,
  slack: slackMap,
  registerRow,
  unregisterRow,
  registerGroup,
  unregisterGroup,
  toggleGroup,
  toggleRow,
  registerTask,
  unregisterTask,
  moveTask: event => {
    emit('move', event)
    emitModelUpdate(rows => maybeAutoSchedule(applyMove(rows, event), event.id))
  },
  resizeTask: event => {
    emit('resize', event)
    emitModelUpdate(rows =>
      maybeAutoSchedule(updateTask(rows, event.id, { start: event.start, end: event.end }), event.id),
    )
  },
  progressTask: event => {
    emit('progress', event)
    emitModelUpdate(rows => updateTask(rows, event.id, { progress: event.progress }))
  },
  editTask: event => {
    emit('task-edit', event)
    emitModelUpdate(rows => updateTask(rows, event.id, event.patch))
  },
  editRow: event => {
    emit('row-edit', event)
    emitModelUpdate(rows => updateRow(rows, event.id, event.patch))
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
  keyboardActiveId,
  setKeyboardActive,
  moveKeyboardFocus,
  zoomLevels,
  activeZoom,
  canZoomIn,
  canZoomOut,
  setZoom,
  zoomIn,
  zoomOut,
  viewport,
  setViewport,
}

provide(GANTT_CONTEXT, context)

const rootStyle = computed(() => ({
  '--gantt-column-width': `${columnWidth.value}px`,
  '--gantt-row-height': `${props.rowHeight}px`,
  '--gantt-group-header-height': `${props.groupHeaderHeight}px`,
  '--gantt-header-row-height': `${props.headerRowHeight}px`,
  '--gantt-header-height': `${headerHeight.value}px`,
  '--gantt-sidebar-width': `${props.sidebarWidth}px`,
  '--gantt-content-width': `${scale.contentWidth.value}px`,
  '--gantt-content-height': `${contentHeight.value}px`,
}))

defineExpose({
  rows,
  tasks,
  columns: scale.columns,
  config,
  scrollToDate,
  scrollToTask,
  scrollToToday,
  activeZoom,
  setZoom,
  zoomIn,
  zoomOut,
})
</script>

<template>
  <div
    class="gantt-root"
    :data-unit="config.unit"
    :data-touch="config.touchTargets || undefined"
    :role="config.keyboard ? 'group' : undefined"
    :aria-label="config.keyboard ? config.ariaLabel : undefined"
    :style="rootStyle"
  >
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
