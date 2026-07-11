import type { Day, Locale } from 'date-fns'
import type { ComputedRef } from 'vue'
import type { ArrowHeadBuilder } from './arrowHeads'
import type { DependencyPathBuilder } from './dependencyPaths'
import type { NavDirection } from './keyboardNav'

/**
 * A time-axis granularity / "time group". Used both as the pixel-density base
 * (`unit`) and as the set of header rows to display (`tiers`).
 */
export type GanttUnit = 'year' | 'quarter' | 'month' | 'week' | 'day' | 'hour' | 'minute'

/**
 * A named zoom level (view mode): a preset bundle of `tiers` + `columnWidth`
 * density. The `zoom` prop / `GanttZoom` control switch between these.
 */
export interface GanttZoomLevel {
  /** Stable identifier; also the `v-model:zoom` value (e.g. `'week'`). */
  id: string
  /** Display label for the control; defaults to `id`. */
  label?: string
  /** Timeline tiers for this level, coarse→fine (the finest drives density). */
  tiers: GanttUnit[]
  /** Pixel width of one base-unit (finest tier) cell at this level. */
  columnWidth: number
}

/**
 * How timeline column labels are formatted. Either:
 * - a date-fns format string — applied to the **base unit** only (other tiers keep
 *   their defaults);
 * - a per-tier map of date-fns format strings (missing tiers keep their defaults);
 * - a function `(date, tier) => string` returning the label directly (full control).
 */
export type GanttLabelFormat =
  | string
  | Partial<Record<GanttUnit, string>>
  | ((date: Date, tier: GanttUnit) => string)

/** Type of an item plotted on a row. */
export type GanttItemType = 'task' | 'milestone'

/** A single work span of a split task (dates as accepted from the consumer). */
export interface GanttSegment {
  start: Date | string | number
  end: Date | string | number
}

/** A work span after its dates are coerced to `Date`. */
export interface ResolvedSegment {
  start: Date
  end: Date
}

/**
 * Scheduling constraint on a task (MS-Project style). Lower bounds
 * (`*-no-earlier-than`, `must-*-on`) are honored by `autoSchedule` — it pushes the
 * task's start to satisfy them. Upper bounds (`*-no-later-than`) can't be enforced
 * by a forward-only scheduler; they're surfaced as a violation via
 * `violatesConstraint` / the bar's `data-constraint-violation`.
 */
export type GanttConstraintType =
  | 'start-no-earlier-than'
  | 'start-no-later-than'
  | 'finish-no-earlier-than'
  | 'finish-no-later-than'
  | 'must-start-on'
  | 'must-finish-on'

/** A task's scheduling constraint: a type paired with the boundary date. */
export interface GanttConstraint {
  type: GanttConstraintType
  date: Date | string | number
}

/**
 * How tasks that overlap in time on the same row are displayed:
 * - `lanes` — stack overlapping tasks into sub-lanes (the row grows taller);
 * - `overlap` — keep one band; overlapping bars become translucent;
 * - `cascade` — thinner bars offset vertically like stacked cards;
 * - `conflict` — keep full bars; hatch/flag the overlapping span.
 */
export type GanttOverlapMode = 'lanes' | 'overlap' | 'cascade' | 'conflict'

/**
 * How rolled-up rows (WBS tree parents and row groups) draw their summary:
 * - `bracket` — a thin span line with downward end caps toward the children
 *   when expanded, and a filled accent bar (with progress) when collapsed;
 * - `bar` — a plain filled bar with a progress fill in both states (legacy).
 */
export type GanttSummaryStyle = 'bracket' | 'bar'

/**
 * How the timeline axis reacts at its horizontal edges:
 * - `fixed` (default): the axis spans the derived (or explicit) range and never
 *   grows on its own.
 * - `infinite`: scrolling to either edge auto-extends the range by one screen so
 *   the timeline can be panned indefinitely; the scroll position is preserved
 *   when dates are prepended on the left. The `range-change` event fires on every
 *   edge reach in both modes, so a consumer can lazy-load data (or drive its own
 *   `startDate`/`endDate` in `fixed` mode).
 */
export type GanttTimelineMode = 'fixed' | 'infinite'

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
  /** Ids of resources (people/equipment) assigned to this task. */
  resourceIds?: string[]
  type?: GanttItemType
  /**
   * Free-form category tag. In the prop-driven `<Gantt>` render it selects a
   * per-variant slot — `task-${variant}` for bars, `milestone-${variant}` for
   * markers — falling back to the generic `bar`/`milestone` slot when no such
   * slot is provided. Independent of `type` (which stays the bar/marker
   * discriminator).
   */
  variant?: string
  /**
   * Work segments — when set, the bar is drawn as these spans with paused gaps
   * between them (a "split" task). `start`/`end` still define the overall extent.
   */
  segments?: GanttSegment[]
  /** Target date drawn as a marker; the bar is flagged overdue when `end` passes it. */
  deadline?: Date | string | number
  /** Scheduling constraint (honored by `autoSchedule` for lower bounds). */
  constraint?: GanttConstraint
  /** Planned start (baseline). Drawn as a shadow bar under the actual bar. */
  baselineStart?: Date | string | number
  /** Planned end (baseline). Drawn together with `baselineStart`. */
  baselineEnd?: Date | string | number
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
  /**
   * Id of the parent row, forming a collapsible tree (WBS). Omit for a root row.
   * Rows must be given in pre-order — a parent immediately before its subtree
   * (like `groupId` members must be contiguous). A row's descendants roll up
   * into its summary bar. Tree nesting and flat `groupId` grouping are mutually
   * exclusive: don't mix `parentId` and `groupId` in the same dataset.
   */
  parentId?: string
  /** Initial collapsed state of this row's subtree (uncontrolled). */
  collapsed?: boolean
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

/**
 * A custom timeline period (e.g. a sprint): a horizontal time span drawn as a
 * band over the chart body + a labelled row in the timeline header. Unlike row
 * groups (`GanttGroup`), periods group the *time axis*, not the rows. Build a
 * regular cadence with the `sprintPeriods` helper, or pass your own list.
 */
export interface GanttPeriod {
  /** Stable unique identifier. */
  id: string
  /** Span start (inclusive). */
  start: Date | string | number
  /** Span end (exclusive). */
  end: Date | string | number
  /** Header label. Falls back to `id`. */
  label?: string
  /** Arbitrary extra data forwarded to slots untouched. */
  meta?: Record<string, unknown>
}

/** A period after its dates are coerced and positioned in pixels. */
export interface ResolvedPeriod {
  id: string
  label: string
  start: Date
  end: Date
  /** Left offset in pixels. */
  x: number
  /** Width in pixels. */
  width: number
  /** Zero-based index in order (drives the alternating band fill). */
  index: number
  /** Arbitrary extra data forwarded to slots untouched. */
  meta: Record<string, unknown>
}

/**
 * A resource (person or equipment) a task can be assigned to via
 * `GanttTask.resourceIds`. A flat lookup table passed to the `resources` prop;
 * the library surfaces a task's resolved resources into its bar/milestone slots
 * (rendering — badges, avatars — is up to the consumer). Purely a data model:
 * resources don't add their own lane (a resource swimlane is out of scope).
 */
export interface GanttResource {
  /** Stable unique identifier, referenced by `GanttTask.resourceIds`. */
  id: string
  /** Display name. Falls back to `id`. */
  name?: string
  /** Optional color a slot can use to tint a badge/avatar. */
  color?: string
  /** Arbitrary extra data forwarded to slots untouched. */
  meta?: Record<string, unknown>
}

/** A resource after its name/meta defaults are applied. */
export interface ResolvedResource {
  id: string
  name: string
  color?: string
  meta: Record<string, unknown>
}

/**
 * A reference marker: a single labelled, full-height vertical line at a given
 * date (a quarter boundary, a shared release date, a go-live). Unlike `GanttToday`
 * (pinned to the live clock) it sits on any date, and unlike `GanttDeadlines`
 * (bounded to a task's row) it spans the whole body. Pass a list to the `markers`
 * prop; `GanttMarkers` draws them.
 */
export interface GanttMarker {
  /** Stable unique identifier. */
  id: string
  /** Date the line sits on. */
  date: Date | string | number
  /** Label rendered beside the line. Omit for a bare line. */
  label?: string
  /** Arbitrary extra data forwarded to slots untouched. */
  meta?: Record<string, unknown>
}

/** A marker after its date is coerced and positioned in pixels. */
export interface ResolvedMarker {
  id: string
  /** Label text, or `''` when the marker is a bare line. */
  label: string
  date: Date
  /** Left offset in pixels. */
  x: number
  /** Zero-based index in order. */
  index: number
  /** Arbitrary extra data forwarded to slots untouched. */
  meta: Record<string, unknown>
}

/**
 * A working calendar: which weekdays / dates / spans count as non-working. Passed
 * to the `nonWorking` prop to shade weekends, holidays and custom off periods as a
 * faint background band. Unlike `periods`, it never adds a header row or extends
 * the axis — it only tints time already on the chart.
 */
export interface NonWorkingCalendar {
  /** Weekday numbers (`getDay()`, 0=Sun … 6=Sat) shaded as non-working. Defaults
   *  to `[0, 6]` (Sat/Sun) when the calendar is enabled; pass `[]` to keep only
   *  holidays/periods. */
  weekends?: number[]
  /** Individual non-working dates (holidays). A bare `YYYY-MM-DD` shades that
   *  whole local day. */
  holidays?: (Date | string | number)[]
  /** Arbitrary explicit non-working spans (`end` exclusive). */
  periods?: { id?: string; start: Date | string | number; end: Date | string | number }[]
}

/** A non-working span after its dates are coerced (before pixel positioning). */
export interface NonWorkingBand {
  id: string
  start: Date
  end: Date
}

/** A non-working band positioned in pixels for rendering over the body. */
export interface ResolvedNonWorkingBand extends NonWorkingBand {
  /** Left offset in pixels. */
  x: number
  /** Width in pixels. */
  width: number
}

/** A task after defaults are applied and dates are coerced to `Date`. */
export interface ResolvedTask {
  id: string
  name: string
  start: Date
  end: Date
  progress: number
  dependencies: string[]
  /** Ids of the resources assigned to this task (empty when none). */
  resourceIds: string[]
  type: GanttItemType
  /** Free-form category tag selecting a per-variant slot (absent when not set). */
  variant?: string
  /** Work segments coerced to `Date`s (absent when the task isn't split). */
  segments?: ResolvedSegment[]
  /** Deadline target, coerced to a `Date` (absent when not set). */
  deadline?: Date
  /** Scheduling constraint with its date coerced to a `Date` (absent when not set). */
  constraint?: { type: GanttConstraintType; date: Date }
  /** Planned start, coerced to a `Date` (absent when no baseline). */
  baselineStart?: Date
  /** Planned end, coerced to a `Date` (absent when no baseline). */
  baselineEnd?: Date
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
  /** Id of the parent row in the tree, or '' when the row is a root. */
  parentId: string
  /** Tree depth (0 = root); drives the sidebar indent. */
  depth: number
  /** Whether this row has child rows (drives the chevron + summary bar). */
  hasChildren: boolean
  /** Ids of the direct child rows, in render order. */
  childIds: string[]
  /** Whether this row's own subtree is collapsed. */
  collapsed: boolean
  /** True when the row is hidden by a collapsed group or ancestor (excluded from layout + render). */
  hidden: boolean
  /**
   * Rolled-up extent + aggregate progress across this row's subtree tasks.
   * Present only on parent rows (`hasChildren`); drives the summary bar.
   */
  rollup?: { start: Date; end: Date; progress: number }
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
  /** How rolled-up rows (tree parents, groups) draw their summary. Defaults to `bracket`. */
  summaryStyle?: GanttSummaryStyle
  /** Allow dragging bars along their row to change start/end. */
  draggable?: boolean
  /** Also allow dragging a task into another row (implies dragging). */
  rowMovable?: boolean
  /** Allow resizing bars by dragging their left/right edge. */
  resizable?: boolean
  /** Allow inline-editing the row name (sidebar) and task name (bar) on double-click. */
  editable?: boolean
  /**
   * Enlarge interactive hit areas (resize/progress/connector handles, milestone,
   * dependency handles) for touch. Coarse pointers get the larger targets
   * automatically via `@media (pointer: coarse)`; this prop forces them on regardless
   * (sets `data-touch` on the root). Sizes stay overridable via the `--gantt-*` tokens.
   */
  touchTargets?: boolean
  /** Allow editing a task's progress by dragging a handle on the bar. */
  progressDraggable?: boolean
  /** Show a hover tooltip on bars/milestones (override its content via the `tooltip` slot). */
  tooltip?: boolean
  /** Highlight the tasks on the critical path (`data-critical` on their bars). */
  criticalPath?: boolean
  /** Show each task's free-float slack as a translucent bar after its end. */
  slack?: boolean
  /** Allow creating/editing dependencies by dragging between tasks. */
  linkable?: boolean
  /**
   * Make task bars and milestones keyboard-focusable and operable: each becomes a
   * `role="button"` with `tabindex="0"`, a descriptive `aria-label`, a focus ring,
   * and Enter/Space activation (fires the same `*-click` as a mouse click). The
   * chart root also gets a labelled landmark. Off by default (no tab-order change).
   */
  keyboard?: boolean
  /** Accessible name for the chart landmark (used when `keyboard` is on). Defaults to `'Gantt chart'`. */
  ariaLabel?: string
  /**
   * Connector path builder `(tail, head) => string` (SVG `d`). Pass a built-in
   * (`elbowPath` / `straightPath` / `bezierPath`) or your own. Defaults to
   * `elbowPath`.
   */
  dependencyShape?: DependencyPathBuilder
  /**
   * Arrowhead builder `() => ArrowHeadShape | null`. Pass a built-in
   * (`triangleArrow` / `openArrow` / `noArrow`) or your own. Defaults to
   * `triangleArrow`.
   */
  arrowHead?: ArrowHeadBuilder
  /** Snap dragged dates to the base-unit grid. Off by default (full precision). */
  snapToGrid?: boolean
  /**
   * On a move/resize or a dependency create/update, push finish-to-start
   * successors forward so none starts before a predecessor ends (MS-Project
   * style), preserving each task's duration. Effective only with `v-model:rows`
   * (or prop-driven `rows`) — the cascade is applied to the emitted `update:rows`.
   */
  autoSchedule?: boolean
  /** date-fns format for the live date label shown while dragging. */
  dragLabelFormat?: string
  /** Override the drag tooltip text (move / resize / progress). */
  dragLabel?: (info: GanttDragLabelInfo) => string
  /** Explicit axis bounds. Auto-derived from the tasks when omitted. */
  startDate?: Date | string | number
  endDate?: Date | string | number
  today?: Date | string | number
  /**
   * Timeline edge behaviour (default `'fixed'`). `'infinite'` auto-extends the
   * range by one screen when scrolled to an edge. See `GanttTimelineMode`.
   */
  timelineMode?: GanttTimelineMode
  /**
   * Column label formatting. A date-fns string (base unit only), a per-tier map
   * of format strings, or a `(date, tier) => string` function. See `GanttLabelFormat`.
   */
  labelFormat?: GanttLabelFormat
  /**
   * date-fns `Locale` for date labels (column headers, drag labels, tooltips).
   * Import the locale yourself, e.g. `import { ru } from 'date-fns/locale'`, and
   * pass it here — locales are not bundled by the library.
   */
  locale?: Locale
  /**
   * First day of the week (0 = Sunday … 6 = Saturday). Overrides the `locale`'s
   * own week start; when unset it falls back to the `locale`, then Sunday.
   * Affects week-tier column boundaries, the week `w` number label, and week
   * snapping.
   */
  weekStartsOn?: Day
  /**
   * Named zoom levels (view-mode presets) the `zoom` prop / `GanttZoom` control
   * switch between; each bundles `tiers` + `columnWidth`. Defaults to
   * `DEFAULT_ZOOM_LEVELS` (year → hour).
   */
  zoomLevels?: GanttZoomLevel[]
  /**
   * Custom timeline periods (e.g. sprints): each renders a background band over the
   * chart body + a labelled row in the timeline header. Build a regular cadence with
   * the `sprintPeriods` helper, or pass your own list.
   */
  periods?: GanttPeriod[]
  /**
   * Resources (people / equipment) tasks can be assigned to via
   * `GanttTask.resourceIds`. A flat lookup table; the library resolves each task's
   * resources into its bar/milestone slots (rendering is up to the consumer).
   */
  resources?: GanttResource[]
  /**
   * Reference markers: labelled full-height vertical lines at arbitrary dates
   * (quarter boundaries, release dates). Rendered by `GanttMarkers`. Purely
   * decorative — markers never extend the axis or add a header row.
   */
  markers?: GanttMarker[]
  /**
   * Working calendar: shade non-working time (weekends / holidays / custom off
   * periods) as a faint background band. `true` shades Sat/Sun; pass a
   * `NonWorkingCalendar` for full control. Purely decorative — it never extends
   * the axis or adds a header row.
   */
  nonWorking?: boolean | NonWorkingCalendar
  /**
   * Active zoom level id; supports `v-model:zoom`. When set, the matching level's
   * `tiers`/`columnWidth` override those props. Omit for the classic
   * `tiers`/`columnWidth`/`unit` behavior (no level active).
   */
  zoom?: string
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
  /** How rolled-up rows (tree parents, groups) draw their summary. */
  summaryStyle: GanttSummaryStyle
  /** Whether bars can be dragged along their row. */
  draggable: boolean
  /** Whether bars can be dragged between rows. */
  rowMovable: boolean
  /** Whether bars can be resized by dragging an edge. */
  resizable: boolean
  /** Whether row/task names can be inline-edited on double-click. */
  editable: boolean
  /** Whether interactive hit areas are enlarged for touch (also auto on coarse pointers). */
  touchTargets: boolean
  /** Whether progress can be edited by dragging a handle. */
  progressDraggable: boolean
  /** Whether a hover tooltip is shown on bars/milestones. */
  tooltip: boolean
  /** Whether critical-path tasks are highlighted. */
  criticalPath: boolean
  /** Whether free-float slack bars are shown. */
  slack: boolean
  /** Whether dependencies can be created/edited by dragging. */
  linkable: boolean
  /** Whether bars/milestones are keyboard-focusable and operable (a11y layer). */
  keyboard: boolean
  /** Accessible name for the chart landmark (used when `keyboard` is on). */
  ariaLabel: string
  /** Connector path builder `(tail, head) => string` (resolved, never undefined). */
  dependencyShape: DependencyPathBuilder
  /** Arrowhead builder `() => ArrowHeadShape | null` (resolved, never undefined). */
  arrowHead: ArrowHeadBuilder
  /** Whether dragged dates snap to the base-unit grid. */
  snapToGrid: boolean
  /** Whether successors are auto-rescheduled on a move/resize/link change. */
  autoSchedule: boolean
  /** date-fns format for the live drag date label. */
  dragLabelFormat: string
  /** date-fns `Locale` applied to all date labels (undefined = English default). */
  locale?: Locale
  /** First day of the week (0 = Sunday … 6 = Saturday); overrides the locale's own. */
  weekStartsOn?: Day
  /** Optional override for the drag tooltip text (move / resize / progress). */
  dragLabel?: (info: GanttDragLabelInfo) => string
  start: Date
  end: Date
  today: Date
  /** Timeline edge behaviour: `fixed` (never grows) or `infinite` (auto-extend). */
  timelineMode: GanttTimelineMode
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

/** Payload emitted when a task is resized by dragging an edge (same row). */
export interface GanttResizeEvent {
  /** Id of the resized task. */
  id: string
  /** New start (after any side-flip + snapping). */
  start: Date
  /** New end. */
  end: Date
  /** The task as it was before the resize. */
  task: ResolvedTask
}

/** Payload emitted when a task's progress is changed by dragging. */
export interface GanttProgressEvent {
  /** Id of the task. */
  id: string
  /** New progress, 0–100. */
  progress: number
  /** The task as it was before the change. */
  task: ResolvedTask
}

/** Payload for an inline task-field edit (e.g. renaming a bar). */
export interface GanttTaskEditEvent {
  /** Id of the edited task. */
  id: string
  /** The changed fields to merge into the task. */
  patch: Partial<GanttTask>
  /** The task as it was before the change. */
  task: ResolvedTask
}

/** Payload for an inline row-field edit (e.g. renaming a sidebar row). */
export interface GanttRowEditEvent {
  /** Id of the edited row. */
  id: string
  /** The changed fields to merge into the row. */
  patch: Partial<GanttRow>
  /** The row as it was before the change. */
  row: ResolvedRow
}

/** Info passed to a `dragLabel` formatter to override the live drag tooltip. */
export interface GanttDragLabelInfo {
  /** Which kind of drag is in progress. */
  mode: 'move' | 'resize' | 'progress'
  /** The task being dragged. */
  task: ResolvedTask
  /** Live start (after move/resize). */
  start: Date
  /** Live end (after move/resize). */
  end: Date
  /** Live progress, 0–100. */
  progress: number
}

/** Payload for creating or removing a finish-to-start dependency. */
export interface GanttDependencyChange {
  /** Predecessor task id (arrow tail). */
  from: string
  /** Successor task id (arrow head; `to.dependencies` holds `from`). */
  to: string
}

/** Payload for re-routing an existing dependency to a new endpoint. */
export interface GanttDependencyUpdate extends GanttDependencyChange {
  /** The dependency as it was before the change. */
  previous: GanttDependencyChange
}

/** Payload emitted when a group is collapsed or expanded. */
export interface GanttGroupToggleEvent {
  /** Id of the toggled group. */
  id: string
  /** The new collapsed state. */
  collapsed: boolean
}

/** Payload emitted when a tree row's subtree is collapsed or expanded. */
export interface GanttRowToggleEvent {
  /** Id of the toggled row. */
  id: string
  /** The new collapsed state. */
  collapsed: boolean
}

/** Payload emitted when the active zoom level changes. */
export interface GanttZoomEvent {
  /** Id of the now-active zoom level. */
  id: string
  /** The full level definition that was activated. */
  level: GanttZoomLevel
}

/**
 * Payload emitted when scrolling reaches a timeline edge. `start`/`end` are the
 * proposed bounds after extending by one screen — already applied when
 * `timelineMode: 'infinite'`, or a suggestion to act on in `fixed` mode (e.g. widen
 * `startDate`/`endDate` and lazy-load data for the newly revealed span).
 */
export interface GanttRangeChangeEvent {
  /** Which edge was reached. */
  side: 'start' | 'end'
  /** Proposed axis start after the extension. */
  start: Date
  /** Proposed axis end after the extension. */
  end: Date
}

/** Payload for pointer interactions on a task bar or milestone marker. */
export interface GanttTaskEvent {
  /** The task/milestone that was interacted with. */
  task: ResolvedTask
  /** The originating DOM event. */
  event: MouseEvent
}

/** Payload for pointer interactions on a sidebar row. */
export interface GanttRowEvent {
  row: ResolvedRow
  event: MouseEvent
}

/** Payload for pointer interactions on an empty body cell (no bar under it). */
export interface GanttCellEvent {
  /** The row whose band was clicked. */
  row: ResolvedRow
  /** The date under the pointer (derived from the x position). */
  date: Date
  event: MouseEvent
}

/** Payload for pointer interactions on a timeline header column. */
export interface GanttColumnEvent {
  column: GanttColumn
  /** The tier (time group) the clicked column belongs to. */
  tier: GanttUnit
  event: MouseEvent
}

/** Payload for pointer interactions on a dependency arrow. */
export interface GanttDependencyEvent {
  /** The predecessor task (arrow tail). */
  from: ResolvedTask
  /** The successor task (arrow head). */
  to: ResolvedTask
  event: MouseEvent
}

/**
 * Every aggregated event the chart can surface, mapped to its payload. Used to
 * type `GanttRoot`/`Gantt`'s `emits` and the context `dispatch` helper that
 * child components call to bubble interactions up to the root.
 */
export interface GanttEventMap {
  'task-click': GanttTaskEvent
  'task-dblclick': GanttTaskEvent
  'task-contextmenu': GanttTaskEvent
  'milestone-click': GanttTaskEvent
  'milestone-dblclick': GanttTaskEvent
  'milestone-contextmenu': GanttTaskEvent
  'row-click': GanttRowEvent
  'row-dblclick': GanttRowEvent
  'row-contextmenu': GanttRowEvent
  'cell-click': GanttCellEvent
  'cell-dblclick': GanttCellEvent
  'column-click': GanttColumnEvent
  'dependency-click': GanttDependencyEvent
  'dependency-create': GanttDependencyChange
  'dependency-remove': GanttDependencyChange
  'dependency-update': GanttDependencyUpdate
}

/** Kind of problem reported by `validateRows`. */
export type GanttIssueType =
  'duplicate-row-id' | 'duplicate-task-id' | 'missing-dependency' | 'invalid-range' | 'orphan-group'

/** A single data problem found by `validateRows`. */
export interface GanttIssue {
  type: GanttIssueType
  /** Id of the offending row or task. */
  id: string
  /** Human-readable description. */
  message: string
}

/** Options for the imperative scroll helpers. */
export interface GanttScrollOptions {
  /** Scroll animation behavior. Defaults to `smooth`. */
  behavior?: ScrollBehavior
  /** Horizontal alignment of the target within the body. Defaults to `start`. */
  align?: 'start' | 'center'
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

/** Which kind of dependency drag is in progress. */
export type GanttLinkMode = 'create' | 'reroute-head' | 'reroute-tail'

/** Arguments to start a dependency drag (connector handle / arrow endpoint). */
export interface GanttBeginLinkArgs {
  /** The fixed endpoint task id (the anchor that stays put). */
  anchorId: string
  /** Which edge of the anchor the link attaches to. */
  anchorEdge: 'finish' | 'start'
  mode: GanttLinkMode
  /** The existing dependency being re-routed (for reroute modes). */
  link?: GanttDependencyChange
  /** Initial pointer position in client coordinates. */
  pointer: { x: number; y: number }
}

/** Live state of an in-progress dependency drag. */
export interface GanttLinkDraft extends GanttBeginLinkArgs {
  /** Task id under the pointer (a candidate drop target), or `null`. */
  over?: string | null
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
  /** Positioned custom timeline periods (empty unless `periods` is set). */
  periods: ComputedRef<ResolvedPeriod[]>
  /** Resolved resources (empty unless `resources` is set). */
  resources: ComputedRef<ResolvedResource[]>
  /** Resolve a task's assigned resources (unknown ids dropped). */
  resourcesFor: (task: ResolvedTask) => ResolvedResource[]
  /** Positioned reference markers (empty unless `markers` is set). */
  markers: ComputedRef<ResolvedMarker[]>
  /** Positioned non-working bands (empty unless `nonWorking` is set). */
  nonWorking: ComputedRef<ResolvedNonWorkingBand[]>
  /** Ids of the critical-path tasks (empty unless `criticalPath` is on). */
  criticalTasks: ComputedRef<Set<string>>
  /** Free-float slack (days) by task id (empty unless `slack` is on). */
  slack: ComputedRef<Map<string, number>>
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
  /** Collapse/expand a tree row's subtree by id (re-emitted as the `row-toggle` event). */
  toggleRow: (id: string) => void
  /** Register a declaratively-declared task into a row (used by `GanttTask`). */
  registerTask: (task: GanttTask, rowId: string) => void
  /** Remove a previously registered task. */
  unregisterTask: (id: string) => void
  /** Emit a completed drag (called by `GanttTask`/`GanttMilestone`). */
  moveTask: (event: GanttMoveEvent) => void
  /** Emit a completed edge-resize (called by `GanttTask`). */
  resizeTask: (event: GanttResizeEvent) => void
  /** Emit a completed progress drag (called by `GanttTask`). */
  progressTask: (event: GanttProgressEvent) => void
  /** Commit an inline task-field edit (called by `GanttTask`). */
  editTask: (event: GanttTaskEditEvent) => void
  /** Commit an inline row-field edit (called by `GanttTaskList`). */
  editRow: (event: GanttRowEditEvent) => void
  /**
   * Drive edge auto-scroll during a drag: pass the live pointer (client coords)
   * to scroll the viewport toward whichever edge it approaches; pass `null` to
   * stop. Called by the move/resize drag and the dependency link drag.
   */
  autoScroll: (pointer: { x: number; y: number } | null) => void
  /** In-progress dependency drag, or `null` when idle. */
  linkDraft: ComputedRef<GanttLinkDraft | null>
  /** Start a dependency drag (connector handle or arrow endpoint). */
  beginLink: (args: GanttBeginLinkArgs) => void
  /**
   * Finish the in-progress dependency drag. The drop target is resolved from the
   * DOM unless `targetId` is supplied. Emits `dependency-create`/`update` and
   * clears the draft.
   */
  endLink: (targetId?: string | null) => void
  /**
   * Bubble an interaction up to `GanttRoot`, which re-emits it as the matching
   * chart event (so prop-driven `<Gantt>` consumers can listen for clicks on
   * internally-rendered tasks, rows, cells, columns and dependencies).
   */
  dispatch: <K extends keyof GanttEventMap>(name: K, payload: GanttEventMap[K]) => void
  /** Register the scroll container (called by `GanttView`); pass `null` to clear. */
  setScroller: (el: HTMLElement | null) => void
  /** Scroll horizontally so `date` comes into view. No-op without a scroller. */
  scrollToDate: (date: Date | string | number, options?: GanttScrollOptions) => void
  /** Scroll to a task by id (horizontal to its start, vertical to its row). */
  scrollToTask: (id: string, options?: GanttScrollOptions) => void
  /** Scroll to the current time (`today`). */
  scrollToToday: (options?: GanttScrollOptions) => void
  /** Task holding roving keyboard focus (a11y `keyboard` layer), or `null`. */
  keyboardActiveId: ComputedRef<string | null>
  /** Make a task the roving keyboard-focus anchor (called on bar/marker `focus`). */
  setKeyboardActive: (id: string) => void
  /** Move roving keyboard focus in a direction (scrolls the target in + focuses it). */
  moveKeyboardFocus: (direction: NavDirection) => void
  /** Available zoom levels (the `zoomLevels` prop or `DEFAULT_ZOOM_LEVELS`). */
  zoomLevels: ComputedRef<GanttZoomLevel[]>
  /** Id of the active zoom level, or `undefined` when no level is active. */
  activeZoom: ComputedRef<string | undefined>
  /** Whether a finer (`zoomIn`) / coarser (`zoomOut`) level is available. */
  canZoomIn: ComputedRef<boolean>
  canZoomOut: ComputedRef<boolean>
  /** Activate a zoom level by id (re-emitted as `update:zoom` + `zoom-change`). */
  setZoom: (id: string) => void
  /** Step to the next finer / coarser zoom level (clamped at the ends). */
  zoomIn: () => void
  zoomOut: () => void
}
