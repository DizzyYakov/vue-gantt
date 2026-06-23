# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Release / tooling

- The package is published as **`@dizzy_yakov/vue-gantt`** (scoped, public access).
- `README` with badges + install/usage; `LICENSE` (MIT).
- GitHub Actions `CI` runs the quality gates (oxlint, eslint, unit tests,
  type-check + library build) on pushes to `develop`/`main` and on PRs.
- Automatic versioning via **release-please**: it reads Conventional Commits on
  `main`, keeps a release PR that bumps the version + changelog, and on merge cuts
  a GitHub Release/tag and publishes to npm with provenance (needs `NPM_TOKEN`).

### Added

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
