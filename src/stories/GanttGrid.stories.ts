import type { Meta, StoryObj } from '@storybook/vue3-vite'
import GanttGrid from '../components/GanttGrid.vue'
import { declarativeChart } from './_shared'

/**
 * Background grid for the body: vertical lines following a tier (the base unit
 * by default, override with `tier`) and one horizontal line per row, with a
 * subtle highlight on the column containing today. Place it first in the body
 * so bars render on top.
 */
const meta: Meta<typeof GanttGrid> = {
  title: 'Components/GanttGrid',
  component: GanttGrid,
  tags: ['autodocs'],
  render: declarativeChart(),
}
export default meta

export const Default: StoryObj<typeof GanttGrid> = {}
