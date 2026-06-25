import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import Gantt from '../components/Gantt.vue'
import type { GanttMoveEvent, GanttRow } from '../types'
import { sampleRows } from './_shared'

/**
 * `Gantt` is the prop-driven wrapper: pass `rows` (each row holds a list of
 * tasks) and it renders the full chart — frozen header/sidebar, multi-tier
 * timeline, grid, dependency arrows and the live "today" line — with row/column
 * virtualization when `height` is set. Named slots override any part.
 */
const meta: Meta<typeof Gantt> = {
  title: 'Components/Gantt',
  component: Gantt,
  tags: ['autodocs'],
  argTypes: {
    rows: { control: 'object', description: 'Rows, each containing a list of tasks.' },
    tiers: {
      control: 'check',
      options: ['year', 'quarter', 'month', 'week', 'day', 'hour', 'minute'],
      description: 'Time-group rows shown on the header (coarse → fine).',
    },
    unit: {
      control: 'select',
      options: ['year', 'quarter', 'month', 'week', 'day', 'hour', 'minute'],
      description: 'Base granularity when `tiers` is omitted.',
    },
    overlap: {
      control: 'select',
      options: ['lanes', 'overlap', 'cascade', 'conflict'],
      description: 'How tasks overlapping on the same row are displayed.',
    },
    columnWidth: { control: { type: 'number', min: 4, max: 200 } },
    rowHeight: { control: { type: 'number', min: 16, max: 80 } },
    headerRowHeight: { control: { type: 'number', min: 16, max: 60 } },
    sidebarWidth: { control: { type: 'number', min: 80, max: 400 } },
    height: { control: { type: 'number', min: 120, max: 800 }, description: 'Scroll viewport height (enables virtualization).' },
    draggable: { control: 'boolean', description: 'Drag bars to change start/end.' },
    rowMovable: { control: 'boolean', description: 'Drag a task into another row.' },
    resizable: { control: 'boolean', description: 'Resize bars by dragging an edge (sides flip past each other).' },
    progressDraggable: { control: 'boolean', description: 'Edit progress by dragging a handle on the bar.' },
    linkable: { control: 'boolean', description: 'Create/edit dependencies by dragging between tasks.' },
    snapToGrid: { control: 'boolean', description: 'Snap dragged dates to the base unit (off = full precision).' },
    today: { control: 'text' },
    labelFormat: { control: 'text' },
    onMove: { action: 'move', table: { category: 'events' } },
    onResize: { action: 'resize', table: { category: 'events' } },
    onProgress: { action: 'progress', table: { category: 'events' } },
    'onGroup-toggle': { action: 'group-toggle', table: { category: 'events' } },
    'onDependency-create': { action: 'dependency-create', table: { category: 'events' } },
    'onDependency-remove': { action: 'dependency-remove', table: { category: 'events' } },
    'onDependency-update': { action: 'dependency-update', table: { category: 'events' } },
    'onTask-click': { action: 'task-click', table: { category: 'events' } },
    'onTask-dblclick': { action: 'task-dblclick', table: { category: 'events' } },
    'onTask-contextmenu': { action: 'task-contextmenu', table: { category: 'events' } },
    'onMilestone-click': { action: 'milestone-click', table: { category: 'events' } },
    'onMilestone-dblclick': { action: 'milestone-dblclick', table: { category: 'events' } },
    'onMilestone-contextmenu': { action: 'milestone-contextmenu', table: { category: 'events' } },
    'onRow-click': { action: 'row-click', table: { category: 'events' } },
    'onRow-dblclick': { action: 'row-dblclick', table: { category: 'events' } },
    'onRow-contextmenu': { action: 'row-contextmenu', table: { category: 'events' } },
    'onCell-click': { action: 'cell-click', table: { category: 'events' } },
    'onCell-dblclick': { action: 'cell-dblclick', table: { category: 'events' } },
    'onColumn-click': { action: 'column-click', table: { category: 'events' } },
    'onDependency-click': { action: 'dependency-click', table: { category: 'events' } },
  },
  args: {
    rows: sampleRows,
    tiers: ['month', 'week', 'day'],
    columnWidth: 40,
    rowHeight: 36,
    height: 260,
    draggable: false,
    rowMovable: false,
    snapToGrid: false,
  },
}
export default meta

type Story = StoryObj<typeof Gantt>

/** Minimal usage: rows of tasks on a month/week/day axis. */
export const Basic: Story = {}

/**
 * Toggle any subset of the seven time groups on the header. The coarsest tier
 * (`quarter`) snaps the auto range to the whole quarter, so the data spans
 * Apr–Jun to fill it — handy for long projects viewed at a glance.
 */
export const MultipleTiers: Story = {
  args: {
    tiers: ['quarter', 'month', 'week', 'day'],
    columnWidth: 32,
    rows: [
      {
        id: 'planning',
        name: 'Planning',
        tasks: [
          { id: 'research', name: 'Research', start: '2026-04-01', end: '2026-04-18', progress: 100 },
          { id: 'spec', name: 'Spec', start: '2026-04-20', end: '2026-05-04', progress: 100, dependencies: ['research'] },
        ],
      },
      {
        id: 'design',
        name: 'Design',
        tasks: [{ id: 'design', name: 'Design', start: '2026-05-04', end: '2026-05-25', progress: 70, dependencies: ['spec'] }],
      },
      {
        id: 'dev',
        name: 'Development',
        tasks: [
          { id: 'build', name: 'Implementation', start: '2026-05-25', end: '2026-06-22', progress: 30, dependencies: ['design'] },
          { id: 'ship', name: 'Ship', type: 'milestone', start: '2026-06-29', dependencies: ['build'] },
        ],
      },
    ],
  },
}

/** A fine tier over a long range stays fast — columns are generated per window. */
export const HourTier: Story = {
  args: { tiers: ['day', 'hour'], columnWidth: 44, height: 240 },
}

/**
 * Drag bars to reschedule (full precision, with a live time label + ghost) and,
 * with `rowMovable`, drop a task into another row. `move` is controlled — apply
 * it to your data.
 */
export const DragAndDrop: Story = {
  args: { draggable: true, rowMovable: true },
  render: (args) => ({
    components: { Gantt },
    setup() {
      // Own a local copy so the drag actually moves tasks in this demo.
      const rows = ref<GanttRow[]>(JSON.parse(JSON.stringify(sampleRows)))
      function onMove(e: GanttMoveEvent) {
        for (const row of rows.value) row.tasks = (row.tasks ?? []).filter((t) => t.id !== e.id)
        const target = rows.value.find((r) => r.id === e.toRowId)
        if (target) target.tasks = [...(target.tasks ?? []), { id: e.id, start: e.start, end: e.end }]
      }
      return { args, rows, onMove }
    },
    template: `<Gantt v-bind="args" :rows="rows" @move="onMove" />`,
  }),
}

/**
 * `v-model:rows` is a convenience layer over the controlled events: drag, resize,
 * progress and dependency edits are applied to your data for you — no manual
 * `@move`/`@resize`/… handlers. (The controlled events still fire if you want them.)
 */
export const VModelRows: Story = {
  args: { draggable: true, rowMovable: true, resizable: true, progressDraggable: true, linkable: true },
  render: (args) => ({
    components: { Gantt },
    setup() {
      const rows = ref<GanttRow[]>(JSON.parse(JSON.stringify(sampleRows)))
      return { args, rows }
    },
    template: `<Gantt v-bind="args" v-model:rows="rows" />`,
  }),
}

/** Big dataset with a fixed `height` → row & column virtualization kick in. */
export const Virtualized: Story = {
  args: {
    height: 360,
    rows: Array.from({ length: 40 }, (_, r) => ({
      id: `row-${r}`,
      name: `Team ${r + 1}`,
      tasks: Array.from({ length: 1 + (r % 3) }, (_, k) => {
        const startDay = 1 + ((r * 3 + k * 7) % 24)
        return {
          id: `t-${r}-${k}`,
          name: `Task ${r + 1}.${k + 1}`,
          start: `2026-06-${String(startDay).padStart(2, '0')}`,
          end: `2026-06-${String(Math.min(30, startDay + 2 + (k % 4))).padStart(2, '0')}`,
          progress: (r * 13 + k * 29) % 101,
        }
      }),
    })),
  },
}

/** Everything is themed via `--gantt-*` custom properties — no prop changes. */
export const Theming: Story = {
  render: (args) => ({
    components: { Gantt },
    setup: () => ({ args }),
    template: `
      <div :style="{
        '--gantt-bar-bg': '#d1fae5',
        '--gantt-progress-bg': '#10b981',
        '--gantt-bar-color': '#064e3b',
        '--gantt-bar-radius': '999px',
        '--gantt-milestone-bg': '#8b5cf6',
        '--gantt-today-color': '#0ea5e9',
        '--gantt-grid-color': '#eef2ff',
      }">
        <Gantt v-bind="args" />
      </div>`,
  }),
}

/**
 * Organize rows into collapsible groups: each row references a `groupId` and the
 * `groups` prop carries the labels (+ initial `collapsed`). Click a header to
 * collapse — member rows + bars hide while a rollup summary bar remains.
 * `group-toggle` fires on every toggle.
 */
export const Grouping: Story = {
  args: {
    groups: [
      { id: 'g-be', name: 'Backend' },
      { id: 'g-fe', name: 'Frontend', collapsed: true },
    ],
    rows: [
      { id: 'gr-api', name: 'API', groupId: 'g-be', tasks: [{ id: 'g-api', name: 'API', start: '2026-06-01', end: '2026-06-10', progress: 80 }] },
      { id: 'gr-db', name: 'Database', groupId: 'g-be', tasks: [{ id: 'g-db', name: 'Schema', start: '2026-06-06', end: '2026-06-14', progress: 40 }] },
      { id: 'gr-ui', name: 'UI', groupId: 'g-fe', tasks: [{ id: 'g-ui', name: 'Components', start: '2026-06-10', end: '2026-06-20', progress: 20 }] },
      { id: 'gr-ux', name: 'UX', groupId: 'g-fe', tasks: [{ id: 'g-ux', name: 'Flows', start: '2026-06-12', end: '2026-06-18' }] },
    ],
    tiers: ['month', 'week', 'day'],
    height: 300,
  },
}

/** Override a bar's content with the `bar` slot. */
export const CustomBarSlot: Story = {
  render: (args) => ({
    components: { Gantt },
    setup: () => ({ args }),
    template: `
      <Gantt v-bind="args">
        <template #bar="{ task, progress }">
          <span style="padding:0 8px;font-size:.72em;font-weight:600">
            {{ task.name }} · {{ progress }}%
          </span>
        </template>
      </Gantt>`,
  }),
}

/**
 * Section slots are scoped — they hand you the same data the default renderer
 * uses. The `today` slot replaces the built-in `<GanttToday>` line and receives
 * `{ today, dateToX }`: the configured reference `Date` and a positioning helper
 * `(date) => number`. Here it draws a custom labelled marker at "today".
 */
export const CustomTodaySlot: Story = {
  render: (args) => ({
    components: { Gantt },
    setup: () => ({ args }),
    template: `
      <Gantt v-bind="args">
        <template #today="{ today, dateToX }">
          <div :style="{
            position: 'absolute', top: 0, bottom: 0, zIndex: 4,
            left: dateToX(today) + 'px',
            width: '2px', background: '#0ea5e9',
          }">
            <span :style="{
              position: 'absolute', top: 0, left: '4px',
              padding: '1px 6px', fontSize: '.66em', fontWeight: 600,
              color: '#fff', background: '#0ea5e9', borderRadius: '4px',
              whiteSpace: 'nowrap',
            }">Today</span>
          </div>
        </template>
      </Gantt>`,
  }),
}
