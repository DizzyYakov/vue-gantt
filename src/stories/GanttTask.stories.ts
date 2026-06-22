import type { Meta, StoryObj } from '@storybook/vue3-vite'
import GanttTask from '../components/GanttTask.vue'
import { declarativeChart } from './_shared'

/**
 * A single bar (with progress fill) plotted on its row. Two modes:
 * - **declarative** — individual props (`id`, `start`, `end`, …) inside a
 *   `GanttRow`, which registers the task into that row;
 * - **presentational** — a resolved `task` object (used internally by `Gantt`).
 *
 * When `draggable`/`rowMovable` are enabled on the root, bars can be dragged
 * (full precision, with a translucent ghost + live time label). The default
 * slot overrides the bar's content.
 */
const meta: Meta<typeof GanttTask> = {
  title: 'Components/GanttTask',
  component: GanttTask,
  tags: ['autodocs'],
  render: declarativeChart(),
}
export default meta

export const Default: StoryObj<typeof GanttTask> = {}
