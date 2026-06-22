import type { ComputedRef } from 'vue'

/**
 * A time-axis granularity / "time group". Used both as the pixel-density base
 * (`unit`) and as the set of header rows to display (`tiers`).
 */
export type GanttUnit = 'year' | 'quarter' | 'month' | 'week' | 'day' | 'hour' | 'minute'

/** Type of an item plotted on a row. */
export type GanttItemType = 'task' | 'milestone'

/**
 * How tasks that overlap in time on the same row are displayed:
 * - `lanes` — stack overlapping tasks into sub-lanes (the row grows taller);
 * - `overlap` — keep one band; overlapping bars become translucent;
 * - `cascade` — thinner bars offset vertically like stacked cards;
 * - `conflict` — keep full bars; hatch/flag the overlapping span.
 */
export type GanttOverlapMode = 'lanes' | 'overlap' | 'cascade' | 'conflict'

/**
 * Task shape accepted from the consumer. A task is a single bar/marker; it lives
 * inside a row. Dates may be `Date` or any string/number that the `Date`
 * constructor understands (e.g. ISO `2026-01-15`).
 */
export interface GanttTask {
  /** Stable unique identifier, used for dependency links. */
  id: string
  /** Bar label. Falls back to `id` when omitted. */
  name?: string
  start: Date | string | number
  /** End date. Optional for milestones (collapsed onto `start`). */
  end?: Date | string | number
  /** Completion percentage, 0–100. */
  progress?: number
  /** Ids of tasks that must finish before this one (drawn as arrows). */
  dependencies?: string[]
  type?: GanttItemType
  /** Arbitrary extra data forwarded to slots untouched. */
  meta?: Record<string, unknown>
}

/**
 * A row is the unit shown in the sidebar and a container for any number of
 * tasks plotted on the same horizontal band.
 */
export interface GanttRow {
  /** Stable unique identifier. */
  id: string
  /** Row label shown in the sidebar. Falls back to `id`. */
  name?: string
  /** The tasks plotted on this row. */
  tasks?: GanttTask[]
  /**
   * Id of the group this row belongs to. Rows sharing a `groupId` are shown
   * under a collapsible group header; members should be contiguous in `rows`.
   */
  groupId?: string
  /** Arbitrary extra data forwarded to slots untouched. */
  meta?: Record<string, unknown>
}

/**
 * A collapsible group of rows shown as a header band in the sidebar. Membership
 * is assigned via `GanttRow.groupId`; this entity carries the label and the
 * initial collapsed state (group order follows the rows' first appearance).
 */
export interface GanttGroup {
  /** Stable unique identifier, referenced by `GanttRow.groupId`. */
  id: string
  /** Header label shown in the sidebar. Falls back to `id`. */
  name?: string
  /** Initial collapsed state. Collapsing hides the member rows + their bars. */
  collapsed?: boolean
  /** Arbitrary extra data forwarded to slots untouched. */
  meta?: Record<string, unknown>
}

/** A task after defaults are applied and dates are coerced to `Date`. */
export interface ResolvedTask {
  id: string
  name: string
  start: Date
  end: Date
  progress: number
  dependencies: string[]
  type: GanttItemType
  meta: Record<string, unknown>
  /** Id of the row this task belongs to. */
  rowId: string
  /** Zero-based index of the owning row in render order. */
  order: number
  /** Sub-lane index within the row (0 unless it overlaps siblings). */
  lane: number
}

/** A row after defaults are applied, its tasks resolved, and laid out. */
export interface ResolvedRow {
  id: string
  name: string
  /** Zero-based row index in render order. */
  order: number
  meta: Record<string, unknown>
  tasks: ResolvedTask[]
  /** Id of the owning group, or '' when the row is ungrouped. */
  groupId: string
  /** True when the row's group is collapsed (excluded from layout + render). */
  hidden: boolean
  /** Number of sub-lanes needed for overlapping tasks (≥1). */
  laneCount: number
  /** Pixel offset of the row's top from the body origin. */
  top: number
  /** Row height in pixels (grows with `laneCount` in `lanes` mode). */
  height: number
}

/** A group after its rows are laid out: a header band + rolled-up task extent. */
export interface ResolvedGroup {
  id: string
  name: string
  /** Zero-based group index in render order. */
  order: number
  meta: Record<string, unknown>
  /** Whether the group is currently collapsed. */
  collapsed: boolean
  /** Pixel offset of the group header band from the body origin. */
  top: number
  /** Header band height in pixels. */
  height: number
  /** Ids of the member rows, in render order. */
  rowIds: string[]
  /** Earliest start across all member tasks (header date for the summary bar). */
  start: Date
  /** Latest end across all member tasks. */
  end: Date
  /** Duration-weighted aggregate progress across member tasks, 0–100. */
  progress: number
}

/** A span on a row where two or more tasks overlap (for `conflict` mode). */
export interface GanttConflict {
  rowId: string
  /** Render index of the owning row. */
  order: number
  /** Left offset in pixels. */
  x: number
  /** Width in pixels. */
  width: number
}

/** Vertical band (top + height, px) a task's bar occupies within the body. */
export interface GanttBand {
  top: number
  height: number
}

/** A single column of the time axis. */
export interface GanttColumn {
  /** Stable key for `v-for`. */
  key: string
  /** Column start date. */
  date: Date
  /** Default formatted label for the column. */
  label: string
  /** Left offset in pixels from the chart origin. */
  x: number
  /** Column width in pixels. */
  width: number
  /** True when the column contains `today`. */
  isToday: boolean
}

/** Props accepted by `GanttRoot` (and forwarded by the `Gantt` wrapper). */
export interface GanttRootProps {
  /** Prop-driven data source. Omit to use declarative `GanttRow`/`GanttTask`. */
  rows?: GanttRow[]
  /**
   * Group metadata (label + initial collapsed state), keyed by id. Optional —
   * rows can reference a `groupId` that isn't listed here and a header is still
   * derived. Order/membership come from the rows' first appearance.
   */
  groups?: GanttGroup[]
  /**
   * Pixel-density base granularity (width of one `columnWidth` cell). When
   * `tiers` is given, the finest tier wins and this is ignored.
   */
  unit?: GanttUnit
  /**
   * Which time-group rows the timeline shows, e.g. `['month','week','day']`.
   * Rendered coarse→fine, top→bottom. Defaults to `[unit]` (single row).
   */
  tiers?: GanttUnit[]
  columnWidth?: number
  rowHeight?: number
  /** Height of a single timeline header row (per tier). */
  headerRowHeight?: number
  /** Height of a group header band, in pixels. Defaults to `rowHeight`. */
  groupHeaderHeight?: number
  /** Width of the frozen task-list sidebar, in pixels. */
  sidebarWidth?: number
  /** How tasks overlapping in time on the same row are displayed. */
  overlap?: GanttOverlapMode
  /** Allow dragging bars along their row to change start/end. */
  draggable?: boolean
  /** Also allow dragging a task into another row (implies dragging). */
  rowMovable?: boolean
  /** Snap dragged dates to the base-unit grid. Off by default (full precision). */
  snapToGrid?: boolean
  /** date-fns format for the live date label shown while dragging. */
  dragLabelFormat?: string
  /** Explicit axis bounds. Auto-derived from the tasks when omitted. */
  startDate?: Date | string | number
  endDate?: Date | string | number
  today?: Date | string | number
  /** date-fns format string for column labels. */
  labelFormat?: string
}

/** Resolved configuration shared with every child component. */
export interface GanttConfig {
  /** The pixel-density base granularity (finest displayed tier). */
  unit: GanttUnit
  /** Time-group rows to render, coarse→fine. */
  tiers: GanttUnit[]
  columnWidth: number
  rowHeight: number
  headerRowHeight: number
  /** Height of a group header band, in pixels. */
  groupHeaderHeight: number
  /** Width of the (frozen) task-list sidebar, in pixels. */
  sidebarWidth: number
  /** How tasks overlapping on the same row are displayed. */
  overlap: GanttOverlapMode
  /** Whether bars can be dragged along their row. */
  draggable: boolean
  /** Whether bars can be dragged between rows. */
  rowMovable: boolean
  /** Whether dragged dates snap to the base-unit grid. */
  snapToGrid: boolean
  /** date-fns format for the live drag date label. */
  dragLabelFormat: string
  start: Date
  end: Date
  today: Date
}

/** Payload emitted when a task is moved via drag & drop. */
export interface GanttMoveEvent {
  /** Id of the moved task. */
  id: string
  /** New start after snapping to the base unit. */
  start: Date
  /** New end (duration preserved). */
  end: Date
  /** Row the task came from. */
  fromRowId: string
  /** Row the task should move into (=`fromRowId` unless `rowMovable`). */
  toRowId: string
  /** The task as it was before the move. */
  task: ResolvedTask
}

/** Payload emitted when a group is collapsed or expanded. */
export interface GanttGroupToggleEvent {
  /** Id of the toggled group. */
  id: string
  /** The new collapsed state. */
  collapsed: boolean
}

/** Scroll/measurement state of the chart's scroll viewport. */
export interface GanttViewport {
  scrollLeft: number
  scrollTop: number
  /** Client width of the scroll container (0 until measured). */
  width: number
  /** Client height of the scroll container (0 until measured). */
  height: number
}

/**
 * The value provided by `GanttRoot` and consumed by every Gantt component
 * through `useGanttContext()`.
 */
export interface GanttContext {
  config: ComputedRef<GanttConfig>
  /** All rows (from the `rows` prop or declarative registration), in render order. */
  rows: ComputedRef<ResolvedRow[]>
  /** Rows intersecting the vertical viewport (all rows when unmeasured). */
  visibleRows: ComputedRef<ResolvedRow[]>
  /** All groups (header bands), in render order. Empty when nothing is grouped. */
  groups: ComputedRef<ResolvedGroup[]>
  /** Group headers intersecting the vertical viewport (all when unmeasured). */
  visibleGroups: ComputedRef<ResolvedGroup[]>
  /** All tasks flattened across rows, each carrying its row's `order`. */
  tasks: ComputedRef<ResolvedTask[]>
  /** Tasks intersecting the viewport (all tasks when unmeasured). */
  visibleTasks: ComputedRef<ResolvedTask[]>
  /** Time-axis columns for the base unit, derived from the config. */
  columns: ComputedRef<GanttColumn[]>
  /** Build the columns for any time group (used to render multi-tier headers). */
  columnsFor: (tier: GanttUnit) => GanttColumn[]
  /** Like `columnsFor`, but limited to the horizontal viewport (virtualized). */
  visibleColumnsFor: (tier: GanttUnit) => GanttColumn[]
  /** Reactive scroll/size state of the chart viewport. */
  viewport: GanttViewport
  /** Report viewport metrics (called by the scroll container). */
  setViewport: (metrics: Partial<GanttViewport>) => void
  /** Total plottable width in pixels. */
  contentWidth: ComputedRef<number>
  /** Total plottable height in pixels (`rows * rowHeight`). */
  contentHeight: ComputedRef<number>
  /** Pixel offset of a date from the chart origin. */
  dateToX: (date: Date | string | number) => number
  /** Pixel width spanned between two dates. */
  widthBetween: (start: Date | string | number, end: Date | string | number) => number
  /** Inverse of `dateToX`. */
  xToDate: (x: number) => Date
  /** Snap a date to the nearest base-unit boundary (used by drag & drop). */
  snap: (date: Date) => Date
  /** Render index of a row id, or -1 when unknown. */
  rowIndexOf: (rowId: string) => number
  /** Row order of the row owning a task id, or -1 when unknown. */
  rowOf: (taskId: string) => number
  /** Vertical band (top + height) a task's bar occupies, per overlap mode. */
  taskBand: (task: ResolvedTask) => GanttBand
  /** Overlap spans per row (non-empty only in `conflict` mode). */
  conflicts: ComputedRef<GanttConflict[]>
  /** Register a declaratively-declared row (used by `GanttRow`). */
  registerRow: (row: GanttRow) => void
  /** Remove a previously registered row. */
  unregisterRow: (id: string) => void
  /** Register a declaratively-declared group (used by `GanttGroup`). */
  registerGroup: (group: GanttGroup) => void
  /** Remove a previously registered group. */
  unregisterGroup: (id: string) => void
  /** Collapse/expand a group by id (re-emitted as the `group-toggle` event). */
  toggleGroup: (id: string) => void
  /** Register a declaratively-declared task into a row (used by `GanttTask`). */
  registerTask: (task: GanttTask, rowId: string) => void
  /** Remove a previously registered task. */
  unregisterTask: (id: string) => void
  /** Emit a completed drag (called by `GanttTask`/`GanttMilestone`). */
  moveTask: (event: GanttMoveEvent) => void
}
