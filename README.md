# vue-gantt

[![npm version](https://img.shields.io/npm/v/@yakov_dizzy/vue-gantt.svg)](https://www.npmjs.com/package/@yakov_dizzy/vue-gantt)
[![npm downloads](https://img.shields.io/npm/dm/@yakov_dizzy/vue-gantt.svg)](https://www.npmjs.com/package/@yakov_dizzy/vue-gantt)
[![CI](https://github.com/LavaYasha/vue-gantt/actions/workflows/ci.yml/badge.svg)](https://github.com/LavaYasha/vue-gantt/actions/workflows/ci.yml)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/@yakov_dizzy/vue-gantt)](https://bundlephobia.com/package/@yakov_dizzy/vue-gantt)
[![types](https://img.shields.io/npm/types/@yakov_dizzy/vue-gantt.svg)](https://www.npmjs.com/package/@yakov_dizzy/vue-gantt)
[![license](https://img.shields.io/npm/l/@yakov_dizzy/vue-gantt.svg)](./LICENSE)

Headless, composable Gantt chart components for **Vue 3**. Ships only structural
layout — every colour, size and font is a CSS custom property, so the chart
adapts to any design system.

Features: task list, a multi-tier time axis (any of year / quarter / month /
week / day / hour / minute, toggleable via `tiers`), task bars, milestones
(diamonds), dependency arrows, progress shading and a "today" line. A frozen
header + sidebar, sticky time-period labels that follow the viewport, a body
grid, row/column virtualization (pass `height` to enable vertical scrolling),
and drag & drop (`draggable` to move bars in time, `rowMovable` to also move a
task into another row — emits a `move` event for you to apply). Dragging is
full-precision by default (any datetime; set `snapToGrid` to snap), and shows a
translucent ghost copy with a live new-time label. Tasks that overlap in a row
are handled via `overlap`: `lanes` (stack into sub-lanes, the row grows),
`overlap` (translucent blend), `cascade` (staggered), or `conflict` (hatch the
clash) — see the **Guides → Overlapping tasks** Storybook page.

## Install

```sh
bun add @yakov_dizzy/vue-gantt        # vue ^3.5 is a peer dependency
# or: npm i @yakov_dizzy/vue-gantt  ·  pnpm add @yakov_dizzy/vue-gantt  ·  yarn add @yakov_dizzy/vue-gantt
```

```ts
import '@yakov_dizzy/vue-gantt/styles' // optional default theme (CSS variables)
```

## Two ways to provide data

Data is two-level: **rows** are the sidebar entries and each row **contains a
list of tasks** plotted on its band (so a row can hold several bars).

### 1. Prop-driven wrapper

Pass a `rows` array to `<Gantt>`; it renders the full standard layout and
exposes named slots (`bar`, `milestone`, `row`, `column`, `timeline`,
`dependencies`, `today`, …) for overriding any part.

```vue
<script setup lang="ts">
import { Gantt, type GanttRowData } from '@yakov_dizzy/vue-gantt'
import '@yakov_dizzy/vue-gantt/styles'

const rows: GanttRowData[] = [
  {
    id: 'planning',
    name: 'Planning',
    tasks: [
      { id: 'spec', name: 'Spec', start: '2026-06-01', end: '2026-06-08', progress: 100 },
      { id: 'ship', name: 'Ship', type: 'milestone', start: '2026-06-16', dependencies: ['design'] },
    ],
  },
  {
    id: 'design',
    name: 'Design',
    tasks: [
      { id: 'design', name: 'Design', start: '2026-06-08', end: '2026-06-16', progress: 70, dependencies: ['spec'] },
    ],
  },
]
</script>

<template>
  <!-- Stack any subset of time groups on the header (coarse → fine).
       `height` turns on vertical scrolling + row virtualization.
       `draggable`/`row-movable` enable drag & drop; apply the `move` event. -->
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

```ts
import type { GanttMoveEvent } from '@yakov_dizzy/vue-gantt'

// `move` is controlled — apply it to your data when it fires.
function onMove(e: GanttMoveEvent) {
  // Remove the task from its row and append it (with new dates) to e.toRowId.
  for (const row of rows) row.tasks = row.tasks?.filter((t) => t.id !== e.id)
  const target = rows.find((r) => r.id === e.toRowId)
  target?.tasks?.push({ id: e.id, start: e.start, end: e.end /* …other fields */ })
}
```

### 2. Declarative composition

`<GanttRoot>` provides the shared scale/config; drop the feature components into
its slots. `<GanttRow>` declares a row; the `<GanttTask>` / `<GanttMilestone>`
inside it register into that row.

```vue
<GanttRoot unit="week">
  <GanttTimeline />
  <GanttTaskList />
  <GanttRow id="planning" name="Planning">
    <GanttTask id="spec" name="Spec" start="2026-06-01" end="2026-06-08" :progress="100" />
    <GanttMilestone id="ship" name="Ship" start="2026-06-16" :dependencies="['spec']" />
  </GanttRow>
  <GanttDependencies />
  <GanttToday />
</GanttRoot>
```

## Theming

Override any `--gantt-*` custom property on `.gantt-root` **or any ancestor**
(the defaults live on `:root`, so the nearest override wins):

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

See [`src/styles/gantt.css`](src/styles/gantt.css) for the full list of variables.

### Design systems

Because everything is CSS variables, integrating with a design system means
mapping `--gantt-*` to its tokens — e.g. shadcn/ui `--gantt-progress-bg: hsl(var(--primary))`,
Vuetify `rgb(var(--v-theme-primary))`, Quasar `var(--q-primary)`, or Ant/MUI
theme values. The **Guides → Design systems** Storybook page has ready examples
for shadcn, Ant Design, Material UI, Vuetify and Quasar.

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
