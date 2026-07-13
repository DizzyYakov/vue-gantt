import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Gantt from '../components/Gantt.vue'
import type { GanttRow } from '../types'

/**
 * # Example — Project roadmap
 *
 * A product roadmap assembled from the library's scheduling primitives: **phases**
 * as rows, **milestones** (`type: 'milestone'`) for the gates, finish-to-start
 * **`dependencies`** that chain the work, and **`criticalPath`** to highlight the
 * longest chain — the tasks that push out the launch if they slip. **`today`**
 * highlights the current day's column in the header/grid (set here to a fixed
 * date so the screenshot is deterministic); the separate live today *line*
 * always tracks the real clock and is independent of this prop.
 *
 * Props in play: `rows` (phase → tasks/milestones with `dependencies`),
 * `criticalPath`, `today`, `tiers`. Copy the data shape and drop in your own
 * phases to get a working roadmap.
 *
 * Uses an explicit `render` (instead of relying on Storybook's zero-config
 * args-to-template) because `Gantt` exposes both a `today` **prop** and a
 * same-named `today` **slot** — Storybook's default renderer would otherwise
 * bind the `today` arg to the slot and print it as literal text instead of
 * rendering the chart's built-in today line.
 */
const rows: GanttRow[] = [
  {
    id: 'discovery',
    name: 'Discovery',
    tasks: [
      { id: 'research', name: 'Research & scope', start: '2026-06-01', end: '2026-06-12', progress: 100 },
    ],
  },
  {
    id: 'design',
    name: 'Design',
    tasks: [
      {
        id: 'ux',
        name: 'UX & visual design',
        start: '2026-06-12',
        end: '2026-06-26',
        progress: 90,
        dependencies: ['research'],
      },
      {
        id: 'design-signoff',
        name: 'Design sign-off',
        type: 'milestone',
        start: '2026-06-26',
        dependencies: ['ux'],
      },
    ],
  },
  {
    id: 'build',
    name: 'Build',
    tasks: [
      {
        id: 'backend',
        name: 'Backend',
        start: '2026-06-26',
        end: '2026-07-22',
        progress: 55,
        dependencies: ['ux'],
      },
      {
        id: 'frontend',
        name: 'Frontend',
        start: '2026-06-29',
        end: '2026-07-24',
        progress: 40,
        dependencies: ['ux'],
      },
    ],
  },
  {
    id: 'qa',
    name: 'Quality',
    tasks: [
      {
        id: 'qa',
        name: 'QA & hardening',
        start: '2026-07-24',
        end: '2026-08-07',
        progress: 5,
        dependencies: ['backend', 'frontend'],
      },
    ],
  },
  {
    id: 'launch',
    name: 'Launch',
    tasks: [
      { id: 'beta', name: 'Beta', type: 'milestone', start: '2026-08-07', dependencies: ['qa'] },
      { id: 'ga', name: 'GA release', type: 'milestone', start: '2026-08-14', dependencies: ['beta'] },
    ],
  },
]

const meta: Meta<typeof Gantt> = {
  title: 'Examples/Project roadmap',
  component: Gantt,
  tags: ['autodocs'],
  args: {
    rows,
    criticalPath: true,
    today: '2026-07-13',
    tiers: ['month', 'week', 'day'],
    columnWidth: 30,
    rowHeight: 38,
    height: 340,
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

/** The full roadmap with the critical chain highlighted
 *  (`research → ux → backend → qa`). The trailing gate milestones (`beta`,
 *  `ga`) depend on that chain but aren't drawn critical themselves —
 *  `criticalPath` extends through positive-duration tasks only, so a chain of
 *  zero-duration milestones tacked onto the end isn't included. */
export const Default: Story = {}
