import type { Meta, StoryObj } from '@storybook/vue3-vite'
import GanttTaskList from '../components/GanttTaskList.vue'
import { declarativeChart } from './_shared'

/**
 * The frozen left sidebar. It lists the **rows** (not individual tasks) and is
 * row-virtualized. Use the `row` slot to customise a row's label/content.
 */
const meta: Meta<typeof GanttTaskList> = {
  title: 'Components/GanttTaskList',
  component: GanttTaskList,
  tags: ['autodocs'],
  render: declarativeChart(),
}
export default meta

export const Default: StoryObj<typeof GanttTaskList> = {}
