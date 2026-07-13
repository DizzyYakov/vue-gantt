import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Gantt from '../components/Gantt.vue'
import type { GanttRow } from '../types'

/**
 * # Example — Construction schedule
 *
 * A work-breakdown schedule with plan-vs-actual tracking. Rows nest into a
 * **WBS tree** via `parentId` (project → phases → work items), so each parent
 * shows a rolled-up **summary bar** over its subtree and folds from the sidebar
 * chevron. Every work item carries a **baseline** (`baselineStart`/`baselineEnd`,
 * the plan) alongside its actual `start`/`end`, so the thin shadow bar underneath
 * reveals slippage. **`nonWorking`** shades weekends so durations read against the
 * working calendar.
 *
 * Rows must be in **pre-order** (a parent immediately before its subtree). Props in
 * play: `rows` (with `parentId` + `baselineStart`/`baselineEnd`), `nonWorking`,
 * `today`, `tiers`.
 *
 * Uses an explicit `render` (instead of relying on Storybook's zero-config
 * args-to-template) because `Gantt` exposes both a `today` **prop** and a
 * same-named `today` **slot** — Storybook's default renderer would otherwise
 * bind the `today` arg to the slot and print it as literal text instead of
 * rendering the chart's built-in today line.
 */
const rows: GanttRow[] = [
  { id: 'project', name: 'Office fit-out', tasks: [] },

  {
    id: 'sitework',
    name: 'Site works',
    parentId: 'project',
    tasks: [],
  },
  {
    id: 'demo',
    name: 'Demolition',
    parentId: 'sitework',
    tasks: [
      {
        id: 'demo',
        name: 'Strip-out',
        start: '2026-06-01',
        end: '2026-06-12',
        baselineStart: '2026-06-01',
        baselineEnd: '2026-06-10',
        progress: 100,
      },
    ],
  },
  {
    id: 'services-rough',
    name: 'Rough-in services',
    parentId: 'sitework',
    tasks: [
      {
        id: 'rough',
        name: 'MEP rough-in',
        start: '2026-06-12',
        end: '2026-06-30',
        baselineStart: '2026-06-10',
        baselineEnd: '2026-06-26',
        progress: 80,
      },
    ],
  },

  {
    id: 'structure',
    name: 'Structure & fabric',
    parentId: 'project',
    tasks: [],
  },
  {
    id: 'partitions',
    name: 'Partitions',
    parentId: 'structure',
    tasks: [
      {
        id: 'partitions',
        name: 'Stud & board',
        start: '2026-06-29',
        end: '2026-07-17',
        baselineStart: '2026-06-26',
        baselineEnd: '2026-07-10',
        progress: 45,
      },
    ],
  },
  {
    id: 'ceilings',
    name: 'Ceilings',
    parentId: 'structure',
    tasks: [
      {
        id: 'ceilings',
        name: 'Suspended ceilings',
        start: '2026-07-17',
        end: '2026-07-31',
        baselineStart: '2026-07-10',
        baselineEnd: '2026-07-24',
        progress: 0,
      },
    ],
  },

  {
    id: 'finishes',
    name: 'Finishes',
    parentId: 'project',
    tasks: [],
  },
  {
    id: 'paint',
    name: 'Decoration',
    parentId: 'finishes',
    tasks: [
      {
        id: 'paint',
        name: 'Paint & finishes',
        start: '2026-07-31',
        end: '2026-08-14',
        baselineStart: '2026-07-24',
        baselineEnd: '2026-08-07',
        progress: 0,
      },
    ],
  },
  {
    id: 'handover',
    name: 'Handover',
    parentId: 'finishes',
    tasks: [
      { id: 'handover', name: 'Snagging & handover', type: 'milestone', start: '2026-08-17' },
    ],
  },
]

const meta: Meta<typeof Gantt> = {
  title: 'Examples/Construction schedule',
  component: Gantt,
  tags: ['autodocs'],
  args: {
    rows,
    nonWorking: true,
    today: '2026-07-13',
    tiers: ['month', 'week', 'day'],
    columnWidth: 26,
    rowHeight: 34,
    height: 440,
  },
  // Explicit render: see the class comment above — `today` collides with the
  // `today` slot under Storybook's zero-config args-to-template rendering.
  render: args => ({
    components: { Gantt },
    setup: () => ({ args }),
    template: `<Gantt v-bind="args" />`,
  }),
}
export default meta

type Story = StoryObj<typeof Gantt>

/** A three-level WBS with rolled-up phase bars, baseline shadows (plan vs actual)
 *  and weekend shading. Early tasks ran late, so their actual bars trail the plan. */
export const Default: Story = {}
