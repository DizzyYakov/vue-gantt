# vue-gantt

[![npm version](https://img.shields.io/npm/v/@dizzy_yakov/vue-gantt.svg)](https://www.npmjs.com/package/@dizzy_yakov/vue-gantt)
[![npm downloads](https://img.shields.io/npm/dm/@dizzy_yakov/vue-gantt.svg)](https://www.npmjs.com/package/@dizzy_yakov/vue-gantt)
[![CI](https://github.com/LavaYasha/vue-gantt/actions/workflows/ci.yml/badge.svg)](https://github.com/LavaYasha/vue-gantt/actions/workflows/ci.yml)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/@dizzy_yakov/vue-gantt)](https://bundlephobia.com/package/@dizzy_yakov/vue-gantt)
[![types](https://img.shields.io/npm/types/@dizzy_yakov/vue-gantt.svg)](https://www.npmjs.com/package/@dizzy_yakov/vue-gantt)
[![license](https://img.shields.io/npm/l/@dizzy_yakov/vue-gantt.svg)](./LICENSE)

A **headless, composable Gantt chart for Vue 3**. It ships only structural
layout — every colour, size and font is a CSS variable — so it drops into any
design system. One runtime dependency (`date-fns`), fully typed.

![vue-gantt](https://raw.githubusercontent.com/LavaYasha/vue-gantt/main/docs/hero.png)

## Features

- ⏱️ **Multi-tier time axis** (year · quarter · month · week · day · hour ·
  minute) — show any subset via `tiers`.
- 📊 Task **bars with progress**, **milestones**, finish-to-start **dependency
  arrows**, **baselines** (planned vs actual), and a live **"today"** line.
- 🧩 **Two APIs** — a prop-driven `<Gantt :rows>` or composable primitives.
- 🗂️ Collapsible **row groups** with rolled-up summary bars, and a deep
  **row tree (WBS)** via `parentId` with per-parent rollup bars.
- 🏷️ **Row decoration** — an add-on `row-suffix` slot for badges, plus a
  `meta` → `data-*` passthrough for CSS-only row highlighting.
- ✋ **Drag interactions** (all opt-in, controlled): move, resize an edge, set
  progress, and create/edit dependencies — with a live, formattable tooltip and
  edge **auto-scroll** to reach drop targets off-screen.
- 🧊 Frozen header + sidebar, sticky period labels, **row/column
  virtualization** (kicks in whenever the scroll viewport is height-constrained —
  by a `height` cap or a fixed-height parent).
- 🎨 **Themeable** through `--gantt-*` CSS variables; ships typed `.d.ts`.

## Install

```sh
bun add @dizzy_yakov/vue-gantt
```

```sh
npm install @dizzy_yakov/vue-gantt
```

```sh
pnpm add @dizzy_yakov/vue-gantt
```

```sh
yarn add @dizzy_yakov/vue-gantt
```

> `vue` `^3.5` is a peer dependency.

Optionally import the default theme (CSS variables); skip it to style from
scratch:

```ts
import '@dizzy_yakov/vue-gantt/styles'
```

## Quick start

Data is two-level: **rows** are the sidebar entries and each row **contains a
list of tasks** plotted on its band (so a row can hold several bars).

```vue
<script setup lang="ts">
import {
  Gantt,
  applyMove,
  type GanttRowData,
  type GanttMoveEvent,
} from '@dizzy_yakov/vue-gantt'
import { ref } from 'vue'
import '@dizzy_yakov/vue-gantt/styles'

const rows = ref<GanttRowData[]>([
  {
    id: 'planning',
    name: 'Planning',
    tasks: [
      {
        id: 'spec',
        name: 'Spec',
        start: '2026-06-01',
        end: '2026-06-08',
        progress: 100,
      },
      {
        id: 'ship',
        name: 'Ship',
        type: 'milestone',
        start: '2026-06-16',
        dependencies: ['design'],
      },
    ],
  },
  {
    id: 'design',
    name: 'Design',
    tasks: [
      {
        id: 'design',
        name: 'Design',
        start: '2026-06-08',
        end: '2026-06-16',
        progress: 70,
        dependencies: ['spec'],
      },
    ],
  },
])

// Drag & drop is controlled — apply the event to your data with the helpers.
const onMove = (e: GanttMoveEvent) => (rows.value = applyMove(rows.value, e))
</script>

<template>
  <Gantt
    :rows="rows"
    :tiers="['month', 'week', 'day']"
    :height="480"
    draggable
    row-movable
    @move="onMove"
  />
</template>
```

## Two ways to provide data

### 1. Prop-driven wrapper

Pass `rows` to `<Gantt>`; it renders the full standard layout and exposes named
slots for overriding any part. Every slot is scoped — its props give you the same
(virtualized) data the default renderer uses, so an override stays in sync.

**Section slots** replace a whole band of the layout:

| Slot           | Scoped props                      | Replaces                            |
| -------------- | --------------------------------- | ----------------------------------- |
| `corner`       | `{ config }`                      | the sidebar/header corner cell      |
| `timeline`     | `{ config, visibleColumnsFor }`   | `<GanttTimeline>` (the axis header) |
| `sidebar`      | `{ rows, groups }`                | `<GanttTaskList>` (the row labels)  |
| `grid`         | `{ columns, rows }`               | `<GanttGrid>` (the body grid)       |
| `non-working`  | `{ bands }`                       | `<GanttNonWorking>` (calendar shading) |
| `period-bands` | `{ periods }`                     | `<GanttPeriods>` (sprint bands)     |
| `bars`         | `{ tasks }`                       | the task bar / milestone layer      |
| `group-bars`   | `{ groups }`                      | `<GanttGroupBar>` (group rollups)   |
| `summary-bars` | `{ rows }`                        | `<GanttSummaryBar>` (row-tree WBS rollups) |
| `conflicts`    | `{ conflicts }`                   | `<GanttConflicts>`                  |
| `baselines`    | `{ tasks }`                       | `<GanttBaselines>` (planned bars)   |
| `slack`        | `{ slack }`                       | `<GanttSlack>` (free-float bars)    |
| `deadlines`    | `{ tasks }`                       | `<GanttDeadlines>` (deadline lines) |
| `dependencies` | `{ tasks }`                       | `<GanttDependencies>`               |
| `today`        | `{ today, dateToX }`              | `<GanttToday>`                      |
| `body-extra`   | `{ contentWidth, contentHeight }` | (extra layer over the body)         |

`visibleColumnsFor` is `(tier: GanttUnit) => GanttColumn[]` (windowed), `dateToX`
is `(date: Date \| string \| number) => number`, `rows`/`groups` are the visible
`ResolvedRow[]` / `ResolvedGroup[]`, `columns` are the visible base-unit
`GanttColumn[]`, `periods` is the resolved `ResolvedPeriod[]` (empty unless the
`periods` prop is set), `bands` is the resolved `ResolvedNonWorkingBand[]` (empty
unless the `nonWorking` prop is set), `tasks` are `ResolvedTask[]` (all of them for
`dependencies`, the plotted/visible ones for `bars`, `baselines` and `deadlines`),
`today` is the configured reference `Date`, `conflicts` is `GanttConflict[]` (empty
unless `overlap: 'conflict'`), and `slack` is a `Map<string, number>` of free-float
days by task id (empty unless `slack` is on).

**Leaf slots** customize a single repeated item: `row`
(`{ row, index, depth, collapsed, hasChildren, toggle }`), `row-suffix`
(same scope minus `toggle` — an add-on rendered *after* the row name without
replacing `row`; see [Row decoration](#row-decoration)), `group`
(`{ group, collapsed, toggle }`), `groupBar` (`{ group }`), `summaryBar`
(`{ row }` — a WBS parent row, see [row tree](#row-tree-wbs)), `column`
(`{ column, tier }`), `period` (`{ period }`), `bar` (`{ task, progress }`), `milestone` (`{ task }`),
`tooltip` (`{ task }`), `rowEditor` (`{ row, value, commit, cancel }`) and
`taskEditor` (`{ task, value, commit, cancel }`).

**Per-variant item slots.** Tag an item with a free-form `variant` and the
prop-driven render picks a slot by it: a bar looks for `task-${variant}`
(`{ task, progress }`), a marker for `milestone-${variant}` (`{ task }`). When no
such slot is provided it falls back to the generic `bar` / `milestone` slot, then
to the built-in default — so variants are purely additive. Handy for rendering
categories (design vs. dev bars, release vs. checkpoint markers) differently:

```vue
<Gantt :rows="rows">
  <!-- rows include e.g. { id, start, end, variant: 'design' } and a { type: 'milestone', variant: 'release' } -->
  <template #task-design="{ task }">🎨 {{ task.name }}</template>
  <template #milestone-release="{ task }">🚀 {{ task.name }}</template>
  <template #bar="{ task }">{{ task.name }}</template> <!-- fallback for un-tagged / other bars -->
</Gantt>
```

The `rowEditor` / `taskEditor` slots replace the built-in inline `<input>` (see
[Inline editing](#inline-editing)) with your own editor — a `<select>`, a masked
field, etc. They render only while that row/task is being edited (`editable`
must be on). `value` is the current name; call `commit(newValue)` to save (fires
`row-edit` / `task-edit`) or `cancel()` to discard.

The `tooltip` slot overrides the content of the opt-in hover tooltip shown on
bars and milestones; providing it also **enables** the tooltip (you don't need
the `tooltip` prop too). Its `task` is the resolved task under the pointer. When
the tooltip is enabled without the slot, the default content is the name plus
`start – end` (and `progress%`) for a bar, or the name plus the date for a
milestone. The tooltip is hidden while a drag is in progress.

```vue
<Gantt :rows="rows" :tiers="['month', 'week', 'day']" :height="480">
  <!-- the `today` slot gets the reference date + a positioning helper -->
  <template #today="{ today, dateToX }">
    <div class="my-today" :style="{ left: `${dateToX(today)}px` }" />
  </template>
</Gantt>
```

### 2. Declarative composition

`<GanttRoot>` provides the shared scale/config; drop the feature components into
its slots. `<GanttRow>` declares a row and the `<GanttTask>` / `<GanttMilestone>`
inside it register into that row.

```vue
<GanttRoot :tiers="['month', 'week', 'day']">
  <GanttTimeline />
  <GanttTaskList />
  <GanttGroup id="be" name="Backend">
    <GanttRow id="api" name="API">
      <GanttTask id="spec" name="Spec" start="2026-06-01" end="2026-06-08" :progress="100" />
      <GanttMilestone id="ship" name="Ship" start="2026-06-16" :dependencies="['spec']" />
    </GanttRow>
  </GanttGroup>
  <GanttGroupBar />
  <GanttDependencies />
  <GanttToday />
</GanttRoot>
```

## Components

Every component is exported from the package entry. `<Gantt>` and `<GanttRoot>`
take the full [configuration props](#configuration-props-ganttrootprops) and emit
every [chart event](#events); the rest are the building blocks.

| Component             | Props                                            | Emits                                            |
| --------------------- | ------------------------------------------------ | ------------------------------------------------ |
| `<Gantt>`             | `GanttRootProps` + `height?: number \| string`   | all [events](#events) · exposes `scrollTo*`      |
| `<GanttRoot>`         | `GanttRootProps`                                 | all [events](#events) · exposes `scrollTo*`      |
| `<GanttView>`         | `height?: number \| string`                      | —                                                |
| `<GanttTimeline>`     | —                                                | `column-click`                                   |
| `<GanttTaskList>`     | —                                                | `row-click` · `row-dblclick` · `row-contextmenu` |
| `<GanttGroup>`        | `id` · `name?` · `collapsed?` · `meta?`          | — (toggle bubbles as `group-toggle` on the root) |
| `<GanttGroupBar>`     | —                                                | —                                                |
| `<GanttRow>`          | `id` · `name?` · `tasks?` · `groupId?` · `parentId?` · `collapsed?` · `meta?` | — (toggle bubbles as `row-toggle` on the root) |
| `<GanttSummaryBar>`   | —                                                | —                                                |
| `<GanttTask>`         | `GanttItemProps`                                 | `click` · `dblclick` · `contextmenu`             |
| `<GanttMilestone>`    | `GanttItemProps`                                 | `click` · `dblclick` · `contextmenu`             |
| `<GanttGrid>`         | `tier?: GanttUnit`                               | `cell-click` · `cell-dblclick`                   |
| `<GanttNonWorking>`   | — (default slot `{ band }`)                      | —                                                |
| `<GanttDependencies>` | —                                                | `dependency-click`                               |
| `<GanttConflicts>`    | —                                                | —                                                |
| `<GanttSlack>`        | — (default slot `{ taskId, slack }`)             | —                                                |
| `<GanttDeadlines>`    | — (default slot `{ taskId, deadline }`)          | —                                                |
| `<GanttBaselines>`    | — (default slot `{ task }`)                      | —                                                |
| `<GanttPeriods>`      | — (default slot `{ period }`)                    | —                                                |
| `<GanttToday>`        | `interval?: number` (ms, default `1000`)         | —                                                |
| `<GanttZoom>`         | — (reads context; default slot for custom UI)    | — (calls `setZoom`/`zoomIn`/`zoomOut` on root)   |

The leaf components emit short names for **declarative** use (`<GanttTask @click>`).
The same interactions are re-emitted, namespaced, on `<GanttRoot>` / `<Gantt>`
(`task-click`, `milestone-click`, …) so **prop-driven** consumers can listen at
the root — see [Events](#events).

**`height` (`<Gantt>` / `<GanttView>`)** — a number is treated as pixels, a
string is used verbatim. When set, it **caps** the scroll viewport (`max-height`)
and enables vertical scrolling + row virtualization. When **omitted**, the chart
fills its parent's height (`height: 100%`): a height-constrained parent gives
scrolling + virtualization without an explicit `height`, while an auto-height
parent collapses to the content height and simply grows to fit (as before).

### Configuration props (`GanttRootProps`)

| Prop                    | Type                                              | Default         | Description                                                                                                                                                                                                                                                   |
| ----------------------- | ------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rows`                  | `GanttRowData[]`                                  | —               | Prop-driven data source (omit for declarative `<GanttRow>`).                                                                                                                                                                                                  |
| `groups`                | `GanttGroupData[]`                                | —               | Group labels + initial `collapsed`, keyed by `id`.                                                                                                                                                                                                            |
| `unit`                  | `GanttUnit`                                       | `'day'`         | Base granularity when `tiers` is omitted.                                                                                                                                                                                                                     |
| `tiers`                 | `GanttUnit[]`                                     | `[unit]`        | Header rows, coarse → fine, e.g. `['month','week','day']`.                                                                                                                                                                                                    |
| `columnWidth`           | `number`                                          | `40`            | Width of one base-unit cell, px.                                                                                                                                                                                                                              |
| `zoomLevels`            | `GanttZoomLevel[]`                                | `DEFAULT_ZOOM_LEVELS` | Named view-mode presets the `zoom` prop / `GanttZoom` switch between; each bundles `tiers` + `columnWidth` (year → hour).                                                                                                                                |
| `periods`               | `GanttPeriod[]`                                   | —               | Custom timeline periods (sprints): a background band over the body + a labelled header row. Build a cadence with `sprintPeriods` or pass your own list. See [Timeline period bands](#timeline-period-bands-sprints).                                            |
| `nonWorking`            | `boolean \| NonWorkingCalendar`                   | —               | Working calendar: shade non-working time (weekends/holidays/custom off periods) as a background band. `true` shades Sat/Sun. Purely decorative — never extends the axis or adds a header row. See [Non-working calendar](#non-working-calendar).              |
| `zoom`                  | `string`                                          | —               | Active zoom level id; supports `v-model:zoom`. When set, the matching level's `tiers`/`columnWidth` override those props. Omit for the classic `tiers`/`columnWidth`/`unit` behavior.                                                                          |
| `rowHeight`             | `number`                                          | `36`            | Row height, px.                                                                                                                                                                                                                                               |
| `headerRowHeight`       | `number`                                          | `28`            | Height of one timeline tier row, px.                                                                                                                                                                                                                          |
| `groupHeaderHeight`     | `number`                                          | `36`            | Group header band height, px.                                                                                                                                                                                                                                 |
| `sidebarWidth`          | `number`                                          | `200`           | Frozen task-list width, px.                                                                                                                                                                                                                                   |
| `overlap`               | `'lanes' \| 'overlap' \| 'cascade' \| 'conflict'` | `'lanes'`       | How time-overlapping tasks in a row are shown.                                                                                                                                                                                                                |
| `draggable`             | `boolean`                                         | `false`         | Drag bars along their row to change start/end.                                                                                                                                                                                                                |
| `rowMovable`            | `boolean`                                         | `false`         | Drag a task into another row (implies `draggable`).                                                                                                                                                                                                           |
| `resizable`             | `boolean`                                         | `false`         | Resize bars by dragging an edge (sides flip past each other).                                                                                                                                                                                                 |
| `progressDraggable`     | `boolean`                                         | `false`         | Edit progress by dragging a handle on the bar.                                                                                                                                                                                                                |
| `editable`              | `boolean`                                         | `false`         | Inline-edit the row name (sidebar) and task name (bar label) on double-click (or a long-press on touch). Enter/blur commits, Esc cancels; empty/unchanged is ignored. Surfaces `row-edit`/`task-edit` (and syncs `v-model:rows`).                              |
| `tooltip`               | `boolean`                                         | `false`         | Show a hover tooltip on bars/milestones — a tap toggles it on touch (override its content via the `tooltip` slot).                                                                                                                                            |
| `touchTargets`          | `boolean`                                         | `false`         | Enlarge interactive hit areas (resize/progress/connector handles, milestones, dependency handles) for touch. Coarse pointers get the larger targets automatically via `@media (pointer: coarse)`; this forces them on regardless (adds `data-touch` to the root). Sizes stay overridable via the `--gantt-*` tokens. |
| `criticalPath`          | `boolean`                                         | `false`         | Highlight the tasks on the critical path (`data-critical` on their bars/markers; styled via `--gantt-critical-*`).                                                                                                                                            |
| `slack`                 | `boolean`                                         | `false`         | Draw each task's free-float slack as a translucent bar after its end (the `<GanttSlack>` overlay; styled via `--gantt-slack-*`).                                                                                                                               |
| `linkable`              | `boolean`                                         | `false`         | Create/edit dependencies by dragging between tasks.                                                                                                                                                                                                           |
| `dependencyShape`       | `(tail, head) => string`                          | `elbowPath`     | Connector path builder. Pass `elbowPath`/`straightPath`/`bezierPath` or your own.                                                                                                                                                                             |
| `arrowHead`             | `() => ArrowHeadShape \| null`                    | `triangleArrow` | Arrowhead builder. Pass `triangleArrow`/`openArrow`/`noArrow` or your own (`null` = no head).                                                                                                                                                                 |
| `snapToGrid`            | `boolean`                                         | `false`         | Snap dragged dates to the base unit (off = full precision).                                                                                                                                                                                                   |
| `autoSchedule`          | `boolean`                                         | `false`         | On a move/resize or a dependency create/update, push finish-to-start successors forward so none starts before a predecessor ends (MS-Project style), preserving each task's duration. Effective only with `v-model:rows` (or prop-driven `rows`).             |
| `dragLabelFormat`       | `string`                                          | `'d MMM HH:mm'` | date-fns format for the live drag tooltip.                                                                                                                                                                                                                    |
| `dragLabel`             | `(info: GanttDragLabelInfo) => string`            | —               | Override the drag tooltip text (move/resize/progress).                                                                                                                                                                                                        |
| `startDate` / `endDate` | `Date \| string \| number`                        | auto            | Explicit axis bounds (auto-derived from tasks otherwise).                                                                                                                                                                                                     |
| `timelineMode`          | `'fixed' \| 'infinite'`                           | `'fixed'`       | Edge behaviour. `infinite` auto-extends the range by one screen when you scroll to an edge (anchoring the scroll on the left). Both modes emit `range-change` at an edge — see [Timeline range](#timeline-range-infinite-scroll).                              |
| `today`                 | `Date \| string \| number`                        | now             | The "today" reference.                                                                                                                                                                                                                                        |
| `labelFormat`           | `GanttLabelFormat`                                | per tier        | Column label formatting. A date-fns `string` (base unit only — other tiers keep defaults), a per-tier map `Partial<Record<GanttUnit, string>>`, or a `(date, tier) => string` function (full control). E.g. `{ month: 'LLLL yyyy', week: "'W'w", day: 'd' }`. |
| `locale`                | `Locale` (date-fns)                               | English         | date-fns locale for all date labels (headers, drag labels, tooltips). See [Localization](#localization-i18n).                                                                                                                                                  |
| `weekStartsOn`          | `Day` (date-fns, `0`–`6`)                          | from `locale`, else `0` | First day of the week (`0`=Sunday … `6`=Saturday). Overrides the `locale`'s own week start. Affects week-tier column boundaries, the week `w` number label, and week snapping. See [Localization](#localization-i18n).                                        |

### Item props (`GanttItemProps`, for `<GanttTask>` / `<GanttMilestone>`)

Declarative fields — the item registers into the enclosing `<GanttRow>`:

| Prop           | Type                       | Description                                    |
| -------------- | -------------------------- | ---------------------------------------------- |
| `id`           | `string`                   | Stable id (used by dependencies).              |
| `name`         | `string`                   | Bar/marker label (falls back to `id`).         |
| `start`        | `Date \| string \| number` | Start date (`YYYY-MM-DD` is parsed local).     |
| `end`          | `Date \| string \| number` | End date (ignored for milestones).             |
| `progress`     | `number`                   | Completion 0–100.                              |
| `dependencies` | `string[]`                 | Ids of predecessors (finish-to-start).         |
| `variant`      | `string`                   | Free-form category → per-variant slot (above). |
| `segments`     | `GanttSegment[]`           | Work spans with paused gaps (a "split" task).  |
| `deadline`     | `Date \| string \| number` | Target date (drawn as a line; flags overdue).  |
| `constraint`   | `GanttConstraint`          | Scheduling constraint (`{ type, date }`).      |
| `baselineStart`| `Date \| string \| number` | Planned start (baseline). Needs `baselineEnd`. |
| `baselineEnd`  | `Date \| string \| number` | Planned end (baseline). Needs `baselineStart`. |
| `meta`         | `Record<string, unknown>`  | Arbitrary data forwarded to slots.             |
| `rowId`        | `string`                   | Explicit row id (overrides the enclosing row). |

> `<GanttTask :task>` / `<GanttMilestone :task>` also accept an already-resolved
> task — this is how `<Gantt>` renders bars internally.

#### Split tasks (`segments`)

A task can carry `segments` — an array of `{ start, end }` work spans. When set,
the bar renders as those spans with **paused gaps** between them (a "split" task):
a thin connecting line bridges the gaps, and each span is drawn as its own segment
inside the single bar. The task's own `start`/`end` still define the overall
extent; the segments are drawn within it.

```vue
<GanttTask
  id="build"
  name="Build"
  start="2026-06-01"
  end="2026-06-20"
  :progress="55"
  :segments="[
    { start: '2026-06-01', end: '2026-06-06' },
    { start: '2026-06-10', end: '2026-06-14' },
    { start: '2026-06-17', end: '2026-06-20' },
  ]"
/>
```

Prop-driven, the same field lives on the task:

```ts
{ id: 'build', name: 'Build', start: '2026-06-01', end: '2026-06-20', progress: 55,
  segments: [
    { start: '2026-06-01', end: '2026-06-06' },
    { start: '2026-06-10', end: '2026-06-14' },
    { start: '2026-06-17', end: '2026-06-20' },
  ] }
```

Progress on a split bar is **cumulative**: the task's overall `progress` is spread
across the segments' combined working duration, so the fill "flows" through the
work spans — earlier segments fill first (MS-Project style). Drag/resize still move
the whole task (its `start`/`end`); the segments are purely visual. The raw
`GanttSegment` and coerced `ResolvedSegment` (`{ start: Date; end: Date }`) types
are both exported. Style the split bits with the `--gantt-split-*`
[variables](#css-variables).

> While a drag is in progress (move/resize via `draggable`/`rowMovable`/`resizable`,
> or linking via `linkable`), the viewport **auto-scrolls** on both axes when the
> pointer nears an edge of the scroll container — so you can drop a bar or land a
> dependency arrow on a target outside the current view. The preview (ghost / drop
> target / draft arrow) keeps following the content, and scrolling stops on release.
> This is automatic; there are no extra props.

### Deadlines & constraints

Give a task a `deadline` (a target date) or a scheduling `constraint` and the
chart reflects both automatically:

- **`deadline`** — `<GanttDeadlines>` (rendered by default; override via the
  `deadlines` slot) draws a vertical line at the date across the task's band. When
  the task's `end` passes the deadline the bar is flagged **overdue**
  (`data-overdue`), tinted and outlined via the `--gantt-overdue-*` /
  `--gantt-deadline-color` tokens.
- **`constraint`** — a `{ type, date }` where `type` is a `GanttConstraintType`:
  `'start-no-earlier-than'`, `'start-no-later-than'`, `'finish-no-earlier-than'`,
  `'finish-no-later-than'`, `'must-start-on'` or `'must-finish-on'`. Lower-bound
  types (`*-no-earlier-than`, `must-*-on`) are honored by [`autoSchedule`](#utilities),
  which pushes the task's start so the bound is met (duration preserved). Upper
  bounds can't be enforced by the forward-only scheduler, so a breach is surfaced
  instead: the bar gets `data-constraint-violation` (dashed `--gantt-constraint-*`
  outline).

```ts
const rows = [
  {
    id: 'delivery',
    name: 'Delivery',
    tasks: [
      {
        id: 'build',
        name: 'Build',
        start: '2026-06-01',
        end: '2026-06-20',
        deadline: '2026-06-15', // end > deadline → overdue bar + line
        constraint: { type: 'start-no-earlier-than', date: '2026-06-03' },
      },
    ],
  },
]
```

The pure detectors [`isOverdue(task)`](#utilities) (`end > deadline`) and
[`violatesConstraint(task)`](#utilities) (upper/exact bound breached) are exported
so you can flag or filter tasks yourself; they take a `ResolvedTask` (or the
matching `end`/`deadline` / `start`/`end`/`constraint` subset).

### Events

All drag events are **controlled**: the chart emits an intent, you apply it to
your data (the [utilities](#utilities) make this one-liners).

| Event                          | Payload                                      | Fired when                                             |
| ------------------------------ | -------------------------------------------- | ------------------------------------------------------ |
| `move`                         | `GanttMoveEvent`                             | a bar is dragged (start/end, possibly a new row).      |
| `resize`                       | `GanttResizeEvent`                           | a bar edge is dragged.                                 |
| `progress`                     | `GanttProgressEvent`                         | the progress handle is dragged.                        |
| `task-edit`                    | `GanttTaskEditEvent`                         | a bar label is inline-edited (`editable`).             |
| `row-edit`                     | `GanttRowEditEvent`                          | a sidebar row name is inline-edited (`editable`).      |
| `update:rows`                  | `GanttRowData[]`                             | a task/dependency change is applied (`v-model:rows`).  |
| `update:zoom`                  | `string`                                     | the active zoom level changes (`v-model:zoom`).        |
| `zoom-change`                  | `GanttZoomEvent`                             | the active zoom level changes (carries the level).     |
| `range-change`                 | `GanttRangeChangeEvent`                      | a scroll reaches a timeline edge (both `timelineMode`s).  |
| `group-toggle`                 | `GanttGroupToggleEvent`                      | a group is collapsed/expanded.                         |
| `row-toggle`                   | `GanttRowToggleEvent`                        | a tree row's ([WBS](#row-tree-wbs)) subtree is collapsed/expanded. |
| `dependency-create`            | `GanttDependencyChange`                      | a link is dragged from one task to another.            |
| `dependency-update`            | `GanttDependencyUpdate`                      | an arrow endpoint is re-routed (carries `previous`).   |
| `dependency-remove`            | `GanttDependencyChange`                      | an arrow is clicked (when `linkable`).                 |
| `task-*` / `milestone-*`       | `GanttTaskEvent` `{ task, event }`           | `click` / `dblclick` / `contextmenu` on a bar/marker.  |
| `row-*`                        | `GanttRowEvent` `{ row, event }`             | `click` / `dblclick` / `contextmenu` on a sidebar row. |
| `cell-click` / `cell-dblclick` | `GanttCellEvent` `{ row, date, event }`      | an empty body cell is clicked.                         |
| `column-click`                 | `GanttColumnEvent` `{ column, tier, event }` | a timeline header cell is clicked.                     |
| `dependency-click`             | `GanttDependencyEvent` `{ from, to, event }` | an arrow is clicked.                                   |

Payload shapes (all exported as types):

```ts
interface GanttMoveEvent {
  id: string
  start: Date
  end: Date
  fromRowId: string
  toRowId: string
  task: ResolvedTask
}
interface GanttResizeEvent {
  id: string
  start: Date
  end: Date
  task: ResolvedTask
}
interface GanttProgressEvent {
  id: string
  progress: number
  task: ResolvedTask
}
interface GanttTaskEditEvent {
  id: string
  patch: Partial<GanttTask> // changed fields to merge (e.g. `{ name }`)
  task: ResolvedTask
}
interface GanttRowEditEvent {
  id: string
  patch: Partial<GanttRow> // changed fields to merge (e.g. `{ name }`)
  row: ResolvedRow
}
interface GanttGroupToggleEvent {
  id: string
  collapsed: boolean
}
interface GanttRowToggleEvent {
  id: string
  collapsed: boolean
}
interface GanttDependencyChange {
  from: string
  to: string
}
interface GanttDependencyUpdate extends GanttDependencyChange {
  previous: GanttDependencyChange
}
interface GanttDragLabelInfo {
  mode: 'move' | 'resize' | 'progress'
  task: ResolvedTask
  start: Date
  end: Date
  progress: number
}
interface GanttZoomLevel {
  id: string // stable id; also the v-model:zoom value
  label?: string // control label (defaults to id)
  tiers: GanttUnit[] // timeline tiers, coarse → fine
  columnWidth: number // base-unit cell width, px
}
interface GanttZoomEvent {
  id: string
  level: GanttZoomLevel
}
interface GanttRangeChangeEvent {
  side: 'start' | 'end'
  start: Date
  end: Date
}
```

### Two-way binding (`v-model:rows`)

`v-model:rows` is a convenience layer over the controlled events on `<Gantt>` and
`<GanttRoot>`. It pairs the existing `rows` prop with an `update:rows` emit: when
a drag change (`move` / `resize` / `progress`), an inline edit (`row-edit` /
`task-edit` via `editable`) or a dependency edit (`dependency-create` /
`dependency-remove` / `dependency-update`) happens, the component applies it to
your data with the same immutable [utilities](#utilities) (`applyMove` /
`updateTask` / `updateRow` / `addDependency` / `removeDependency`) and emits
`update:rows` with the new array — so the chart stays in sync without a manual
handler.

```vue
<Gantt v-model:rows="rows" draggable resizable progress-draggable editable linkable />
```

This works **only** in prop-driven mode (when `rows` is passed); in declarative
mode (`<GanttRow>` without `rows`) there is nothing to update, so `update:rows`
is not emitted. `group-toggle` is **not** part of the model — it is a view-state
change, not a task-data change.

The plain controlled events (`@move`, `@resize`, `@progress`, `@row-edit`,
`@task-edit`, `@dependency-*`) are still emitted alongside `update:rows`. Choose
**one** approach: use `v-model:rows` for automatic sync, or the manual events to
apply changes yourself (`updateRow` / `updateTask` for the inline edits) —
combining both double-applies each change.

### Undo / redo (`useGanttHistory`)

`useGanttHistory(rows)` adds undo/redo over the same `rows` ref you bind to
`v-model:rows`. Every reassignment is recorded as a snapshot — each drag / resize /
progress / link edit goes through one `update:rows`, so one user action is one
history entry. It returns `{ undo, redo, canUndo, canRedo, clear }`.

```vue
<script setup>
import { ref } from 'vue'
import { Gantt, useGanttHistory } from '@dizzy_yakov/vue-gantt'

const rows = ref(initialRows)
const { undo, redo, canUndo, canRedo } = useGanttHistory(rows)
</script>

<template>
  <button :disabled="!canUndo" @click="undo">Undo</button>
  <button :disabled="!canRedo" @click="redo">Redo</button>
  <Gantt v-model:rows="rows" draggable resizable progress-draggable linkable />
</template>
```

- `undo()` / `redo()` restore a snapshot back into the ref without recording it; a
  fresh edit after an undo drops the redo tail.
- `canUndo` / `canRedo` are `ComputedRef<boolean>` — wire them to your buttons'
  `:disabled`.
- `clear()` drops all history, keeping the current value as the only entry.
- `useGanttHistory(rows, { limit })` caps the stack size, dropping the oldest
  snapshots (default: unlimited).

Snapshots are cheap: the edit [utilities](#utilities) are immutable, so entries
share structure — no deep clone. The composable is pure and context-free (no
`GanttRoot`, SSR-safe). Keyboard shortcuts are yours to wire — e.g. bind Ctrl+Z /
Ctrl+Shift+Z to `undo` / `redo`.

### Auto-scheduling

The `autoSchedule` prop turns the chart into an MS-Project-style scheduler: when
you move or resize a task, or create / re-route a dependency, every finish-to-start
successor is pushed forward so none starts before its predecessor ends — each
task's duration is preserved. It cascades transitively (a → b → c), so dragging
`a` later also shifts `b` and `c`.

```vue
<Gantt v-model:rows="rows" auto-schedule draggable resizable linkable />
```

It is built on top of the exported [`autoSchedule(rows, changedId?)`](#utilities)
utility, applied to the emitted `update:rows`. So it is effective **only** in
prop-driven / `v-model:rows` mode; in the purely event-driven flow (`@move` +
your own `applyMove`, no `v-model`) and in declarative mode (`<GanttRow>` children)
the prop is a no-op — call `autoSchedule` yourself where you apply the change.
`dependency-remove` and progress edits do **not** trigger the cascade. The live
drag preview (ghost) does not show the cascade; successors snap into place on
release.

<h3 id="inline-editing">Inline editing</h3>

The `editable` prop turns on inline renaming: **double-click** a row name in the
sidebar or a bar's label in the body to open an inline `<input>`. **Enter** or
**blur** commits, **Esc** cancels; an empty or unchanged value is ignored. Like
every other interaction the edit is **controlled** — the chart emits an intent and
you apply it:

- `row-edit` → `GanttRowEditEvent { id, patch: Partial<GanttRow>, row }`
- `task-edit` → `GanttTaskEditEvent { id, patch: Partial<GanttTask>, task }`

With `v-model:rows` the patch is applied for you (via `updateRow` / `updateTask`)
and re-emitted through `update:rows`; without it, listen and apply the patch
yourself.

```vue
<script setup>
import { ref } from 'vue'
import { Gantt, updateRow, updateTask } from '@dizzy_yakov/vue-gantt'

const rows = ref(initialRows)
</script>

<template>
  <!-- automatic sync -->
  <Gantt v-model:rows="rows" editable />

  <!-- or apply the patches yourself -->
  <Gantt
    :rows="rows"
    editable
    @row-edit="e => (rows = updateRow(rows, e.id, e.patch))"
    @task-edit="e => (rows = updateTask(rows, e.id, e.patch))"
  />
</template>
```

Replace the built-in input with your own editor via the `rowEditor`
(`{ row, value, commit, cancel }`) / `taskEditor` (`{ task, value, commit, cancel }`)
slots — render your control, then call `commit(newValue)` to save or `cancel()` to
discard:

```vue
<Gantt v-model:rows="rows" editable>
  <template #rowEditor="{ value, commit, cancel }">
    <input :value="value" @keydown.enter="commit($event.target.value)" @keydown.esc="cancel" />
  </template>
</Gantt>
```

Style the default input with the `--gantt-edit-*` [variables](#css-variables)
(class `.gantt-edit-input`).

### Imperative methods

`<Gantt>` / `<GanttRoot>` expose scroll and zoom helpers via a template ref:

```ts
const chart = useTemplateRef('chart')
chart.value?.scrollToToday()
chart.value?.scrollToTask('spec', { align: 'center' })
chart.value?.scrollToDate('2026-06-10')

chart.value?.setZoom('week') // activate a level by id
chart.value?.zoomIn() // step to the next finer level
chart.value?.zoomOut() // step to the next coarser level
```

`<GanttRoot>` additionally exposes `activeZoom` (the active level id, or
`undefined`).

### Utilities

Pure, tree-shakeable helpers over your `rows`/`tasks` — apply controlled events,
edit data, query dependencies, validate:

```ts
import {
  applyMove,
  updateTask,
  updateRow, // patch a task / row by id (immutable; use with row-edit / task-edit)
  addTask,
  removeTask, // edits (immutable)
  addDependency,
  removeDependency, // dependency edits
  flattenTasks,
  findTask,
  findRow,
  tasksExtent, // lookups
  sortRows,
  filterRows, // reorder / filter rows (immutable; pass the result back as `rows`)
  getDependents,
  detectCycles,
  topologicalOrder,
  criticalPath,
  slack, // longest finish-to-start chain · free-float days per task
  autoSchedule, // honors lower-bound constraints when shifting starts
  isOverdue,
  violatesConstraint, // deadline / constraint detectors
  rollupProgress,
  validateRows,
  sprintPeriods, // build a run of equal-length timeline periods (sprints; see SprintPeriodsOptions)
  nonWorkingBands, // compute non-working (weekend/holiday/off-period) bands over a range
  toCSV,
  downloadCSV, // serialize tasks to CSV / trigger a browser download (see Export)
} from '@dizzy_yakov/vue-gantt'
```

`criticalPath(rows)` returns the ids on the longest finish-to-start chain (by total
duration), and `slack(rows)` returns a `Map<string, number>` of each task's
**free float** in days — how far its finish can slip before it hits the start of its
nearest successor (tasks with no successors, or no positive gap, are absent). These
back the matching `criticalPath` / `slack` props: the prop visualizes what the
utility computes, so you can also call the utility directly (e.g. to label or report
the schedule).

### Export (CSV)

`toCSV(rows, options?)` serializes the tasks of your `rows` to an RFC-4180 CSV
string — one line per task, with its owning row's id/name as leading columns. It's
pure and framework-free (accepts raw `GanttRow[]` or the resolved rows from the
context). `downloadCSV(rows, filename?, options?)` wraps it and triggers a browser
download (`filename` defaults to `'gantt.csv'`).

```ts
import { toCSV, downloadCSV } from '@dizzy_yakov/vue-gantt'

downloadCSV(rows, 'schedule.csv')

// Custom columns / delimiter / date format:
const csv = toCSV(rows, {
  delimiter: ';',
  dateFormat: 'dd.MM.yyyy',
  columns: [
    { header: 'ID', value: (task) => task.id },
    { header: 'Owner', value: (task) => String(task.meta?.owner ?? '') },
    { header: 'Start', value: (task) => (task.start instanceof Date ? task.start.toISOString() : task.start) },
  ],
})
```

Default columns: `Row Id`, `Row`, `Task Id`, `Task`, `Type`, `Start`, `End`,
`Progress`, `Dependencies`, `Deadline`. Options: `columns`, `delimiter` (`,`),
`dateFormat` (`yyyy-MM-dd`), `locale`, `header` (`true`), `eol` (`\r\n`).

## Row grouping

Rows that reference the same `groupId` render under a collapsible header band
with a rolled-up summary bar. Provide group labels via the `groups` prop (or the
declarative `<GanttGroup>`).

![Row grouping](https://raw.githubusercontent.com/LavaYasha/vue-gantt/main/docs/grouping.png)

## Row tree (WBS)

Set `GanttRow.parentId` to nest a row under another, building a collapsible tree
of arbitrary depth (a work-breakdown structure). Rows must be given in
**pre-order** — a parent immediately before its subtree, same as `groupId`
members must be contiguous — and a dataset mixes one or the other, never both
(`parentId` and `groupId` are mutually exclusive across the same rows). A
parent row keeps its own tasks (if any) **and** shows a rolled-up **summary
bar** spanning the earliest start to the latest end across its whole subtree,
with duration-weighted aggregate progress. The sidebar indents each row by
`depth * --gantt-row-indent` and gives rows with children a chevron toggle.

Collapse is **uncontrolled**: `GanttRow.collapsed` seeds the initial state,
clicking the chevron (or calling `ctx.toggleRow(id)`) flips it, and
`row-toggle` fires with the new state. Collapsing a parent recursively hides
its descendants (excluded from layout/render, no vertical space) while its
summary bar keeps covering the full (still collapsed) subtree extent.

```vue
<Gantt :rows="rows" />
```

```ts
const rows: GanttRowData[] = [
  { id: 'project', name: 'Project' },
  {
    id: 'phase-design',
    name: 'Design',
    parentId: 'project',
    tasks: [{ id: 'design', start: '2026-06-01', end: '2026-06-10', progress: 80 }],
  },
  {
    id: 'phase-build',
    name: 'Build',
    parentId: 'project',
    collapsed: true, // starts folded; its summary bar still shows the rolled-up span
    tasks: [{ id: 'build', start: '2026-06-10', end: '2026-06-24', progress: 20 }],
  },
]
```

Declaratively, nest `<GanttRow>`s — the inner row inherits `parentId` from the
enclosing one (like `<GanttTask>` inherits its row):

```vue
<GanttRoot>
  <GanttTaskList />
  <GanttRow id="project" name="Project">
    <GanttRow id="phase-design" name="Design">
      <GanttTask id="design" start="2026-06-01" end="2026-06-10" :progress="80" />
    </GanttRow>
    <GanttRow id="phase-build" name="Build">
      <GanttTask id="build" start="2026-06-10" end="2026-06-24" :progress="20" />
    </GanttRow>
  </GanttRow>
  <GanttSummaryBar />
</GanttRoot>
```

The rollup bar is rendered by `<GanttSummaryBar>` (auto-mounted by
`<GanttView>` / `<Gantt>`; override it via the `summary-bars` section slot, or
just its rollup content via the `summaryBar` leaf slot, `{ row }`). Customize
the sidebar row itself — chevron, indent, name — via the `row` slot
(`{ row, index, depth, collapsed, hasChildren, toggle }`). Style with the
`--gantt-row-indent` / `--gantt-summary-bar-*` [variables](#css-variables).

## Row decoration

Two lightweight, additive hooks let you mark up a sidebar row without
overriding its whole render:

- **`row-suffix` slot** — rendered *after* the row name (`{ row, index, depth,
  collapsed, hasChildren }`, same scope as `row` minus `toggle`). Use it to
  append a badge/marker while keeping the default name rendering (and the
  `row` slot, if you also use one) untouched:

  ```vue
  <Gantt :rows="rows">
    <template #row-suffix="{ row }">
      <span v-if="row.meta.ppr" class="badge">PPR</span>
    </template>
  </Gantt>
  ```

- **`meta` → `data-*` passthrough** — primitive (`string`/`number`/`boolean`)
  entries of a row's `meta` are forwarded as `data-<key>` attributes on its
  `.gantt-task-list__row` element, so you can highlight/mark the row with
  plain CSS, no slot needed:

  ```ts
  const rows: GanttRowData[] = [{ id: 'task', name: 'Task', meta: { ppr: true } }]
  ```

  ```css
  .gantt-task-list__row[data-ppr] {
    background: var(--gantt-critical-color, #ef4444);
  }
  ```

  Only primitive values are forwarded (objects/arrays are skipped), and the
  reserved `data-id` / `data-group` / `data-depth` / `data-has-children` /
  `data-collapsed` attributes are never overwritten by `meta`.

## Baselines (planned vs actual)

Give a task both `baselineStart` and `baselineEnd` to draw its **baseline** — the
planned interval — as a thin "shadow" bar at the bottom of the task's row band,
under the actual (`start`/`end`) bar. It makes slippage visible at a glance: a
task running late has its actual bar sitting to the right of / longer than its
baseline. Both fields are required for the shadow to draw; a baseline is always an
interval (never collapsed like a milestone's end).

```vue
<Gantt :rows="rows" />
```

```ts
const rows = [
  {
    id: 'dev',
    name: 'Development',
    tasks: [
      {
        id: 'build',
        name: 'Implementation',
        start: '2026-06-18',
        end: '2026-06-30', // actual — running late
        baselineStart: '2026-06-16',
        baselineEnd: '2026-06-26', // planned
        progress: 40,
      },
    ],
  },
]
```

Declaratively it's `<GanttTask baseline-start="…" baseline-end="…" />`. The layer
is rendered by `<GanttBaselines>` (auto-mounted by `<GanttView>` / `<Gantt>`;
override it via the `baselines` section slot). `<GanttBaselines>` exposes a
default slot `{ task }` to render each baseline segment yourself. Style the shadow
bars with the `--gantt-baseline-*` [variables](#css-variables).

## Timeline period bands (sprints)

Custom **periods** group the *time axis* (unlike [row groups](#row-grouping), which
group rows). Each period renders a faint full-height **band** over the chart body
plus a **labelled row** in the timeline header — ideal for sprints, phases or
release windows. Pass a `periods` list (uneven spans + custom labels are fine); the
`periods` also extend the auto date range so a period before the first task stays
visible.

```vue
<script setup>
import { Gantt, sprintPeriods } from '@dizzy_yakov/vue-gantt'

// A regular cadence…
const periods = sprintPeriods({ from: '2026-06-01', every: 2, unit: 'week', count: 6 })
// …or your own: [{ id: 's1', start: '2026-06-01', end: '2026-06-15', label: 'Sprint 1' }, …]
</script>

<template>
  <Gantt :rows="rows" :periods="periods" :tiers="['month', 'week', 'day']" />
</template>
```

`sprintPeriods({ from, every, unit: 'day' | 'week', count, label?, id? })` builds a
contiguous run of equal-length periods. The bands are rendered by `<GanttPeriods>`
(auto-mounted; override via the `period-bands` section slot for the body band, or
the `period` slot for the header label). Style with the `--gantt-period-*`
[variables](#css-variables).

## Non-working calendar

A **working calendar** shades non-working time — weekends, holidays, or arbitrary
off spans — as a faint background band. Unlike [periods](#timeline-period-bands-sprints)
above, it's purely decorative: it never adds a header row and never extends the
auto date range, it only tints time already on the chart. Pass `true` to shade
Saturday/Sunday, or a `NonWorkingCalendar` for full control:

```vue
<script setup>
import { Gantt } from '@dizzy_yakov/vue-gantt'
</script>

<template>
  <!-- Sat/Sun only -->
  <Gantt :rows="rows" non-working />

  <!-- weekends + a holiday + a custom off span -->
  <Gantt
    :rows="rows"
    :non-working="{
      holidays: ['2026-12-25'],
      periods: [{ id: 'maintenance', start: '2026-06-15', end: '2026-06-17' }],
    }"
  />
</template>
```

`NonWorkingCalendar` is `{ weekends?: number[]; holidays?: (Date | string | number)[];
periods?: { id?: string; start; end }[] }`. `weekends` is a list of `getDay()`
weekday numbers (`0`=Sunday … `6`=Saturday), defaulting to `[0, 6]`; pass `[]` to
shade only `holidays`/`periods`. Consecutive non-working days are merged into a
single band. The bands are rendered by `<GanttNonWorking>` (auto-mounted; override
via the `non-working` section slot, or its own default slot (`{ band }`) for custom
content inside each band). Style with `--gantt-nonworking-bg`.

The pure `nonWorkingBands(calendar, range)` helper computes the same bands outside
of Vue (e.g. to report or validate a schedule against the calendar):

```ts
import { nonWorkingBands } from '@dizzy_yakov/vue-gantt'

nonWorkingBands(true, { start, end }) // Sat/Sun shaded
nonWorkingBands({ holidays: ['2026-07-04'] }, { start, end }) // + a holiday
```

## Zoom / view-mode

A zoom level is a **view-mode preset** — a named bundle of `tiers` + `columnWidth`.
Pass the active level's id to `zoom` (with `v-model:zoom`) and it overrides the
`tiers`/`columnWidth` props; omit it for the classic behavior. `zoomLevels`
defines the available presets and defaults to `DEFAULT_ZOOM_LEVELS` (year → hour),
which is exported so you can extend or reorder it.

```vue
<script setup lang="ts">
import { Gantt, DEFAULT_ZOOM_LEVELS } from '@dizzy_yakov/vue-gantt'
import { ref } from 'vue'

const zoom = ref('week')
</script>

<template>
  <Gantt :rows="rows" v-model:zoom="zoom" :zoom-levels="DEFAULT_ZOOM_LEVELS" />
</template>
```

`<GanttZoom>` is a headless control (− / level-select / +) that reads the shared
context, so drop it inside `<GanttRoot>` — e.g. in the `corner` slot of `<Gantt>`:

```vue
<Gantt :rows="rows" v-model:zoom="zoom">
  <template #corner>
    <GanttZoom />
  </template>
</Gantt>
```

Its default slot exposes `{ levels, active, setZoom, zoomIn, zoomOut, canZoomIn, canZoomOut }`
for a fully custom UI. You can also drive zoom imperatively
([`setZoom`/`zoomIn`/`zoomOut`](#imperative-methods) via a ref) or react to the
`zoom-change` event ([`GanttZoomEvent`](#events)).

## Timeline range (infinite scroll)

By default the axis spans a **fixed** range — the explicit `startDate`/`endDate`
if you pass them, otherwise a range auto-derived from the tasks (and periods),
snapped to the coarsest tier. Both bounds are reactive, so binding refs to
`startDate`/`endDate` lets you drive the window yourself.

Set `timeline-mode="infinite"` to pan the axis indefinitely: scrolling to either edge
extends the range by one screenful of dates. Prepending dates on the **left**
would shift every bar right, so the scroll position is corrected automatically —
the view stays anchored where you were. Column virtualization keeps the DOM
bounded no matter how far you scroll.

In **both** modes a `range-change` event fires whenever a scroll reaches an edge:
`range-change` → `GanttRangeChangeEvent { side: 'start' | 'end', start: Date, end: Date }`
(`start`/`end` are the proposed axis bounds after extending by one screen — see
[Events](#events)).

- In `infinite` mode the bounds are **already applied** — use the event to
  lazy-load the data for the newly revealed span.
- In `fixed` mode it's a **suggestion**: widen your own `startDate`/`endDate`
  (and fetch data) to implement a fully controlled infinite scroll.

```vue
<Gantt :rows="rows" :height="480" timeline-mode="infinite" @range-change="onRange" />
```

## Critical path & slack

Two opt-in schedule overlays, both off by default:

- **`criticalPath`** highlights the tasks on the longest finish-to-start chain. Each
  such bar / milestone marker gets a `data-critical` attribute, styled via the
  `--gantt-critical-*` variables.
- **`slack`** draws each task's **free float** — the gap between its end and the
  start of its nearest successor — as a translucent bar (the `<GanttSlack>` overlay),
  styled via `--gantt-slack-*`. Override the slab per-segment with `<GanttSlack>`'s
  default slot (`{ taskId, slack }`), or replace the whole layer with the `slack`
  slot on `<Gantt>` / `<GanttView>`.

```vue
<Gantt :rows="rows" :tiers="['month', 'week', 'day']" critical-path slack />
```

The same numbers are available headless via the
[`criticalPath` / `slack` utilities](#utilities) (no chart needed).

## Mobile & touch

The chart is pointer-event based end to end, so dragging, resizing, editing progress
and creating/rerouting dependencies all work with a finger out of the box. On top of
that:

- **Bigger hit areas.** On a coarse pointer the small mouse-tuned handles (resize,
  progress, connector, milestones, dependency handles + a wider tap target over each
  dependency line) enlarge automatically via `@media (pointer: coarse)` — no config. Set
  `touchTargets` (adds `data-touch` to the root) to force the same on any device. Every
  size stays overridable through the `--gantt-*` tokens.
- **Tap for the tooltip.** Touch has no hover, so a tap on a bar/milestone toggles its
  `tooltip`; a tap elsewhere dismisses it.
- **Long-press to edit.** `dblclick` is unreliable on touch, so with `editable` a
  ~500ms long-press on a row name (sidebar) or task label opens the inline editor.
  `dblclick` still works with a mouse.
- **Steadier drags.** The drag threshold is larger for touch pointers, so a bar isn't
  nudged by finger jitter.

```vue
<!-- Force the larger touch targets everywhere (otherwise auto on coarse pointers). -->
<Gantt :rows="rows" touch-targets draggable resizable editable tooltip />
```

## Localization (i18n)

Date labels — the timeline **column headers**, the live **drag labels** and the
**tooltips** — are formatted with date-fns. Pass a date-fns `Locale` via the `locale`
prop to translate month/day names. Import the locale yourself so only the ones you use
are bundled (date-fns is the library's one runtime dependency; it never imports locale
data itself):

```vue
<script setup>
import { Gantt } from '@dizzy_yakov/vue-gantt'
import { ru } from 'date-fns/locale'
</script>

<template>
  <Gantt :rows="rows" :locale="ru" :tiers="['month', 'week', 'day']" />
</template>
```

`locale` composes with [`labelFormat`](#configuration-props-ganttrootprops) (locale-aware
custom formats) and with `dragLabelFormat`. A `labelFormat` **function** owns its own
formatting, so it isn't affected by `locale` — call `format(date, fmt, { locale })`
yourself inside it if needed.

### Week start & the week label

The `week` tier's column boundaries (and drag snapping) start on Sunday unless
`locale` says otherwise; `weekStartsOn` overrides either. The default week label's
prefix (the `w` week-number token, e.g. `W23`) is also localized from `locale`'s
language automatically — `en`→`W`, `ru`→`Н`, `de`→`KW`, `fr`→`S`, any other
language falls back to `W`:

```vue
<script setup>
import { Gantt } from '@dizzy_yakov/vue-gantt'
import { ru } from 'date-fns/locale'
</script>

<template>
  <!-- ru: weeks start Monday, label prefix 'Н' (e.g. 'Н23') -->
  <Gantt :rows="rows" :locale="ru" :week-starts-on="1" :tiers="['month', 'week', 'day']" />
</template>
```

Override the whole week label via `labelFormat` (e.g. `{ week: "'нед 'w" }`) if the
localized prefix isn't what you want.

> **RTL** (right-to-left layouts) is not covered yet — `locale` handles date text only,
> not layout mirroring.

## Theming

![Custom theme via CSS variables](https://raw.githubusercontent.com/LavaYasha/vue-gantt/main/docs/theming.png)

Override any `--gantt-*` property on `.gantt-root` **or any ancestor** (defaults
live on `:root`, so the nearest override wins):

```css
.gantt-root,
.my-app {
  --gantt-bar-bg: #d1fae5;
  --gantt-progress-bg: #10b981;
  --gantt-milestone-bg: #8b5cf6;
  --gantt-today-color: #0ea5e9;
  --gantt-row-height: 44px;
}
```

### CSS variables

**Layout** (also set per-instance by `GanttRoot` from props)

| Variable                      | Default | Purpose                          |
| ----------------------------- | ------- | -------------------------------- |
| `--gantt-column-width`        | `40px`  | Width of one base-unit column.   |
| `--gantt-row-height`          | `36px`  | Row height.                      |
| `--gantt-header-row-height`   | `28px`  | Height of one timeline tier row. |
| `--gantt-group-header-height` | `36px`  | Group header band height.        |
| `--gantt-sidebar-width`       | `200px` | Frozen task-list width.          |

**Surface & grid**

| Variable                  | Default               | Purpose                                     |
| ------------------------- | --------------------- | ------------------------------------------- |
| `--gantt-surface`         | `#fff`                | Opaque bg of frozen header/sidebar/corner.  |
| `--gantt-grid-color`      | `#e5e7eb`             | Grid line colour.                           |
| `--gantt-grid-border`     | `1px solid …color`    | Grid border shorthand.                      |
| `--gantt-header-align`    | `flex-start`          | Alignment of timeline labels in their cell. |
| `--gantt-today-column-bg` | `rgb(239 68 68 / 6%)` | Tint behind the column containing "today".  |

**Bars & progress**

| Variable                  | Default   | Purpose                                         |
| ------------------------- | --------- | ----------------------------------------------- |
| `--gantt-bar-height`      | `60%`     | Bar height within the row band.                 |
| `--gantt-bar-radius`      | `4px`     | Bar corner radius.                              |
| `--gantt-bar-bg`          | `#c7d2fe` | Bar (track) background.                         |
| `--gantt-bar-color`       | `#1e1b4b` | Bar label colour.                               |
| `--gantt-bar-font-size`   | `0.8em`   | Bar label font size.                            |
| `--gantt-bar-text-shadow` | `none`    | Optional halo so the label reads over the fill. |
| `--gantt-progress-bg`     | `#6366f1` | Progress fill colour.                           |

**Inline editing** (row/task name inputs — see [inline editing](#inline-editing))

| Variable              | Default              | Purpose                                 |
| --------------------- | -------------------- | --------------------------------------- |
| `--gantt-edit-bg`     | surface (`#fff`)     | Background of the inline `<input>`.     |
| `--gantt-edit-color`  | `inherit`            | Text colour of the inline `<input>`.    |
| `--gantt-edit-border` | `1px solid` progress | Border of the inline `<input>`.         |
| `--gantt-edit-radius` | `3px`                | Corner radius of the inline `<input>`.  |

**Split tasks** (work spans with paused gaps — see [split tasks](#split-tasks-segments))

| Variable                       | Default          | Purpose                                                       |
| ------------------------------ | ---------------- | ------------------------------------------------------------ |
| `--gantt-split-line-color`     | progress bg      | Colour of the connecting line across the paused gaps.        |
| `--gantt-split-line-width`     | `2px`            | Thickness of the connecting line.                            |
| `--gantt-split-segment-radius` | bar radius       | Corner radius of each work-span segment.                     |

> Segments inherit `--gantt-bar-bg` / `--gantt-progress-bg`; set the optional
> inline `--gantt-split-segment-bg` on a bar to override just the segment track.

**Baselines** (planned vs actual)

| Variable                   | Default   | Purpose                                        |
| -------------------------- | --------- | ---------------------------------------------- |
| `--gantt-baseline-bg`      | `#cbd5e1` | Baseline (planned) shadow bar background.      |
| `--gantt-baseline-height`  | `22%`     | Baseline bar height within the row band.       |
| `--gantt-baseline-opacity` | `0.8`     | Baseline bar opacity.                          |
| `--gantt-baseline-radius`  | `2px`     | Baseline bar corner radius.                    |

**Milestones**

| Variable                   | Default   | Purpose                |
| -------------------------- | --------- | ---------------------- |
| `--gantt-milestone-size`   | `14px`    | Diamond size (grows on touch). |
| `--gantt-milestone-bg`     | `#f59e0b` | Diamond colour.        |
| `--gantt-milestone-radius` | `2px`     | Diamond corner radius. |

**Dependencies**

| Variable                          | Default     | Purpose                                 |
| --------------------------------- | ----------- | --------------------------------------- |
| `--gantt-dependency-color`          | `#94a3b8`   | Arrow stroke colour.                                   |
| `--gantt-dependency-width`          | `1.5`       | Arrow stroke width.                                    |
| `--gantt-dependency-draft-color`    | progress bg | Colour of the in-progress link line.                  |
| `--gantt-dependency-handle-color`   | progress bg | Colour of the draggable arrow endpoint.               |
| `--gantt-dependency-handle-radius`  | `4px`       | Radius of the reroute endpoint handle (grows on touch).|
| `--gantt-dependency-hit-width`      | `8px`       | Invisible tap width over each line (grows on touch).  |

The connector is configured on `GanttRoot`/`Gantt` with two builder functions:
`dependencyShape` (a path builder `(tail, head) => string`) and `arrowHead` (an
arrowhead builder `() => ArrowHeadShape | null`). The built-ins are exported — pass
one, or write your own:

```ts
import {
  elbowPath,
  straightPath,
  bezierPath,
  STUB, // path builders (+ stub length)
  triangleArrow,
  openArrow,
  noArrow, // arrowhead builders
} from '@dizzy_yakov/vue-gantt'
import type {
  DependencyPoint,
  DependencyPathBuilder,
  ArrowHeadShape,
  ArrowHeadBuilder,
} from '@dizzy_yakov/vue-gantt'

// e.g. <Gantt :dependency-shape="bezierPath" :arrow-head="noArrow" />
const stepped: DependencyPathBuilder = (tail, head) =>
  `M ${tail.x} ${tail.y} H ${head.x} V ${head.y}`
const diamond: ArrowHeadBuilder = () => ({
  d: 'M0,3 L3,0 L6,3 L3,6 Z',
  filled: true,
})
```

For full control over the rendered links, `<GanttDependencies>` also exposes a
default slot (`<slot :links>`).

**Row groups**

| Variable                           | Default   | Purpose                              |
| ---------------------------------- | --------- | ------------------------------------ |
| `--gantt-group-header-bg`          | `#f8fafc` | Group header band background.        |
| `--gantt-group-header-color`       | `inherit` | Group header text colour.            |
| `--gantt-group-header-font-weight` | `600`     | Group header font weight.            |
| `--gantt-group-indent`             | `16px`    | Indent of member rows under a group. |
| `--gantt-group-bar-bg`             | `#cbd5e1` | Rollup bar track.                    |
| `--gantt-group-bar-progress-bg`    | `#94a3b8` | Rollup bar progress fill.            |
| `--gantt-group-bar-height`         | `40%`     | Rollup bar height.                   |
| `--gantt-group-bar-radius`         | `3px`     | Rollup bar radius.                   |

**Row tree (WBS)** — see [Row tree](#row-tree-wbs)

| Variable                          | Default   | Purpose                                    |
| ---------------------------------- | --------- | ------------------------------------------ |
| `--gantt-row-indent`               | `16px`    | Per-level sidebar indent, × the row's depth. |
| `--gantt-summary-bar-bg`           | `#cbd5e1` | Parent-row rollup bar track.               |
| `--gantt-summary-bar-progress-bg`  | `#94a3b8` | Parent-row rollup bar progress fill.       |
| `--gantt-summary-bar-height`       | `40%`     | Rollup bar height.                         |
| `--gantt-summary-bar-radius`       | `3px`     | Rollup bar radius.                         |

**Overlap modes**

| Variable                  | Default   | Purpose                                |
| ------------------------- | --------- | -------------------------------------- |
| `--gantt-overlap-opacity` | `0.6`     | Opacity of blended bars (`overlap`).   |
| `--gantt-conflict-color`  | `#ef4444` | Hatch colour for clashes (`conflict`). |
| `--gantt-conflict-width`  | `1.5`     | Hatch stroke width.                    |

**Critical path & slack** (the `criticalPath` / `slack` props)

| Variable                   | Default                            | Purpose                                         |
| -------------------------- | ---------------------------------- | ----------------------------------------------- |
| `--gantt-critical-color`   | `#dc2626`                          | Colour of critical-path bars/markers.           |
| `--gantt-critical-outline` | `2px solid var(--gantt-critical-color)` | Outline on a critical-path bar/marker.     |
| `--gantt-slack-color`      | `#94a3b8`                          | Colour of the free-float slack bar.             |
| `--gantt-slack-opacity`    | `0.7`                              | Opacity of the slack bar.                       |

`<GanttSlack>` also reads two un-defaulted hooks for full control of the fill —
`--gantt-slack-bg` (the bar's `background`, e.g. a flat colour or gradient) and
`--gantt-slack-border` (its `border` shorthand); set them to override the default
hatched look.

**Drag & drop**

| Variable                        | Default            | Purpose                                |
| ------------------------------- | ------------------ | -------------------------------------- |
| `--gantt-ghost-opacity`         | `0.55`             | Opacity of the dragged ghost copy.     |
| `--gantt-drag-label-bg`         | `#1e293b`          | Drag tooltip background.               |
| `--gantt-drag-label-color`      | `#fff`             | Drag tooltip text colour.              |
| `--gantt-drag-label-radius`     | `4px`              | Drag tooltip corner radius.            |
| `--gantt-drag-label-font-size`  | `0.72em`           | Drag tooltip font size.                |
| `--gantt-resize-handle-width`   | `7px`              | Edge resize hit area (grows on touch). |
| `--gantt-resize-handle-bg`      | `rgb(0 0 0 / 12%)` | Edge resize hover tint.                |
| `--gantt-progress-handle-width` | `10px`             | Progress handle hit area (grows on touch). |
| `--gantt-progress-handle-color` | `#fff`             | Progress handle grip colour.           |
| `--gantt-connector-size`        | `8px`              | Dependency connector dot size (grows on touch). |
| `--gantt-connector-bg`          | `#fff`             | Dependency connector dot fill.         |
| `--gantt-connector-color`       | progress bg        | Dependency connector dot border.       |
| `--gantt-link-target-outline`   | `2px solid …`      | Outline on a hovered link drop target. |

**Tooltip** (opt-in hover tooltip; defaults inherit the drag-label look)

| Variable                    | Default                    | Purpose                      |
| --------------------------- | -------------------------- | ---------------------------- |
| `--gantt-tooltip-bg`        | drag-label bg              | Hover tooltip background.    |
| `--gantt-tooltip-color`     | drag-label colour          | Hover tooltip text colour.   |
| `--gantt-tooltip-radius`    | drag-label radius          | Hover tooltip corner radius. |
| `--gantt-tooltip-font-size` | drag-label font size       | Hover tooltip font size.     |
| `--gantt-tooltip-shadow`    | `0 2px 8px rgb(0 0 0/25%)` | Hover tooltip drop shadow.   |

**Timeline period bands (sprints)**

| Variable                      | Default              | Purpose                                        |
| ----------------------------- | -------------------- | ---------------------------------------------- |
| `--gantt-period-band-bg`      | `rgb(99 102 241/4%)` | Body band fill (even periods).                 |
| `--gantt-period-band-alt-bg`  | `transparent`        | Body band fill (odd periods, alternating).     |
| `--gantt-period-border`       | `1px dashed …grid`   | Divider between periods (body + header).        |
| `--gantt-period-color`        | `inherit`            | Header period label colour.                     |
| `--gantt-period-font-weight`  | `600`                | Header period label weight.                     |
| `--gantt-period-font-size`    | header font size     | Header period label size.                       |

**Non-working calendar**

| Variable                | Default                 | Purpose                                                 |
| ----------------------- | ------------------------ | -------------------------------------------------------- |
| `--gantt-nonworking-bg` | `rgb(100 116 139 / 8%)` | Non-working band fill (weekends/holidays/off periods).   |

**Today**

| Variable               | Default            | Purpose              |
| ---------------------- | ------------------ | -------------------- |
| `--gantt-today-color`  | `#ef4444`          | "Today" line colour. |
| `--gantt-today-border` | `2px solid …color` | "Today" line border. |

**Deadlines & constraints**

| Variable                   | Default                | Purpose                                          |
| -------------------------- | ---------------------- | ------------------------------------------------ |
| `--gantt-deadline-color`   | `#dc2626`              | Deadline line + overdue accent colour.           |
| `--gantt-deadline-width`   | `2px`                  | Deadline line thickness.                         |
| `--gantt-deadline-border`  | `2px solid …color`     | Deadline line border shorthand.                  |
| `--gantt-overdue-tint`     | `rgb(220 38 38 / 12%)` | Tint over a bar that finished past its deadline. |
| `--gantt-overdue-outline`  | `1.5px solid …color`   | Outline of an overdue bar.                       |
| `--gantt-constraint-color` | `#f59e0b`              | Constraint-violation accent colour.              |
| `--gantt-constraint-outline` | `1.5px dashed …color` | Outline of a bar breaching an upper-bound constraint. |

**Zoom control** (`GanttZoom`)

| Variable                    | Default               | Purpose                            |
| --------------------------- | --------------------- | ---------------------------------- |
| `--gantt-zoom-gap`          | `4px`                 | Gap between the control's buttons. |
| `--gantt-zoom-padding`      | `4px`                 | Padding around the control.        |
| `--gantt-zoom-btn-size`     | `24px`                | Width/height of the −/+ buttons.   |
| `--gantt-zoom-radius`       | `4px`                 | Button/select corner radius.       |
| `--gantt-zoom-border`       | `1px solid …grid`     | Button/select border.              |
| `--gantt-zoom-color`        | `inherit`             | Button/select text color.          |
| `--gantt-zoom-btn-bg`       | `transparent`         | Button background.                 |
| `--gantt-zoom-btn-hover-bg` | `rgb(0 0 0 / 6%)`     | Button hover background.           |
| `--gantt-zoom-select-bg`    | `transparent`         | Level select background.           |
| `--gantt-zoom-select-padding` | `2px 6px`           | Level select padding.              |

> A few internal vars (`--gantt-content-width` / `-height`, `--gantt-header-height`,
> `--gantt-label-sticky-left`) are computed by `GanttRoot` — don't set them.

### Design systems

Because everything is CSS variables, integrating with a design system is just
mapping `--gantt-*` to its tokens — e.g. shadcn/ui
`--gantt-progress-bg: hsl(var(--primary))`, Vuetify `rgb(var(--v-theme-primary))`,
Quasar `var(--q-primary)`. The **Guides → Design systems** Storybook page has
ready examples for shadcn, Ant Design, Material UI, Vuetify and Quasar.

## Performance

The chart is built for large plans (tested at **10 000 tasks** — see the
`Guides/Performance` story):

- **Row & column virtualization.** With a height-constrained scroll viewport (a
  `height` cap or a fixed-height parent) only the rows and columns inside the
  window are rendered, so the DOM stays small regardless of dataset size. Column
  generation is windowed; `contentWidth` is computed analytically (O(1), no scan),
  and a `MAX_CELLS` guard bounds a single generation pass.
- **Dependency arrows are viewport-culled too.** Only links whose endpoint rows
  intersect the visible window get an SVG path (window-straddling links are kept),
  so dense dependency graphs don't emit a path per edge. The `dependencies` slot
  receives the same culled `links`, consistent with the other virtualized slots.
- **Group rollups are O(rows).** A collapsible group's summary (start/end/progress)
  is computed in a single bucketed pass, so many groups don't cost O(groups × rows)
  on each edit/collapse.
- **Benchmarks.** `bun run bench` (`vitest bench`) runs
  `src/__tests__/perf.bench.ts` — pure-function numbers (layout, critical-path,
  slack, and the per-scroll visible-task filter) at 1k/10k. Benchmarks are not part
  of `vitest run`/CI.

## Development

```sh
bun install
bun dev            # demo playground at src/dev
bun test:unit      # Vitest (append `run` for a single pass)
bun run bench      # performance benchmarks (vitest bench, not in CI)
bun run build      # library build → dist/ (ESM + gantt.css + .d.ts)
bun lint
```

The demo (`src/dev/`) is not part of the published package; the library entry is
[`src/index.ts`](src/index.ts).
