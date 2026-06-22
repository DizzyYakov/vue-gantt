import type { Meta, StoryObj } from '@storybook/vue3-vite'
import GanttToday from '../components/GanttToday.vue'
import { declarativeChart } from './_shared'

/**
 * A vertical line at the current moment. It tracks a live `Date.now()` clock
 * that ticks every `interval` ms (default 1000), so the position reflects the
 * present time down to the second; it hides itself when "now" is outside the
 * chart range. The default slot receives the live `{ x, date }`.
 */
const meta: Meta<typeof GanttToday> = {
  title: 'Components/GanttToday',
  component: GanttToday,
  tags: ['autodocs'],
  render: declarativeChart(),
}
export default meta

export const Default: StoryObj<typeof GanttToday> = {}
