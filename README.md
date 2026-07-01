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
- 🗂️ Collapsible **row groups** with rolled-up summary bars.
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
| `bars`         | `{ tasks }`                       | the task bar / milestone layer      |
| `group-bars`   | `{ groups }`                      | `<GanttGroupBar>` (group rollups)   |
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
`GanttColumn[]`, `tasks` are `ResolvedTask[]` (all of them for `dependencies`,
the plotted/visible ones for `bars`, `baselines` and `deadlines`), `today` is the
configured reference `Date`, `conflicts` is `GanttConflict[]` (empty unless
`overlap: 'conflict'`), and `slack` is a `Map<string, number>` of free-float days by
task id (empty unless `slack` is on).

**Leaf slots** customize a single repeated item: `row` (`{ row, index }`),
`group` (`{ group, collapsed, toggle }`), `groupBar` (`{ group }`), `column`
(`{ column, tier }`), `bar` (`{ task, progress }`), `milestone` (`{ task }`),
`tooltip` (`{ task }`).

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
| `<GanttRow>`          | `id` · `name?` · `tasks?` · `groupId?` · `meta?` | —                                                |
| `<GanttTask>`         | `GanttItemProps`                                 | `click` · `dblclick` · `contextmenu`             |
| `<GanttMilestone>`    | `GanttItemProps`                                 | `click` · `dblclick` · `contextmenu`             |
| `<GanttGrid>`         | `tier?: GanttUnit`                               | `cell-click` · `cell-dblclick`                   |
| `<GanttDependencies>` | —                                                | `dependency-click`                               |
| `<GanttConflicts>`    | —                                                | —                                                |
| `<GanttSlack>`        | — (default slot `{ taskId, slack }`)             | —                                                |
| `<GanttDeadlines>`    | — (default slot `{ taskId, deadline }`)          | —                                                |
| `<GanttBaselines>`    | — (default slot `{ task }`)                      | —                                                |
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
| `tooltip`               | `boolean`                                         | `false`         | Show a hover tooltip on bars/milestones (override its content via the `tooltip` slot).                                                                                                                                                                        |
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
| `today`                 | `Date \| string \| number`                        | now             | The "today" reference.                                                                                                                                                                                                                                        |
| `labelFormat`           | `GanttLabelFormat`                                | per tier        | Column label formatting. A date-fns `string` (base unit only — other tiers keep defaults), a per-tier map `Partial<Record<GanttUnit, string>>`, or a `(date, tier) => string` function (full control). E.g. `{ month: 'LLLL yyyy', week: "'W'w", day: 'd' }`. |

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
| `deadline`     | `Date \| string \| number` | Target date (drawn as a line; flags overdue).  |
| `constraint`   | `GanttConstraint`          | Scheduling constraint (`{ type, date }`).      |
| `baselineStart`| `Date \| string \| number` | Planned start (baseline). Needs `baselineEnd`. |
| `baselineEnd`  | `Date \| string \| number` | Planned end (baseline). Needs `baselineStart`. |
| `meta`         | `Record<string, unknown>`  | Arbitrary data forwarded to slots.             |
| `rowId`        | `string`                   | Explicit row id (overrides the enclosing row). |

> `<GanttTask :task>` / `<GanttMilestone :task>` also accept an already-resolved
> task — this is how `<Gantt>` renders bars internally.

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
| `update:rows`                  | `GanttRowData[]`                             | a task/dependency change is applied (`v-model:rows`).  |
| `update:zoom`                  | `string`                                     | the active zoom level changes (`v-model:zoom`).        |
| `zoom-change`                  | `GanttZoomEvent`                             | the active zoom level changes (carries the level).     |
| `group-toggle`                 | `GanttGroupToggleEvent`                      | a group is collapsed/expanded.                         |
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
interface GanttGroupToggleEvent {
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
```

### Two-way binding (`v-model:rows`)

`v-model:rows` is a convenience layer over the controlled events on `<Gantt>` and
`<GanttRoot>`. It pairs the existing `rows` prop with an `update:rows` emit: when
a drag change (`move` / `resize` / `progress`) or a dependency edit
(`dependency-create` / `dependency-remove` / `dependency-update`) happens, the
component applies it to your data with the same immutable [utilities](#utilities)
(`applyMove` / `updateTask` / `addDependency` / `removeDependency`) and emits
`update:rows` with the new array — so the chart stays in sync without a manual
handler.

```vue
<Gantt v-model:rows="rows" draggable resizable progress-draggable linkable />
```

This works **only** in prop-driven mode (when `rows` is passed); in declarative
mode (`<GanttRow>` without `rows`) there is nothing to update, so `update:rows`
is not emitted. `group-toggle` is **not** part of the model — it is a view-state
change, not a task-data change.

The plain controlled events (`@move`, `@resize`, `@progress`, `@dependency-*`)
are still emitted alongside `update:rows`. Choose **one** approach: use
`v-model:rows` for automatic sync, or the manual events to apply changes
yourself — combining both double-applies each change.

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
} from '@dizzy_yakov/vue-gantt'
```

`criticalPath(rows)` returns the ids on the longest finish-to-start chain (by total
duration), and `slack(rows)` returns a `Map<string, number>` of each task's
**free float** in days — how far its finish can slip before it hits the start of its
nearest successor (tasks with no successors, or no positive gap, are absent). These
back the matching `criticalPath` / `slack` props: the prop visualizes what the
utility computes, so you can also call the utility directly (e.g. to label or report
the schedule).

## Row grouping

Rows that reference the same `groupId` render under a collapsible header band
with a rolled-up summary bar. Provide group labels via the `groups` prop (or the
declarative `<GanttGroup>`).

![Row grouping](https://raw.githubusercontent.com/LavaYasha/vue-gantt/main/docs/grouping.png)

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
| `--gantt-milestone-size`   | `14px`    | Diamond size.          |
| `--gantt-milestone-bg`     | `#f59e0b` | Diamond colour.        |
| `--gantt-milestone-radius` | `2px`     | Diamond corner radius. |

**Dependencies**

| Variable                          | Default     | Purpose                                 |
| --------------------------------- | ----------- | --------------------------------------- |
| `--gantt-dependency-color`        | `#94a3b8`   | Arrow stroke colour.                    |
| `--gantt-dependency-width`        | `1.5`       | Arrow stroke width.                     |
| `--gantt-dependency-draft-color`  | progress bg | Colour of the in-progress link line.    |
| `--gantt-dependency-handle-color` | progress bg | Colour of the draggable arrow endpoint. |

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
| `--gantt-resize-handle-width`   | `7px`              | Edge resize hit area.                  |
| `--gantt-resize-handle-bg`      | `rgb(0 0 0 / 12%)` | Edge resize hover tint.                |
| `--gantt-progress-handle-color` | `#fff`             | Progress handle grip colour.           |
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

## Development

```sh
bun install
bun dev            # demo playground at src/dev
bun test:unit      # Vitest (append `run` for a single pass)
bun run build      # library build → dist/ (ESM + gantt.css + .d.ts)
bun lint
```

The demo (`src/dev/`) is not part of the published package; the library entry is
[`src/index.ts`](src/index.ts).
