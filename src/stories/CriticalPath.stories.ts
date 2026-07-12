import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Gantt from '../components/Gantt.vue'
import { sampleRows } from './_shared'

/**
 * # Critical path & slack
 *
 * Two opt-in schedule overlays computed from the finish-to-start dependency graph:
 *
 * - `criticalPath` highlights the longest dependency chain — the tasks that, if
 *   delayed, push out the whole project. Those bars/markers get `data-critical`,
 *   styled via `--gantt-critical-*`.
 * - `slack` draws each task's **free float** (the gap to its nearest successor's
 *   start) as a translucent trailing bar, styled via `--gantt-slack-*`. Critical
 *   tasks are back-to-back, so they show no slack.
 *
 * Both are also available **headless**: the `criticalPath(rows)` and `slack(rows)`
 * utilities return the same ids/numbers for custom rendering or analysis.
 */
const meta: Meta<typeof Gantt> = {
  title: 'Guides/Critical path & slack',
  component: Gantt,
  tags: ['autodocs'],
  args: {
    rows: sampleRows,
    tiers: ['month', 'week', 'day'],
    columnWidth: 40,
    height: 260,
  },
}
export default meta

type Story = StoryObj<typeof Gantt>

/**
 * `criticalPath` on its own: only the longest finish-to-start chain
 * (`spec → design → build → review`) is highlighted via `data-critical` (styled with
 * `--gantt-critical-*`); no slack overlay. The `criticalPath(rows)` utility returns
 * the same ids headless.
 */
export const CriticalPath: Story = {
  args: { criticalPath: true },
}

/**
 * Both overlays together. `criticalPath` highlights the longest chain
 * (`spec → design → build → ship`); `slack` draws each off-critical task's free
 * float as a translucent bar — here `spec` and `qa` finish well before their
 * successors begin, so a slack bar trails them, while the critical-path tasks are
 * back-to-back and have none.
 */
export const CriticalPathAndSlack: Story = {
  args: {
    criticalPath: true,
    slack: true,
    columnWidth: 40,
    height: 300,
    rows: [
      {
        id: 'planning',
        name: 'Planning',
        tasks: [
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
