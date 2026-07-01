import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Gantt from '../components/Gantt.vue'
import GanttDeadlines from '../components/GanttDeadlines.vue'
import type { GanttRow } from '../types'

// A row per feature, mixing a healthy task, an overdue one, and one whose start
// is pinned by a lower-bound constraint.
const rows: GanttRow[] = [
  {
    id: 'delivery',
    name: 'Delivery',
    tasks: [
      // Finishes before its deadline — on track (line, no overdue flag).
      {
        id: 'design',
        name: 'Design',
        start: '2026-06-02',
        end: '2026-06-12',
        progress: 100,
        deadline: '2026-06-15',
      },
      // Finishes past its deadline — the bar is flagged overdue (tint + outline)
      // and the deadline line sits to its left.
      {
        id: 'build',
        name: 'Build',
        start: '2026-06-10',
        end: '2026-06-26',
        progress: 40,
        deadline: '2026-06-20',
        dependencies: ['design'],
      },
    ],
  },
  {
    id: 'release',
    name: 'Release',
    tasks: [
      // start-no-earlier-than: `autoSchedule` would push the start to the date;
      // here it already starts on it, so the bar honors the constraint visibly.
      {
        id: 'ship',
        name: 'Ship',
        start: '2026-06-24',
        end: '2026-06-30',
        progress: 0,
        constraint: { type: 'start-no-earlier-than', date: '2026-06-24' },
        deadline: '2026-06-28',
      },
    ],
  },
]

/**
 * A task can carry a `deadline` (a target date) and/or a scheduling `constraint`.
 * `<GanttDeadlines>` (rendered by default) draws a vertical line at each deadline;
 * when a bar finishes past its deadline it's flagged **overdue** (tinted + outlined
 * via the `--gantt-overdue-*` / `--gantt-deadline-color` tokens). A `constraint`
 * `{ type, date }` pins scheduling — lower bounds (`*-no-earlier-than`, `must-*-on`)
 * are honored by `autoSchedule`; upper-bound breaches flag the bar as a violation.
 */
const meta: Meta<typeof Gantt> = {
  title: 'Guides/Deadlines & constraints',
  component: Gantt,
  tags: ['autodocs'],
  args: {
    rows,
    tiers: ['month', 'week', 'day'],
    columnWidth: 34,
    rowHeight: 40,
    height: 240,
  },
}
export default meta

type Story = StoryObj<typeof Gantt>

/**
 * `Build` finishes past its `deadline` (`2026-06-20`), so its bar is flagged
 * overdue and a red deadline line is drawn at the target date. `Design` finishes
 * before its deadline (just the line). `Ship` carries a `start-no-earlier-than`
 * constraint and starts exactly on its floor date.
 */
export const Default: Story = {}

/**
 * The `deadlines` section slot overrides the deadline overlay. Re-mount
 * `<GanttDeadlines>` and use its default slot — scoped `{ taskId, deadline }` — to
 * decorate each marker; here a small flag is pinned at the top of every deadline
 * line.
 */
export const LabelledDeadlines: Story = {
  render: args => ({
    components: { Gantt, GanttDeadlines },
    setup: () => ({ args }),
    template: `
      <Gantt v-bind="args">
        <template #deadlines>
          <GanttDeadlines>
            <template #default="{ taskId }">
              <span
                :style="{
                  position: 'absolute',
                  top: '-2px',
                  left: '2px',
                  fontSize: '10px',
                  lineHeight: 1,
                  padding: '1px 3px',
                  borderRadius: '3px',
                  whiteSpace: 'nowrap',
                  background: 'var(--gantt-deadline-color, #dc2626)',
                  color: '#fff',
                }"
              >{{ taskId }}</span>
            </template>
          </GanttDeadlines>
        </template>
      </Gantt>
    `,
  }),
}
