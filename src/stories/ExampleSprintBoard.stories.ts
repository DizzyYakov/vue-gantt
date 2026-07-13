import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Gantt from '../components/Gantt.vue'
import type { GanttGroup, GanttRow } from '../types'
import { sprintPeriods } from '../utils'

/**
 * # Example — Sprint board / release timeline
 *
 * A team delivery view built from three layers stacked over one timeline:
 * **row groups** (`groups` + `row.groupId`) fold the rows into collapsible team
 * bands in the sidebar; **timeline periods** (`periods`) paint the two-week sprint
 * windows across the body and header — generated on a regular cadence with the
 * exported `sprintPeriods({ from, every, unit, count })` helper; and **`today`**
 * highlights the current day's column, marking the current sprint (set here to a
 * fixed date so the screenshot is deterministic). The separate live today *line*
 * always tracks the real clock and is independent of this prop.
 *
 * Props in play: `rows` (with `groupId`), `groups`, `periods`, `today`, `tiers`.
 *
 * Uses an explicit `render` (instead of relying on Storybook's zero-config
 * args-to-template) because `Gantt` exposes both a `today` **prop** and a
 * same-named `today` **slot** — Storybook's default renderer would otherwise
 * bind the `today` arg to the slot and print it as literal text instead of
 * rendering the chart's built-in today line.
 */
const groups: GanttGroup[] = [
  { id: 'product', name: 'Product & Design' },
  { id: 'frontend', name: 'Frontend' },
  { id: 'backend', name: 'Backend' },
]

const rows: GanttRow[] = [
  {
    id: 'design',
    name: 'Design',
    groupId: 'product',
    tasks: [
      { id: 'flows', name: 'User flows', start: '2026-06-15', end: '2026-06-26', progress: 100 },
      { id: 'polish', name: 'Visual polish', start: '2026-07-13', end: '2026-07-24', progress: 20 },
    ],
  },
  {
    id: 'pm',
    name: 'Delivery',
    groupId: 'product',
    tasks: [{ id: 'release-notes', name: 'Release notes', start: '2026-08-10', end: '2026-08-21', progress: 0 }],
  },
  {
    id: 'web',
    name: 'Web app',
    groupId: 'frontend',
    tasks: [
      { id: 'ui-kit', name: 'UI kit', start: '2026-06-15', end: '2026-06-29', progress: 100 },
      { id: 'screens', name: 'Screens', start: '2026-06-29', end: '2026-07-24', progress: 45 },
    ],
  },
  {
    id: 'mobile',
    name: 'Mobile',
    groupId: 'frontend',
    tasks: [{ id: 'rn', name: 'React Native shell', start: '2026-07-13', end: '2026-08-07', progress: 10 }],
  },
  {
    id: 'api',
    name: 'API',
    groupId: 'backend',
    tasks: [
      { id: 'endpoints', name: 'Endpoints', start: '2026-06-15', end: '2026-07-10', progress: 70 },
      { id: 'hardening', name: 'Hardening', start: '2026-07-27', end: '2026-08-14', progress: 0 },
    ],
  },
  {
    id: 'infra',
    name: 'Infra',
    groupId: 'backend',
    tasks: [{ id: 'pipeline', name: 'CI/CD pipeline', start: '2026-06-22', end: '2026-07-13', progress: 90 }],
  },
]

// Five back-to-back two-week sprints from mid-June — spanning the whole plan.
const periods = sprintPeriods({ from: '2026-06-15', every: 2, unit: 'week', count: 5 })

const meta: Meta<typeof Gantt> = {
  title: 'Examples/Sprint board',
  component: Gantt,
  tags: ['autodocs'],
  args: {
    rows,
    groups,
    periods,
    today: '2026-07-13',
    tiers: ['month', 'week'],
    columnWidth: 90,
    rowHeight: 34,
    height: 360,
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

/** Three team bands over five sprint windows, with the today line in Sprint 3. */
export const Default: Story = {}
