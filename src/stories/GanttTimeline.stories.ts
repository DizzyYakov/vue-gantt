import type { Meta, StoryObj } from '@storybook/vue3-vite'
import GanttTimeline from '../components/GanttTimeline.vue'
import { declarativeChart } from './_shared'

/**
 * The axis header. Renders one boundary-aligned row per configured tier
 * (year → minute), with labels that stick to the viewport's left edge so the
 * current period stays readable while scrolling. Use the `column` slot to
 * customise a cell.
 */
const meta: Meta<typeof GanttTimeline> = {
  title: 'Components/GanttTimeline',
  component: GanttTimeline,
  tags: ['autodocs'],
  render: declarativeChart(),
}
export default meta

export const Default: StoryObj<typeof GanttTimeline> = {}
