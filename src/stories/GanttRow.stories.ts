import type { Meta, StoryObj } from '@storybook/vue3-vite'
import GanttRow from '../components/GanttRow.vue'
import { declarativeChart } from './_shared'

/**
 * Declares a row and provides its id to descendant `GanttTask` / `GanttMilestone`
 * components, which register their bars into it. Tasks can be supplied either as
 * nested children or via the `tasks` prop. A row renders nothing itself — it is
 * a logical container; the sidebar entry comes from its `name`.
 */
const meta: Meta<typeof GanttRow> = {
  title: 'Components/GanttRow',
  component: GanttRow,
  tags: ['autodocs'],
  render: declarativeChart(),
}
export default meta

export const Default: StoryObj<typeof GanttRow> = {}
