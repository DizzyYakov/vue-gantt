# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.3.0](https://github.com/LavaYasha/vue-gantt/compare/vue-gantt-v1.2.0...vue-gantt-v1.3.0) (2026-06-27)


### Features

* auto-scroll the viewport while dragging ([bac5c8c](https://github.com/LavaYasha/vue-gantt/commit/bac5c8c75c002957978c7d9370ea72ca4c384fd0))
* auto-scroll the viewport while dragging ([6cb1443](https://github.com/LavaYasha/vue-gantt/commit/6cb14435590dcba273b296cd29ba3401be54b39b))


### Bug Fixes

* clamp drag auto-scroll to the content, not scrollWidth ([512e8b2](https://github.com/LavaYasha/vue-gantt/commit/512e8b2e8d7407741407c58a2fb0f09de4c05285))
* restore ctx.autoScroll dropped by the develop merge ([1b56f68](https://github.com/LavaYasha/vue-gantt/commit/1b56f685493c92e7c32e9b9872ec460e52ad7223))

## [1.2.0](https://github.com/LavaYasha/vue-gantt/compare/vue-gantt-v1.1.0...vue-gantt-v1.2.0) (2026-06-25)


### Features

* add `bars` slot wrapping the task/milestone layer ([0ed4dd7](https://github.com/LavaYasha/vue-gantt/commit/0ed4dd72c1e710b24c124a5abde933e287f28764))
* add v-model:rows two-way binding ([fa3106e](https://github.com/LavaYasha/vue-gantt/commit/fa3106e23acb16beb19bdb02f5f8bda22aa733fa))
* add v-model:rows two-way binding ([29bd12b](https://github.com/LavaYasha/vue-gantt/commit/29bd12bfcb782d260c5ed53e2cd46cfc4f04efa0))
* configurable dependency connector + arrowhead builders ([a08fe58](https://github.com/LavaYasha/vue-gantt/commit/a08fe5887a3314b255352ce7585e05f5b66725bf))
* configurable dependency connector + arrowhead builders ([8fe6675](https://github.com/LavaYasha/vue-gantt/commit/8fe667570a31911b263c3063201c7d7c67f6e499))
* default chart height fills the parent ([875d8fc](https://github.com/LavaYasha/vue-gantt/commit/875d8fcbca3dca767a9bab29eb089ae17e5c365f))
* default chart height fills the parent ([bad0c1c](https://github.com/LavaYasha/vue-gantt/commit/bad0c1c7417684b0a1b9f31d880c1a1381a016f5))
* expose scoped data on GanttView section slots ([8026cb9](https://github.com/LavaYasha/vue-gantt/commit/8026cb91fa24d7f237fea14c4eb12572c41fdad7))
* expose scoped data on GanttView section slots ([47ae68f](https://github.com/LavaYasha/vue-gantt/commit/47ae68f5eeef0056092c9c1d9e27d0ac5417d74c))


### Bug Fixes

* stretch .gantt-root so default fill height can scroll ([36ac124](https://github.com/LavaYasha/vue-gantt/commit/36ac1248fdfc9fdbd9b9f93983c844982f71a3d5))

## [1.1.0](https://github.com/LavaYasha/vue-gantt/compare/vue-gantt-v1.0.0...vue-gantt-v1.1.0) (2026-06-25)


### Features

* add conflicts slot to GanttView/Gantt ([239dc7a](https://github.com/LavaYasha/vue-gantt/commit/239dc7a7163e0505d8b1a1c7e60c4f85227c1cb1))


### Bug Fixes

* docs img ([4242032](https://github.com/LavaYasha/vue-gantt/commit/4242032977f5749e60a1ba0fe7f2d1210d1ac968))

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
