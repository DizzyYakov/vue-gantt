import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Gantt from '../components/Gantt.vue'
import GanttBaselines from '../components/GanttBaselines.vue'
import type { GanttRow } from '../types'

// Each task carries a baseline (planned) interval alongside its actual
// start/end, so the thin shadow bar sits under the actual bar. The three tasks
// show the three cases: late, early, and on plan.
const rows: GanttRow[] = [
  {
    id: 'design',
    name: 'Design (late)',
    tasks: [
      {
        id: 'design',
        name: 'Design',
        // Actual runs later and longer than planned.
        start: '2026-06-04',
        end: '2026-06-16',
        baselineStart: '2026-06-02',
        baselineEnd: '2026-06-12',
        progress: 60,
      },
    ],
  },
  {
    id: 'build',
    name: 'Build (early)',
    tasks: [
      {
        id: 'build',
        name: 'Implementation',
        // Actual starts and finishes ahead of plan.
        start: '2026-06-14',
        end: '2026-06-22',
        baselineStart: '2026-06-16',
        baselineEnd: '2026-06-26',
        progress: 40,
      },
    ],
  },
  {
    id: 'qa',
    name: 'QA (on plan)',
    tasks: [
      {
        id: 'testing',
        name: 'Testing',
        // Actual matches the baseline exactly.
        start: '2026-06-22',
        end: '2026-06-28',
        baselineStart: '2026-06-22',
        baselineEnd: '2026-06-28',
        progress: 10,
      },
    ],
  },
]

/**
 * A **baseline** is the planned interval for a task. Give a task both
 * `baselineStart` and `baselineEnd` and it renders as a thin "shadow" bar at the
 * bottom of the row band, under the actual (`start`/`end`) bar — so slippage
 * between plan and reality is visible at a glance. Both fields are required for
 * the shadow to draw. The layer is `<GanttBaselines>` (auto-mounted; override via
 * the `baselines` slot), themed with the `--gantt-baseline-*` variables.
 */
const meta: Meta<typeof Gantt> = {
  title: 'Guides/Baselines',
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
 * The default `<GanttBaselines>` layer: a thin shadow bar per task with a
 * baseline. Design runs late (actual bar past its plan), Build is ahead, and QA
 * sits exactly on plan.
 */
export const Default: Story = {}

/**
 * `<GanttBaselines>` exposes a default slot `{ task }` to render each baseline
 * segment yourself. Here the `baselines` section slot swaps in a hatched fill
 * per baseline via a custom `<GanttBaselines>`.
 */
export const CustomSegment: Story = {
  render: args => ({
    components: { Gantt, GanttBaselines },
    setup: () => ({ args }),
    template: `
      <Gantt v-bind="args">
        <template #baselines>
          <GanttBaselines>
            <template #default="{ task }">
              <div
                :title="task.name"
                :style="{
                  width: '100%',
                  height: '100%',
                  backgroundImage:
                    'repeating-linear-gradient(45deg, #94a3b8 0 3px, transparent 3px 6px)',
                  borderRadius: '2px',
                }"
              />
            </template>
          </GanttBaselines>
        </template>
      </Gantt>
    `,
  }),
}
