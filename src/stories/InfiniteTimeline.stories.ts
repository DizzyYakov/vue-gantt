import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Gantt from '../components/Gantt.vue'
import { sampleRows } from './_shared'

/**
 * # Infinite timeline
 *
 * `timelineMode` controls what happens at the horizontal edges of the axis:
 *
 * - `fixed` (default) — the range is exactly `startDate`…`endDate` (auto-derived
 *   from the tasks when omitted). Reaching an edge stops the scroll.
 * - `infinite` — scrolling to either edge extends the axis by one screenful of
 *   dates, so you can pan indefinitely. Prepending dates on the left corrects the
 *   scroll offset so the view stays anchored.
 *
 * A `range-change` event fires on every edge reach. In `infinite` mode the new
 * bounds are already applied; in `fixed` mode you'd use it to widen
 * `startDate`/`endDate` yourself. Column virtualization keeps the DOM bounded no
 * matter how far you scroll.
 */
const meta: Meta<typeof Gantt> = {
  title: 'Guides/Infinite timeline',
  component: Gantt,
  tags: ['autodocs'],
  args: {
    rows: sampleRows,
    tiers: ['month', 'week', 'day'],
    columnWidth: 36,
    height: 260,
  },
}
export default meta

/**
 * Scroll to either horizontal edge and the axis extends by one screenful of dates.
 * Watch the Actions panel for `range-change` on every edge reach.
 */
export const InfiniteTimeline: StoryObj<typeof Gantt> = {
  args: { timelineMode: 'infinite' },
}
