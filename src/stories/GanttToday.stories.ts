import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Gantt from '../components/Gantt.vue'
import GanttToday from '../components/GanttToday.vue'
import { declarativeChart, sampleRows } from './_shared'

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

/**
 * Replace the built-in line with the wrapper's `today` slot. It receives
 * `{ today, dateToX }` — the configured reference `Date` and a positioning helper
 * `(date) => number` — so you can draw a custom marker; here a labelled line.
 */
export const CustomSlot: StoryObj<typeof GanttToday> = {
  render: () => ({
    components: { Gantt },
    setup: () => ({ rows: sampleRows }),
    template: `
      <Gantt :rows="rows" :tiers="['month','week','day']" :height="260">
        <template #today="{ today, dateToX }">
          <div :style="{
            position: 'absolute', top: 0, bottom: 0, zIndex: 4,
            left: dateToX(today) + 'px',
            width: '2px', background: '#0ea5e9',
          }">
            <span :style="{
              position: 'absolute', top: 0, left: '4px',
              padding: '1px 6px', fontSize: '.66em', fontWeight: 600,
              color: '#fff', background: '#0ea5e9', borderRadius: '4px',
              whiteSpace: 'nowrap',
            }">Today</span>
          </div>
        </template>
      </Gantt>`,
  }),
}
