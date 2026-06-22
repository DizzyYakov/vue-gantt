import type { Meta, StoryObj } from '@storybook/vue3-vite'
import GanttDependencies from '../components/GanttDependencies.vue'
import { declarativeChart } from './_shared'

/**
 * An SVG overlay drawing finish-to-start arrows between tasks based on each
 * task's `dependencies`. The arrowhead always enters the successor's start from
 * the left. Use the default slot to fully customise the rendered links.
 */
const meta: Meta<typeof GanttDependencies> = {
  title: 'Components/GanttDependencies',
  component: GanttDependencies,
  tags: ['autodocs'],
  render: declarativeChart(),
}
export default meta

export const Default: StoryObj<typeof GanttDependencies> = {}
