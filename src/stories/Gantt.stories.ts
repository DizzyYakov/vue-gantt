import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Gantt from '../components/Gantt.vue'
import { sampleRows } from './_shared'

/**
 * `Gantt` is the prop-driven wrapper: pass `rows` (each row holds a list of
 * tasks) and it renders the full chart — frozen header/sidebar, multi-tier
 * timeline, grid, dependency arrows and the live "today" line — with row/column
 * virtualization when `height` is set. Named slots override any part.
 *
 * This page is the controllable playground for the wrapper and its full prop
 * surface. Individual features have their own pages — see the **Guides/** section
 * (interactions, grouping, theming, critical path, export, accessibility, …) and
 * the per-component **Components/** pages.
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
        'progress bar. Collapsed rows are always a filled bar. See Guides/Row grouping.',
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
        'a descriptive `aria-label`, a focus ring), operable with Enter/Space, and ' +
        'arrow-key navigable (roving focus). With `draggable`/`resizable`, ' +
        'Shift/Alt+Left/Right also move/resize the focused task. ' +
        'Also labels the chart root as a landmark. See Guides/Accessibility.',
    },
    ariaLabel: {
      control: 'text',
      description: 'Accessible name for the chart landmark (used when `keyboard` is on).',
    },
    cellCreatable: {
      control: 'boolean',
      description:
        'Drag across an empty grid row to create a task (emits `create`); a plain ' +
        'click below the drag threshold still fires `cell-click`.',
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
    onCreate: { action: 'create', table: { category: 'events' } },
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
 * Opt in to the hover tooltip with the `tooltip` prop: hover any bar or
 * milestone to see a floating summary. The default content is the name plus
 * `start – end` and `progress%` for a bar, or the name plus the date for a
 * milestone. It's hidden while dragging.
 */
export const Tooltip: Story = {
  args: { tooltip: true },
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
