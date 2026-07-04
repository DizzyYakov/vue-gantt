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
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  provide,
  reactive,
  ref,
  shallowRef,
  toRef,
  watch,
} from 'vue'
import { useGanttAutoscroll } from '../composables/useGanttAutoscroll'
import { useGanttLink } from '../composables/useGanttLink'
import { useGanttScale } from '../composables/useGanttScale'
import { useGanttRegistry } from '../composables/useTaskRegistry'
import { triangleArrow } from '../arrowHeads'
import { GANTT_CONTEXT, GANTT_DEFAULTS, normalizeRow, toDate } from '../context'
import { elbowPath } from '../dependencyPaths'
import { conflictSegments, layoutGroups, type GroupMeta } from '../layout'
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
  GanttZoomLevel,
  ResolvedGroup,
  ResolvedNonWorkingBand,
  ResolvedPeriod,
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
  editable: GANTT_DEFAULTS.editable,
  touchTargets: GANTT_DEFAULTS.touchTargets,
  progressDraggable: GANTT_DEFAULTS.progressDraggable,
  tooltip: GANTT_DEFAULTS.tooltip,
  criticalPath: GANTT_DEFAULTS.criticalPath,
  slack: GANTT_DEFAULTS.slack,
  linkable: GANTT_DEFAULTS.linkable,
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
  zoomLevels: () => DEFAULT_ZOOM_LEVELS,
  zoom: undefined,
  periods: undefined,
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

// Opt-in auto-scheduling: after an interactive edit cascades into `v-model:rows`,
// push `changedId`'s finish-to-start successors forward (preserving durations).
// A no-op (returns the same rows) when off or when nothing needs shifting.
function maybeAutoSchedule(rows: GanttRow[], changedId: string): GanttRow[] {
  return props.autoSchedule ? autoSchedule(rows, changedId) : rows
}

// Bubble child interactions up as the matching chart event. Components call this
// via the context so prop-driven `<Gantt>` consumers can listen at the root.
function dispatch<K extends keyof GanttEventMap>(name: K, payload: GanttEventMap[K]): void {
  ;(emit as (n: string, p: unknown) => void)(name, payload)
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

// --- Zoom / view-mode -----------------------------------------------------
// A zoom level is a preset bundle of `tiers` + `columnWidth`. State is
// uncontrolled-with-v-model: an internal ref seeded from the `zoom` prop and
// kept in sync with it, so `setZoom`/`zoomIn`/`zoomOut` work standalone while
// `v-model:zoom` (or a static `:zoom`) still drives it. When no level is active
// the chart falls back to the raw `tiers`/`columnWidth`/`unit` props (unchanged).
const zoomLevels = computed<GanttZoomLevel[]>(() => props.zoomLevels)
const zoomState = ref<string | undefined>(props.zoom)
watch(
  () => props.zoom,
  zoomId => {
    if (zoomId != null) zoomState.value = zoomId
  },
)
const activeZoom = computed<string | undefined>(() => zoomState.value)
const activeIndex = computed<number>(() =>
  zoomLevels.value.findIndex(level => level.id === activeZoom.value),
)
const activeLevel = computed<GanttZoomLevel | undefined>(() => zoomLevels.value[activeIndex.value])

// The index `zoomIn`/`zoomOut` step from: the active level, or — when none is
// active — the level whose base unit matches the current axis, else the coarsest.
// `canZoomIn`/`canZoomOut` read from the same anchor, so a button's disabled
// state always matches whether a click would move.
const effectiveIndex = computed<number>(() => {
  if (activeIndex.value >= 0) return activeIndex.value
  const byUnit = zoomLevels.value.findIndex(
    level => level.tiers[level.tiers.length - 1] === baseUnit.value,
  )
  return byUnit < 0 ? 0 : byUnit
})
const canZoomIn = computed(() => effectiveIndex.value < zoomLevels.value.length - 1)
const canZoomOut = computed(() => effectiveIndex.value > 0)

function setZoom(id: string): void {
  // Idempotent: re-selecting the active level (e.g. a clamped edge step) is a
  // no-op and emits nothing.
  if (id === zoomState.value) return
  const level = zoomLevels.value.find(candidate => candidate.id === id)
  if (!level) return
  zoomState.value = id
  emit('update:zoom', id)
  emit('zoom-change', { id, level })
}

// Step `delta` levels (coarse→fine ordering: +1 = finer), clamped to the range.
function step(delta: number): void {
  const levels = zoomLevels.value
  const next = Math.min(levels.length - 1, Math.max(0, effectiveIndex.value + delta))
  const target = levels[next]
  if (target) setZoom(target.id)
}
const zoomIn = (): void => step(1)
const zoomOut = (): void => step(-1)

// Displayed time-group rows, deduped and ordered coarse → fine. The active zoom
// level's tiers win; otherwise the `tiers` prop (or `[unit]`).
const tiers = computed<GanttUnit[]>(() => {
  const requested =
    activeLevel.value?.tiers ?? (props.tiers?.length ? props.tiers : [props.unit])
  return [...new Set(requested)].sort((a, b) => TIER_RANK[a] - TIER_RANK[b])
})

// Pixel density: the active zoom level's columnWidth wins over the prop.
const columnWidth = computed<number>(() => activeLevel.value?.columnWidth ?? props.columnWidth)

// The finest displayed tier drives pixel density; the coarsest snaps the bounds.
const baseUnit = computed<GanttUnit>(() => tiers.value[tiers.value.length - 1] ?? props.unit)
const coarsestUnit = computed<GanttUnit>(() => tiers.value[0] ?? props.unit)

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
      sourceGroups.value.map(group => [
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
  const group = sourceGroups.value.find(g => g.id === id)
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
const tasks = computed<ResolvedTask[]>(() => rows.value.flatMap(row => row.tasks))

const taskOrder = computed(() => {
  const map = new Map<string, number>()
  for (const task of tasks.value) map.set(task.id, task.order)
  return map
})

// Range derived from the props/data alone (before any infinite-scroll growth).
const derivedStart = computed<Date>(() => {
  if (props.startDate != null) return toDate(props.startDate)
  // Periods extend the auto range so a sprint before the first task stays visible.
  const starts = [
    ...tasks.value.map(t => t.start),
    ...(props.periods ?? []).map(p => toDate(p.start)),
  ]
  const base = starts.length ? minDate(starts) : today.value
  return floorToUnit(base, coarsestUnit.value)
})

const derivedEnd = computed<Date>(() => {
  if (props.endDate != null) return toDate(props.endDate)
  const ends = [
    ...tasks.value.map(t => t.end),
    ...(props.periods ?? []).map(p => toDate(p.end)),
  ]
  const base = ends.length ? maxDate(ends) : addDays(today.value, 14)
  return ceilToUnit(base, coarsestUnit.value)
})

// Infinite-scroll growth beyond the derived range (null until an edge extends
// it). The effective axis is the derived range widened by these, so `fixed` mode
// (where they stay null) behaves exactly as the plain derived range.
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
  dependencyShape: props.dependencyShape,
  arrowHead: props.arrowHead,
  snapToGrid: props.snapToGrid,
  autoSchedule: props.autoSchedule,
  dragLabelFormat: props.dragLabelFormat,
  locale: props.locale,
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
// The scroll container (registered by `GanttView`) lives below the frozen
// sidebar/header in the scroll flow, so a content-x maps to scrollLeft directly
// (the sidebar occupies the first `sidebarWidth` px of the scrollable row).
const scrollerEl = shallowRef<HTMLElement | null>(null)

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

function applyScroll(
  left: number | undefined,
  top: number | undefined,
  behavior: ScrollBehavior,
): void {
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

function scrollToDate(
  date: Date | string | number,
  options: { behavior?: ScrollBehavior; align?: 'start' | 'center' } = {},
): void {
  applyScroll(leftForDate(date, options.align ?? 'start'), undefined, options.behavior ?? 'smooth')
}

function scrollToTask(
  id: string,
  options: { behavior?: ScrollBehavior; align?: 'start' | 'center' } = {},
): void {
  const task = tasks.value.find(t => t.id === id)
  if (!task) return
  const row = rows.value[task.order]
  const top = row ? row.top : task.order * props.rowHeight
  applyScroll(leftForDate(task.start, options.align ?? 'start'), top, options.behavior ?? 'smooth')
}

function scrollToToday(
  options: { behavior?: ScrollBehavior; align?: 'start' | 'center' } = {},
): void {
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

// --- Timeline edges: emit `range-change` and (in `infinite`) grow the range ---
const EDGE_THRESHOLD = OVERSCAN // px from an edge that counts as "reached"
// Previous edge-zone snapshot, so a reach fires once per entry into a zone (not
// every scroll frame). `null` until the first measured frame — the initial
// position (usually pinned to the left) must not count as a reach.
let previousEdges: { start: boolean; end: boolean } | null = null

// One growth step spans a screenful (falls back to two weeks when unmeasured).
function extensionSpanDays(): number {
  const innerWidth = Math.max(0, viewport.width - props.sidebarWidth)
  const days = innerWidth / scale.pxPerDay.value
  if (days > 0) return days
  return 14
}

function reachStartEdge(): void {
  const proposedStart = floorToUnit(addDays(start.value, -extensionSpanDays()), coarsestUnit.value)
  emit('range-change', { side: 'start', start: proposedStart, end: end.value })
  if (props.timelineMode !== 'infinite') return
  const previousStart = start.value
  extendedStart.value = proposedStart
  // Prepending dates shifts every content-x right by the added width; once the
  // DOM has grown, nudge the scroll by that delta so the view stays anchored.
  nextTick(() => {
    const delta = scale.widthBetween(proposedStart, previousStart)
    applyScroll(viewport.scrollLeft + delta, undefined, 'auto')
  })
}

function reachEndEdge(): void {
  const proposedEnd = ceilToUnit(addDays(end.value, extensionSpanDays()), coarsestUnit.value)
  emit('range-change', { side: 'end', start: start.value, end: proposedEnd })
  if (props.timelineMode !== 'infinite') return
  extendedEnd.value = proposedEnd
}

watch(
  [() => viewport.scrollLeft, () => viewport.width, () => scale.contentWidth.value],
  () => {
    if (viewport.width <= 0) return
    const innerWidth = viewport.width - props.sidebarWidth
    const nearStart = viewport.scrollLeft <= EDGE_THRESHOLD
    const nearEnd = viewport.scrollLeft + innerWidth >= scale.contentWidth.value - EDGE_THRESHOLD
    if (previousEdges) {
      if (nearStart && !previousEdges.start) reachStartEdge()
      if (nearEnd && !previousEdges.end) reachEndEdge()
    }
    previousEdges = { start: nearStart, end: nearEnd }
  },
)

// Dropping back to `fixed` discards any infinite-scroll growth.
watch(
  () => props.timelineMode,
  (mode) => {
    if (mode === 'fixed') {
      extendedStart.value = null
      extendedEnd.value = null
    }
  },
)

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
  nonWorking,
  criticalTasks,
  slack: slackMap,
  registerRow,
  unregisterRow,
  registerGroup,
  unregisterGroup,
  toggleGroup,
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
