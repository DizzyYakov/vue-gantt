import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { de } from 'date-fns/locale'
import { ref } from 'vue'
import Gantt from '../components/Gantt.vue'
import GanttZoom from '../components/GanttZoom.vue'
import { downloadCSV } from '../export'
import type { GanttMoveEvent, GanttRow } from '../types'
import { sprintPeriods } from '../utils'
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
    periods: {
      control: 'object',
      description:
        'Custom timeline periods (sprints): a background band + a labelled header row. ' +
        'Build a cadence with `sprintPeriods` or pass your own list. Override via the ' +
        '`period-bands` / `period` slots; theme with `--gantt-period-*`. See ' +
        'Components/GanttPeriods.',
    },
    nonWorking: {
      control: 'object',
      description:
        'Working calendar: shade non-working time (weekends/holidays/custom off periods) ' +
        'as a faint background band. `true` shades Sat/Sun; pass a `NonWorkingCalendar` ' +
        '(`{ weekends?, holidays?, periods? }`) for full control. Unlike `periods`, purely ' +
        'decorative — never extends the axis or adds a header row. Override via the ' +
        '`non-working` / default slots; theme with `--gantt-nonworking-bg`. See ' +
        'Components/GanttNonWorking.',
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
    summaryStyle: {
      control: 'inline-radio',
      options: ['bracket', 'bar'],
      description:
        'How rolled-up rows (WBS tree parents, row groups) draw their summary when ' +
        'expanded: `bracket` (default) is a thin span line, `bar` (legacy) a filled ' +
        'progress bar. Collapsed rows are always a filled bar. See the `Grouping` story.',
    },
    columnWidth: { control: { type: 'number', min: 4, max: 200 } },
    rowHeight: { control: { type: 'number', min: 16, max: 80 } },
    headerRowHeight: { control: { type: 'number', min: 16, max: 60 } },
    sidebarWidth: { control: { type: 'number', min: 80, max: 400 } },
    height: {
      control: { type: 'number', min: 120, max: 800 },
      description: 'Scroll viewport height (enables virtualization).',
    },
    draggable: { control: 'boolean', description: 'Drag bars to change start/end.' },
    rowMovable: { control: 'boolean', description: 'Drag a task into another row.' },
    resizable: {
      control: 'boolean',
      description: 'Resize bars by dragging an edge (sides flip past each other).',
    },
    progressDraggable: {
      control: 'boolean',
      description: 'Edit progress by dragging a handle on the bar.',
    },
    linkable: {
      control: 'boolean',
      description: 'Create/edit dependencies by dragging between tasks.',
    },
    keyboard: {
      control: 'boolean',
      description:
        'Make bars/milestones keyboard-focusable (`role="button"`, `tabindex="0"`, ' +
        'a descriptive `aria-label`, a focus ring) and operable with Enter/Space. ' +
        'Also labels the chart root as a landmark (slice 1: no arrow-key navigation yet).',
    },
    ariaLabel: {
      control: 'text',
      description: 'Accessible name for the chart landmark (used when `keyboard` is on).',
    },
    tooltip: {
      control: 'boolean',
      description: 'Show a hover tooltip on bars/milestones (tap toggles it on touch).',
    },
    touchTargets: {
      control: 'boolean',
      description:
        'Enlarge interactive hit areas for touch (also automatic on coarse pointers).',
    },
    criticalPath: {
      control: 'boolean',
      description: 'Highlight the tasks on the critical path (`data-critical`).',
    },
    slack: {
      control: 'boolean',
      description: "Draw each task's free-float slack as a translucent bar.",
    },
    snapToGrid: {
      control: 'boolean',
      description: 'Snap dragged dates to the base unit (off = full precision).',
    },
    autoSchedule: {
      control: 'boolean',
      description:
        'Push finish-to-start successors forward on a move/resize/link change ' +
        '(MS-Project style). Effective only with `v-model:rows`.',
    },
    timelineMode: {
      control: 'select',
      options: ['fixed', 'infinite'],
      description: 'Edge behaviour: `infinite` auto-extends the range when scrolled to an edge.',
    },
    today: { control: 'text' },
    labelFormat: { control: 'text' },
    locale: {
      control: false,
      description:
        'date-fns `Locale` for all date labels. Import it yourself ' +
        "(e.g. `import { ru } from 'date-fns/locale'`) and pass the object.",
    },
    weekStartsOn: {
      control: 'select',
      options: [0, 1, 2, 3, 4, 5, 6],
      description:
        "First day of the week (0=Sunday … 6=Saturday). Overrides the `locale`'s own " +
        'week start; falls back to the locale, then Sunday. Affects week-tier column ' +
        "boundaries, the week `w` number label, and week snapping.",
    },
    'onZoom-change': { action: 'zoom-change', table: { category: 'events' } },
    'onRange-change': { action: 'range-change', table: { category: 'events' } },
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
          {
            id: 'research',
            name: 'Research',
            start: '2026-04-01',
            end: '2026-04-18',
            progress: 100,
          },
          {
            id: 'spec',
            name: 'Spec',
            start: '2026-04-20',
            end: '2026-05-04',
            progress: 100,
            dependencies: ['research'],
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
            start: '2026-05-04',
            end: '2026-05-25',
            progress: 70,
            dependencies: ['spec'],
          },
        ],
      },
      {
        id: 'dev',
        name: 'Development',
        tasks: [
          {
            id: 'build',
            name: 'Implementation',
            start: '2026-05-25',
            end: '2026-06-22',
            progress: 30,
            dependencies: ['design'],
          },
          {
            id: 'ship',
            name: 'Ship',
            type: 'milestone',
            start: '2026-06-29',
            dependencies: ['build'],
          },
        ],
      },
    ],
  },
}

/**
 * `labelFormat` accepts a per-tier map of date-fns formats, so each header row
 * reads differently: full month + year up top, ISO week in the middle, day-of-month
 * with a weekday at the bottom. Tiers left out of the map keep their defaults.
 * (A bare string would instead format the base unit only; a `(date, tier) => string`
 * function gives full control.)
 */
export const PerTierLabelFormat: Story = {
  args: {
    tiers: ['month', 'week', 'day'],
    columnWidth: 44,
    labelFormat: {
      month: 'LLLL yyyy',
      week: "'W'w",
      day: 'd EEEEE',
    },
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
  render: args => ({
    components: { Gantt },
    setup() {
      // Own a local copy so the drag actually moves tasks in this demo.
      const rows = ref<GanttRow[]>(JSON.parse(JSON.stringify(sampleRows)))
      function onMove(e: GanttMoveEvent) {
        for (const row of rows.value) row.tasks = (row.tasks ?? []).filter(t => t.id !== e.id)
        const target = rows.value.find(r => r.id === e.toRowId)
        if (target)
          target.tasks = [...(target.tasks ?? []), { id: e.id, start: e.start, end: e.end }]
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
  args: {
    draggable: true,
    rowMovable: true,
    resizable: true,
    progressDraggable: true,
    linkable: true,
  },
  render: args => ({
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
  render: args => ({
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
      {
        id: 'gr-api',
        name: 'API',
        groupId: 'g-be',
        tasks: [{ id: 'g-api', name: 'API', start: '2026-06-01', end: '2026-06-10', progress: 80 }],
      },
      {
        id: 'gr-db',
        name: 'Database',
        groupId: 'g-be',
        tasks: [
          { id: 'g-db', name: 'Schema', start: '2026-06-06', end: '2026-06-14', progress: 40 },
        ],
      },
      {
        id: 'gr-ui',
        name: 'UI',
        groupId: 'g-fe',
        tasks: [
          { id: 'g-ui', name: 'Components', start: '2026-06-10', end: '2026-06-20', progress: 20 },
        ],
      },
      {
        id: 'gr-ux',
        name: 'UX',
        groupId: 'g-fe',
        tasks: [{ id: 'g-ux', name: 'Flows', start: '2026-06-12', end: '2026-06-18' }],
      },
    ],
    tiers: ['month', 'week', 'day'],
    height: 300,
  },
}

/**
 * Custom timeline **periods** (e.g. sprints): each renders a faint background band
 * over the chart body + a labelled row in the header. Group the *time axis*, not
 * the rows. Pass your own `periods` list (uneven spans, custom labels) or build a
 * regular cadence with the exported `sprintPeriods` helper. Customize via the
 * `period-bands` / `period` slots and the `--gantt-period-*` tokens — see
 * `Components/GanttPeriods` for the full API.
 */
const sprintArgs: Story['args'] = {
  periods: sprintPeriods({ from: '2026-06-01', every: 2, unit: 'week', count: 4 }),
  tiers: ['month', 'week', 'day'],
  height: 300,
}

export const Sprints: Story = {
  args: { ...sprintArgs },
}

/**
 * Replace each period's **header label** with the `period` slot (`{ period }`).
 * You get the resolved period (`id`, `label`, `start`/`end`, `meta`); here it renders
 * a runner icon before the sprint name. The background bands are untouched.
 */
export const SprintsHeaderSlot: Story = {
  args: { ...sprintArgs },
  render: args => ({
    components: { Gantt },
    setup: () => ({ args }),
    template: `
      <Gantt v-bind="args">
        <template #period="{ period }">
          <span style="display:inline-flex;align-items:center;gap:4px;font-weight:700;color:#6366f1">
            🏃 {{ period.label }}
          </span>
        </template>
      </Gantt>`,
  }),
}

/**
 * Replace the whole body **band layer** with the `period-bands` slot (`{ periods }`).
 * Each `ResolvedPeriod` carries pixel geometry (`x` / `width`) and an `index` for the
 * alternating fill, so you can paint the bands yourself — here as tinted, alternating
 * full-height columns behind the bars.
 */
export const SprintsBandSlot: Story = {
  args: { ...sprintArgs },
  render: args => ({
    components: { Gantt },
    setup: () => ({ args }),
    template: `
      <Gantt v-bind="args">
        <template #period-bands="{ periods }">
          <div style="position:absolute;inset:0;pointer-events:none">
            <div
              v-for="p in periods"
              :key="p.id"
              :style="{
                position: 'absolute', top: 0, bottom: 0,
                left: p.x + 'px', width: p.width + 'px',
                background: p.index % 2 ? 'rgba(16,185,129,.10)' : 'rgba(99,102,241,.10)',
                borderLeft: '1px dashed #cbd5e1',
              }"
            />
          </div>
        </template>
      </Gantt>`,
  }),
}

/**
 * A **working calendar**: shade non-working time (weekends, holidays, custom off
 * spans) as a faint background band. `true` shades Saturday/Sunday; pass a
 * `NonWorkingCalendar` (`weekends`, `holidays`, `periods`) for full control. Unlike
 * `periods` above, it's purely decorative — it never adds a header row and never
 * extends the auto date range, it only tints time already on the chart. Here the
 * default weekends are shaded plus a single holiday (Jun 19). Override via the
 * `non-working` slot; theme with `--gantt-nonworking-bg` — see
 * `Components/GanttNonWorking` for the full API.
 */
export const NonWorkingCalendar: Story = {
  args: {
    nonWorking: { holidays: ['2026-06-19'] },
    tiers: ['month', 'week', 'day'],
    height: 300,
  },
}

/**
 * Localize every date label — column headers, drag labels and tooltips — by passing
 * a date-fns `Locale`. Import the locale yourself (locales are not bundled), e.g.
 * `import { de } from 'date-fns/locale'`, then `<Gantt :locale="de" …>`. Here the
 * month/week headers render in German. Pair it with `labelFormat` for locale-aware
 * custom formats. (RTL layout is not part of this — a separate concern.)
 */
export const Localized: Story = {
  args: {
    locale: de,
    tiers: ['month', 'week', 'day'],
    tooltip: true,
    height: 300,
  },
}

/**
 * Opt in to the hover tooltip with the `tooltip` prop: hover any bar or
 * milestone to see a floating summary. The default content is the name plus
 * `start – end` and `progress%` for a bar, or the name plus the date for a
 * milestone. It's hidden while dragging.
 */
export const Tooltip: Story = {
  args: { tooltip: true },
}

/**
 * `keyboard` makes every bar/milestone focusable and operable via a roving tab
 * stop: Tab into the chart once (the first task in the first row), see the
 * focus ring, and press Enter/Space to fire the same click event a mouse would.
 * From there the arrow keys move focus without re-tabbing — Left/Right step to
 * the previous/next task in the same row, Up/Down jump to the closest-by-start
 * task in the nearest non-empty row above/below, and Home/End jump to the
 * first/last task in the row — auto-scrolling the target into view. The chart
 * root also gets a labelled landmark (`ariaLabel`, defaults to `'Gantt chart'`).
 * This is slice 2 of the a11y layer — no keyboard drag/resize or `grid`/`row`
 * ARIA roles yet.
 */
export const Keyboard: Story = {
  args: { keyboard: true, ariaLabel: 'Project timeline' },
}

/**
 * Override the tooltip content with the scoped `tooltip` slot (`{ task }`).
 * Providing the slot also enables the tooltip — the `tooltip` prop isn't needed.
 */
export const CustomTooltipSlot: Story = {
  render: args => ({
    components: { Gantt },
    setup: () => ({ args }),
    template: `
      <Gantt v-bind="args">
        <template #tooltip="{ task }">
          <strong>{{ task.name }}</strong>
          <span style="opacity:.8">{{ task.progress }}% complete</span>
        </template>
      </Gantt>`,
  }),
}

/**
 * A zoom level is a view-mode preset (a named `tiers` + `columnWidth` bundle).
 * Drop the headless `<GanttZoom>` control into the `corner` slot and bind the
 * active level id with `v-model:zoom`: the − / select / + control switches
 * presets (`DEFAULT_ZOOM_LEVELS` by default), overriding the `tiers`/`columnWidth`
 * props. `zoom-change` fires on every switch.
 */
export const Zoom: Story = {
  args: { height: 300 },
  render: args => ({
    components: { Gantt, GanttZoom },
    setup() {
      const zoom = ref('week')
      return { args, zoom }
    },
    template: `
      <Gantt v-bind="args" v-model:zoom="zoom">
        <template #corner>
          <GanttZoom />
        </template>
      </Gantt>`,
  }),
}

/** Override a bar's content with the `bar` slot. */
export const CustomBarSlot: Story = {
  render: args => ({
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
 * Tag items with a free-form `variant` to render each category differently.
 * The prop-driven render looks for a `task-${variant}` slot for a bar (and a
 * `milestone-${variant}` slot for a marker); if none is provided it falls back
 * to the generic `bar` / `milestone` slot, then to the built-in default. Here
 * `design` and `dev` bars get their own look, `release` milestones get a labeled
 * flag, and an un-tagged bar (`variant` omitted) falls through to `#bar`.
 */
export const TypedItemSlots: Story = {
  render: () => ({
    components: { Gantt },
    setup: () => ({
      rows: [
        {
          id: 'r1',
          name: 'Design',
          tasks: [{ id: 'a', name: 'Wireframes', start: '2026-01-01', end: '2026-01-06', variant: 'design' }],
        },
        {
          id: 'r2',
          name: 'Build',
          tasks: [
            { id: 'b', name: 'API', start: '2026-01-04', end: '2026-01-12', variant: 'dev' },
            { id: 'c', name: 'Chore', start: '2026-01-13', end: '2026-01-16' },
          ],
        },
        {
          id: 'r3',
          name: 'Ship',
          tasks: [{ id: 'm', name: 'v1.0', type: 'milestone', start: '2026-01-18', variant: 'release' }],
        },
      ],
    }),
    template: `
      <Gantt :rows="rows" unit="day">
        <template #task-design="{ task }">
          <span style="padding:0 8px;font-size:.72em;font-weight:600;color:#7c3aed">🎨 {{ task.name }}</span>
        </template>
        <template #task-dev="{ task, progress }">
          <span style="padding:0 8px;font-size:.72em;font-weight:600;color:#0369a1">⚙️ {{ task.name }} · {{ progress }}%</span>
        </template>
        <template #milestone-release="{ task }">
          <span style="display:inline-block;padding:1px 6px;font-size:.68em;font-weight:700;white-space:nowrap;color:#fff;background:#16a34a;border-radius:4px;transform:translateX(-50%)">🚀 {{ task.name }}</span>
        </template>
        <template #bar="{ task }">
          <span style="padding:0 8px;font-size:.72em;opacity:.75">{{ task.name }}</span>
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
  render: args => ({
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

/**
 * Two opt-in schedule overlays. `critical-path` highlights the longest
 * finish-to-start chain (`spec → design → build → ship`) — those bars/markers get
 * `data-critical`, styled via `--gantt-critical-*`. `slack` draws each task's free
 * float (the gap to its nearest successor's start) as a translucent bar, styled via
 * `--gantt-slack-*`: here `spec` and `qa` finish well before their successors begin,
 * so a slack bar trails them; the critical-path tasks are back-to-back, so they have
 * none. The `criticalPath` / `slack` utilities expose the same numbers headless.
 */
export const CriticalPathAndSlack: Story = {
  args: {
    criticalPath: true,
    slack: true,
    tiers: ['month', 'week', 'day'],
    columnWidth: 40,
    height: 300,
    rows: [
      {
        id: 'planning',
        name: 'Planning',
        tasks: [
          // Finishes Jun-08 but `design` only starts Jun-12 → 4 days of slack.
          { id: 'spec', name: 'Spec', start: '2026-06-01', end: '2026-06-08', progress: 100 },
        ],
      },
      {
        id: 'design',
        name: 'Design',
        tasks: [
          {
            id: 'design',
            name: 'Design',
            start: '2026-06-12',
            end: '2026-06-20',
            progress: 60,
            dependencies: ['spec'],
          },
        ],
      },
      {
        id: 'dev',
        name: 'Development',
        tasks: [
          {
            id: 'build',
            name: 'Implementation',
            start: '2026-06-20',
            end: '2026-06-30',
            progress: 30,
            dependencies: ['design'],
          },
        ],
      },
      {
        id: 'qa',
        name: 'QA',
        tasks: [
          // Off the critical path; finishes Jun-18 but `ship` waits → slack.
          {
            id: 'qa',
            name: 'Testing',
            start: '2026-06-12',
            end: '2026-06-18',
            progress: 20,
            dependencies: ['spec'],
          },
        ],
      },
      {
        id: 'release',
        name: 'Release',
        tasks: [
          {
            id: 'ship',
            name: 'Ship',
            type: 'milestone',
            start: '2026-06-30',
            dependencies: ['build', 'qa'],
          },
        ],
      },
    ],
  },
}

/**
 * `critical-path` on its own: only the longest finish-to-start chain
 * (`spec → design → build → review`) is highlighted via `data-critical` (styled with
 * `--gantt-critical-*`); no slack overlay. The `criticalPath(rows)` utility returns
 * the same ids headless.
 */
export const CriticalPath: Story = {
  args: {
    criticalPath: true,
    tiers: ['month', 'week', 'day'],
    height: 260,
  },
}

/**
 * `timeline-mode="infinite"`: scroll to either horizontal edge and the axis extends by
 * one screenful of dates so you can pan indefinitely. Prepending dates on the left
 * corrects the scroll so the view stays anchored. A `range-change` event fires on
 * every edge reach (watch the Actions panel) — in `infinite` mode the bounds are
 * already applied; in `fixed` mode you'd use it to widen `startDate`/`endDate`
 * yourself. Column virtualization keeps the DOM bounded however far you scroll.
 */
export const InfiniteTimeline: Story = {
  args: {
    timelineMode: 'infinite',
    tiers: ['month', 'week', 'day'],
    columnWidth: 36,
    height: 260,
  },
}

/**
 * `downloadCSV(rows)` serializes the tasks to an RFC-4180 CSV file and triggers a
 * browser download (one line per task, with its row's id/name as leading columns).
 * `toCSV(rows, options)` returns the string for custom handling — override the
 * `columns`, `delimiter`, `dateFormat`, etc.
 */
export const ExportCsv: Story = {
  render: (args) => ({
    components: { Gantt },
    setup: () => ({ args, exportCsv: () => downloadCSV(args.rows ?? [], 'gantt.csv') }),
    template: `
      <div>
        <button type="button" style="margin-bottom:8px" @click="exportCsv">Export CSV</button>
        <Gantt v-bind="args" />
      </div>`,
  }),
}
