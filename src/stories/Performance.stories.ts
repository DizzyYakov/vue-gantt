import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Gantt from '../components/Gantt.vue'
import { makeStressRows } from './_shared'

/**
 * # Performance
 *
 * The chart virtualizes both axes: with a height-constrained scroll viewport
 * (a `height` cap or a fixed-height parent) only the rows and columns inside the
 * window are rendered, so a 10 000-task chart keeps a small DOM. Column
 * generation is windowed and analytic (`contentWidth` is O(1)); a `MAX_CELLS`
 * guard bounds a single generation pass.
 *
 * Dependency arrows are viewport-culled too: only links whose endpoint rows
 * intersect the visible window get an SVG path (window-straddling links are kept),
 * so dense dependency graphs don't emit a path per edge. Group rollups
 * (start/end/progress) are computed in a single O(rows) bucketed pass.
 *
 * Run `bun run bench` (`vitest bench`) for the pure-function numbers (layout,
 * critical-path, slack, per-scroll filter) at 1k/10k in `src/__tests__/perf.bench.ts`.
 */
const meta: Meta<typeof Gantt> = {
  title: 'Guides/Performance',
  component: Gantt,
  // `no-smoke`: the 10k datasets render unvirtualized in jsdom (viewport is 0) and
  // would time out the mount smoke test; the data path is covered by perf.spec.ts.
  tags: ['autodocs', 'no-smoke'],
  parameters: { layout: 'fullscreen' },
}
export default meta

type Story = StoryObj<typeof Gantt>

/** 2000 rows × 5 tasks = 10 000 tasks; `height` engages row/column virtualization. */
export const TenThousandTasks: Story = {
  args: {
    rows: makeStressRows(2000),
    tiers: ['year', 'month', 'week'],
    columnWidth: 24,
    height: 480,
  },
}

/** Same 10k dataset split into 200 collapsible groups. */
export const TenThousandGrouped: Story = {
  args: {
    rows: makeStressRows(2000, { groups: 200 }),
    tiers: ['year', 'month', 'week'],
    columnWidth: 24,
    height: 480,
  },
}
