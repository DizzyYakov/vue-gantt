import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Gantt from '../components/Gantt.vue'
import type { GanttRow } from '../types'

// A "split" task carries `segments` — work spans with paused gaps between them.
// The task's own start/end set the overall extent; the segments are drawn inside
// it, bridged by a thin connecting line across the pauses.
const rows: GanttRow[] = [
  {
    id: 'build',
    name: 'Build',
    tasks: [
      {
        id: 'impl',
        name: 'Implementation',
        start: '2026-06-01',
        end: '2026-06-24',
        progress: 55,
        segments: [
          { start: '2026-06-01', end: '2026-06-07' },
          { start: '2026-06-11', end: '2026-06-16' },
          { start: '2026-06-20', end: '2026-06-24' },
        ],
      },
    ],
  },
  {
    id: 'qa',
    name: 'QA',
    tasks: [
      { id: 'testing', name: 'Testing', start: '2026-06-16', end: '2026-06-26', progress: 20 },
    ],
  },
]

/**
 * A task with `segments` renders as a **split task**: its work spans are drawn as
 * separate segments inside one bar, with paused gaps bridged by a thin connecting
 * line. The task's `start`/`end` still define the overall extent. Progress is
 * **cumulative** — the overall `progress` fills across the segments' combined
 * working time, so earlier segments fill first. Drag/resize move the whole task;
 * the segments are visual.
 */
const meta: Meta<typeof Gantt> = {
  title: 'Guides/Split tasks',
  component: Gantt,
  tags: ['autodocs'],
  args: {
    rows,
    tiers: ['month', 'week', 'day'],
    columnWidth: 34,
    rowHeight: 40,
    height: 200,
  },
}
export default meta

type Story = StoryObj<typeof Gantt>

/** Three work spans with paused gaps; the fill flows across them (55% overall). */
export const Basic: Story = {}
