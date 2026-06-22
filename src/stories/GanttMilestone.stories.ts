import type { Meta, StoryObj } from '@storybook/vue3-vite'
import GanttMilestone from '../components/GanttMilestone.vue'
import { declarativeChart } from './_shared'

/**
 * A point-in-time marker (diamond) on its row — `end` is ignored and collapsed
 * onto `start`. Same declarative/presentational modes and drag support as
 * `GanttTask`. The default slot overrides the marker.
 */
const meta: Meta<typeof GanttMilestone> = {
  title: 'Components/GanttMilestone',
  component: GanttMilestone,
  tags: ['autodocs'],
  render: declarativeChart(),
}
export default meta

export const Default: StoryObj<typeof GanttMilestone> = {}
