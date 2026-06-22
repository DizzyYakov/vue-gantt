import type { Meta, StoryObj } from '@storybook/vue3-vite'
import GanttRoot from '../components/GanttRoot.vue'
import { declarativeChart } from './_shared'

/**
 * Instead of the `Gantt` wrapper you can compose the pieces yourself. `GanttRoot`
 * provides the shared context (config + time scale); `GanttRow` declares a row
 * and the `GanttTask` / `GanttMilestone` inside it register into that row.
 * `GanttTimeline`, `GanttTaskList`, `GanttGrid`, `GanttDependencies` and
 * `GanttToday` all read the same context and position themselves on the scale.
 *
 * ```vue
 * <GanttRoot :tiers="['month','week','day']">
 *   <GanttTaskList />
 *   <GanttTimeline />
 *   <GanttGrid />
 *   <GanttRow id="backend" name="Backend">
 *     <GanttTask id="t1" name="Spec" start="2026-06-02" end="2026-06-10" :progress="80" />
 *   </GanttRow>
 *   <GanttDependencies />
 *   <GanttToday />
 * </GanttRoot>
 * ```
 */
const meta: Meta<typeof GanttRoot> = {
  title: 'Guides/Declarative composition',
  component: GanttRoot,
  tags: ['autodocs'],
  render: declarativeChart(),
}
export default meta

export const Default: StoryObj<typeof GanttRoot> = {}
