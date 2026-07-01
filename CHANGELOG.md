# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 1.0.0 (2026-06-23)


### Features

* data utilities + imperative scroll API ([02b1528](https://github.com/LavaYasha/vue-gantt/commit/02b1528d8cccab8999f29e008144e0ecba96b8d5))
* data utilities + imperative scroll API ([e12debf](https://github.com/LavaYasha/vue-gantt/commit/e12debf93e60341b38d76aa4bea558d1ec49ebc4))
* edge resize + interactive dependencies ([0647c6d](https://github.com/LavaYasha/vue-gantt/commit/0647c6dd9138138de36cfd9ad3f2d0b572ae536e))
* progress drag + live drag tooltip with a formatter ([ece12ec](https://github.com/LavaYasha/vue-gantt/commit/ece12ec1375558860175b9f542ab3f166e505e00))
* row grouping (collapsible groups) + unit test suite ([4bba6f9](https://github.com/LavaYasha/vue-gantt/commit/4bba6f9cba5620cdf758583550cc402202572dae))
* row grouping (collapsible groups) + unit test suite ([aef904f](https://github.com/LavaYasha/vue-gantt/commit/aef904f0db5e7c50314d3cf7d7e700a2eed2a77f))
* row grouping (collapsible groups) + unit test suite ([caadb5d](https://github.com/LavaYasha/vue-gantt/commit/caadb5ddd83c25e608f7219fe4531d8f2dcf54be))
* surface component interaction events as emits ([6207d43](https://github.com/LavaYasha/vue-gantt/commit/6207d43b198667d5bb343b28bf592e986b520b7c))
* surface component interaction events as emits ([764c3fb](https://github.com/LavaYasha/vue-gantt/commit/764c3fbc2ba98026939181c2e2ee616cf5f94b01))


### Bug Fixes

* **deps:** single right-side dot + drag the actual arrow ([b6b9384](https://github.com/LavaYasha/vue-gantt/commit/b6b9384529f07efefb3710a4d250c30f0a3faa7d))
* **deps:** suppress text selection + highlight drop target while linking ([6bc662c](https://github.com/LavaYasha/vue-gantt/commit/6bc662ce69a71bb5c0d5ebe015ee917f9ecf3ade))
* package name ([77e373e](https://github.com/LavaYasha/vue-gantt/commit/77e373ee6667f2c530994aac8707a0d1affa3772))

## [Unreleased]

### Added

- **Task constraints & deadlines.** New `GanttTask` fields: `deadline` (a target date,
  rendered as a per-task vertical line by the new headless `GanttDeadlines` overlay; the
  bar is flagged `data-overdue` when it finishes past it) and `constraint`
  (`{ type: GanttConstraintType; date }`, the full MS-Project set SNET/SNLT/FNET/FNLT/
  MSO/MFO). `autoSchedule` honors the lower bounds (pushes a task's start to satisfy
  `*-no-earlier-than` / `must-*-on`); upper bounds are surfaced as violations
  (`data-constraint-violation`). New exported pure helpers `isOverdue` /
  `violatesConstraint`, the `GanttDeadlines` component and `deadlines` slot, the
  `GanttConstraint` / `GanttConstraintType` types, and `--gantt-deadline-*` /
  `--gantt-overdue-*` / `--gantt-constraint-*` theme tokens.
- **Interactive auto-scheduling** — opt-in `autoSchedule` prop on `Gantt`/`GanttRoot`.
  When on, a move/resize or a dependency create/update pushes the changed task's
  finish-to-start successors forward (preserving durations, MS-Project style) by
  applying the existing `autoSchedule` utility to the emitted `update:rows`. Effective
  only with `v-model:rows` / prop-driven `rows`; the live drag ghost is unaffected
  (successors snap into place on release).
- **Critical path & slack** visualization. Two opt-in props on `Gantt`/`GanttRoot`:
  `criticalPath` highlights the critical-path tasks (a `data-critical` attribute on
  their bars/milestone markers, themed via `--gantt-critical-color` /
  `--gantt-critical-outline`), reusing the existing `criticalPath(rows)` utility;
  `slack` renders each task's free float as a translucent bar from its end to its
  nearest successor's start, via the new headless `GanttSlack` overlay (default
  slot `{ taskId, slack }`, `slack` section slot, `--gantt-slack-*` tokens). The
  new pure `slack(rows): Map<string, number>` utility (free float in days) is
  exported alongside `GanttSlack`.
- `sortRows` / `filterRows` data utilities — pure, immutable helpers to reorder or
  filter `GanttRow[]` by a comparator/predicate (the chart stays controlled: pass
  the result back as `rows`). Build comparators from row data, e.g. `tasksExtent`
  (dates) or `rollupProgress` (progress).
- Per-tier timeline label formatting. The `labelFormat` prop on `Gantt`/`GanttRoot`
  is now a `GanttLabelFormat`: a date-fns `string` (applied to the base unit only,
  as before), a per-tier map `Partial<Record<GanttUnit, string>>` (missing tiers
  keep their defaults), or a `(date, tier) => string` function for full control.
  The `GanttLabelFormat` type is exported from the package.
- Opt-in **hover tooltip** on bars and milestones. Enable it with the `tooltip`
  prop on `Gantt`/`GanttRoot`, or by providing the new scoped `tooltip` slot
  (`{ task }`), which both enables the tooltip and overrides its content. The
  default content is the name plus `start – end` and `progress%` for a bar, or the
  name plus the date for a milestone; it is hidden while dragging. Themeable via
  the new `--gantt-tooltip-bg` / `-color` / `-radius` / `-font-size` / `-shadow`
  CSS variables (which inherit the drag-label look by default).
- **Zoom / view-mode** switching. Named zoom levels (presets bundling `tiers` +
  `columnWidth`) selected by the `zoom` prop with `v-model:zoom`; `zoomLevels`
  overrides the built-in `DEFAULT_ZOOM_LEVELS` (year → hour, exported). State is
  uncontrolled (seeded from `zoom`) — `Gantt`/`GanttRoot` expose imperative
  `setZoom(id)` / `zoomIn()` / `zoomOut()` (and `GanttRoot` `activeZoom`), and emit
  `zoom-change` (`GanttZoomEvent`). A new headless `GanttZoom` control (− / level
  select / +) drives it from inside the chart (e.g. the `corner` slot); its default
  slot exposes `{ levels, active, setZoom, zoomIn, zoomOut, canZoomIn, canZoomOut }`
  for a custom UI. Themeable via `--gantt-zoom-*` variables. The `GanttZoomLevel`
  and `GanttZoomEvent` types are exported.

### Fixed

- Hover tooltip / milestone interaction polish:
  - A dependency arrow crossing a milestone marker no longer swallows the marker's
    pointer events — the marker now sits above the dependency layer, so its
    hover/click/drag (and tooltip) work even under an arrow.
  - The floating hover tooltip is clamped to the chart's content bounds, so a bar
    or milestone tooltip near the right/left edge (e.g. the last column) is no
    longer clipped.

### Release / tooling

- The package is published as **`@dizzy_yakov/vue-gantt`** (scoped, public access).
- `README` with badges + install/usage; `LICENSE` (MIT).
- GitHub Actions `CI` runs the quality gates (oxlint, eslint, unit tests,
  type-check + library build) on pushes to `develop`/`main` and on PRs.
- Automatic versioning via **release-please**: it reads Conventional Commits on
  `main`, keeps a release PR that bumps the version + changelog, and on merge cuts
  a GitHub Release/tag and publishes to npm with provenance (needs `NPM_TOKEN`).

### Added

- **Drag auto-scroll** — while dragging a task (move/resize) or pulling a
  dependency link, the viewport auto-scrolls on both axes when the pointer nears
  an edge of the scroll container, so off-screen drop targets stay reachable. The
  preview (ghost / drop target / draft arrow) keeps following the content;
  scrolling stops on release. No new props — it kicks in automatically whenever
  `draggable`/`rowMovable`/`resizable`/`linkable` is enabled.
- **Progress drag** — drag a handle on the bar to change a task's progress
  (opt-in via `progressDraggable`). Emits a `progress` event (`GanttProgressEvent`);
  the consumer applies it (e.g. `updateTask`). The bar fills live while dragging.
- **Live drag tooltip + formatter** — the move/resize/progress drag tooltip now
  renders for every drag kind and accepts a `dragLabel` formatter
  `(info: GanttDragLabelInfo) => string` that overrides the text (info carries
  `mode` `'move' | 'resize' | 'progress'`, `task`, `start`, `end`, `progress`).
- **Edge resize** — drag a bar's left/right edge to change its `start`/`end`
  (opt-in via `resizable`). Dragging one edge past the other flips the sides
  (the dragged date becomes the opposite boundary). Emits a `resize` event
  (`GanttResizeEvent`); the consumer applies it (e.g. `updateTask`).
- **Interactive dependencies** (opt-in via `linkable`):
  - drag from a task's finish connector to another task → `dependency-create`;
  - drag an existing arrow's endpoint onto another task → `dependency-update`
    (carries the `previous` link);
  - click an arrow → `dependency-remove` (the generic `dependency-click` still
    fires, for custom handling).
  - New `addDependency` / `removeDependency` utils and the `GanttDependencyChange`
    / `GanttDependencyUpdate` types; a `useGanttLink` composable drives the drag.
- **Data utilities** — pure, tree-shakeable helpers over `rows`/`tasks`
  (`src/utils.ts`), exported from the entry, for the boilerplate the controlled
  data model otherwise forces on consumers:
  - edits: `applyMove` (apply the `move` event), `updateTask`, `addTask`,
    `removeTask` — all immutable;
  - lookups: `flattenTasks`, `findTask`, `findRow`;
  - dates/progress: `tasksExtent`, `rollupProgress`;
  - dependencies & scheduling: `getDependents`, `detectCycles`,
    `topologicalOrder`, `criticalPath`, `autoSchedule`;
  - validation: `validateRows` (+ exported `GanttIssue` type).
  The demo now uses `applyMove` instead of a hand-rolled copy.
- **Imperative scroll API** — `scrollToDate` / `scrollToTask` / `scrollToToday`
  on the context and exposed via `defineExpose` on `GanttRoot`/`Gantt` (call
  through a template ref). `GanttView` registers its scroll container; options
  carry `behavior` + `align`. Adds the `GanttScrollOptions` type.
- **Interaction events** — components now surface their pointer interactions both
  on themselves (declarative usage) and aggregated on `GanttRoot`/`Gantt`
  (prop-driven usage), routed through a new `context.dispatch`:
  - `task-click` / `task-dblclick` / `task-contextmenu` (`GanttTask`),
  - `milestone-click` / `milestone-dblclick` / `milestone-contextmenu`
    (`GanttMilestone`),
  - `row-click` / `row-dblclick` / `row-contextmenu` (sidebar, `GanttTaskList`),
  - `cell-click` / `cell-dblclick` (empty body cell → `{ row, date }`,
    `GanttGrid`),
  - `column-click` (timeline header → `{ column, tier }`, `GanttTimeline`),
  - `dependency-click` (arrow → `{ from, to }`, `GanttDependencies`).
  - A click that follows a drag is suppressed (drag ≠ click). New payload types
    (`GanttTaskEvent`, `GanttRowEvent`, `GanttCellEvent`, `GanttColumnEvent`,
    `GanttDependencyEvent`) and a `GanttEventMap` are exported.
- **Row grouping** — an optional third level above rows. Rows referencing the
  same `groupId` (with the `groups` prop carrying labels + initial `collapsed`)
  render under a collapsible header band in the sidebar:
  - new `GanttGroup` (declarative wrapper) and `GanttGroupBar` (body rollup bar)
    components, both exported from the package entry;
  - `layoutGroups` layout helper plus `GroupMeta`, `GroupedLayout` and
    `LayoutGroupsOptions` types;
  - `GANTT_GROUP` injection key and `ResolvedGroup` / `GanttGroup` (data) /
    `GanttGroupToggleEvent` types;
  - uncontrolled collapse state on `GanttRoot` with a `group-toggle` event; a
    collapsed group keeps its header, hides its member rows/bars, and still shows
    a rolled-up summary bar;
  - `--gantt-group-*` theme tokens (header band, indent, rollup bar).
- `--gantt-bar-text-shadow` theme token on the task bar label (default `none`),
  so a theme can give the label a contrasting halo when it straddles a dark
  progress fill and a light track. Applied in the shadcn/ui design-system story.
- Comprehensive unit-test suite across components and composables (grouping,
  conflicts, dependencies, grid, milestone, task list, timeline, today, view,
  context, drag, item, viewport, registry) and expanded layout/`Gantt` specs.
- Demo playground (`src/dev`) example showcasing grouped rows.
- **Configurable dependency rendering** — `dependencyShape` takes a connector path
  builder `(tail, head) => string` (default `elbowPath`) and `arrowHead` takes an
  arrowhead builder `() => ArrowHeadShape | null` (default `triangleArrow`;
  `null` = no head). The built-in builders (`elbowPath`, `straightPath`,
  `bezierPath`, `STUB`; `triangleArrow`, `openArrow`, `noArrow`) and the
  `DependencyPoint` / `DependencyPathBuilder` / `ArrowHeadShape` /
  `ArrowHeadBuilder` types are exported — pass a built-in or your own. Defaults
  preserve the previous look.
- **`conflicts` slot** on `GanttView`/`Gantt` — override the overlap-conflict
  rendering (default `GanttConflicts`). The slot receives a `conflicts:
  GanttConflict[]` scoped prop (per-row overlap segments; empty outside
  `overlap: 'conflict'`). A `Guides/Overlapping tasks → ConflictSlot` story shows
  a custom translucent highlight.
- **`v-model:rows` two-way binding** — an opt-in convenience layer over the
  controlled events. When bound, drag (`move`), edge `resize`, `progress` and
  dependency `create`/`remove`/`update` edits are applied to your data for you
  (via the same immutable utils) and emitted as `update:rows` — no manual
  `@move`/`@resize`/… handlers. The controlled events still fire (pick one
  approach). Prop-driven only; the declarative `<GanttRow>` mode is unaffected,
  and `group-toggle` stays outside the model.
- **Scoped data on `GanttView`/`Gantt` section slots** — every section-override
  slot now receives the reactive data its default component uses, so a custom
  override no longer has to reach into `useGanttContext`: `corner {config}`,
  `timeline {config, visibleColumnsFor}`, `sidebar {rows, groups}`, `grid
  {columns, rows}`, `group-bars {groups}`, `dependencies {tasks}`, `today {today,
  dateToX}`, `body-extra {contentWidth, contentHeight}`. A new `bars {tasks}` slot
  wraps the task-bar / milestone layer so it can be replaced wholesale. The
  `bars` and `group-bars` slots are now also forwarded through the `<Gantt>`
  wrapper (previously only on `GanttView`).

### Changed

- **Default height fills the parent** — with no `height` prop, the chart now sets
  `height: 100%` instead of growing unbounded (`.gantt-root` also stretches so the
  height passes through to the scroll viewport). A height-constrained parent
  therefore gives scrolling + row/column virtualization without an explicit
  `height`; an auto-height parent still collapses to the content height (grows to
  fit, as before). An explicit `height` keeps its previous `max-height` (cap)
  behavior. Behavioral change: if you relied on the chart overflowing a
  fixed-height ancestor, set `height` (or give the ancestor `height: auto`).

### Fixed

- Storybook `Components/Gantt → Multiple Tiers` story no longer opens visually
  empty: the quarter tier snaps the range to the whole quarter, so the sample
  data now spans Apr–Jun and bars are visible from the start.
- Storybook `Components/GanttMilestone` story now showcases milestones inside the
  default viewport (a release plan with GA/Beta/RC markers) instead of reusing
  the shared chart whose only milestone sat off-screen.
- Storybook per-component canvas: removed a 1px sidebar/body misalignment by
  giving `.sb-chart__corner` `box-sizing: border-box` so its `border-bottom` is
  included in the header height.
- shadcn/ui design-system story: task labels were invisible over the near-black
  progress fill; they now use a white halo and stay legible over both the filled
  and empty parts of a bar.
