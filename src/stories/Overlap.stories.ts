import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Gantt from '../components/Gantt.vue'
import type { GanttRow } from '../types'

// One row with three tasks that overlap in time, plus a second row.
const rows: GanttRow[] = [
  {
    id: 'team',
    name: 'Team',
    tasks: [
      { id: 'research', name: 'Research', start: '2026-06-02', end: '2026-06-12', progress: 60 },
      { id: 'prototype', name: 'Prototype', start: '2026-06-08', end: '2026-06-18', progress: 30 },
      { id: 'docs', name: 'Docs', start: '2026-06-15', end: '2026-06-24', progress: 10 },
    ],
  },
  {
    id: 'qa',
    name: 'QA',
    tasks: [
      { id: 'testing', name: 'Testing', start: '2026-06-16', end: '2026-06-26', progress: 0 },
    ],
  },
]

/**
 * When several tasks in one row overlap in time, the `overlap` prop controls how
 * they're displayed. It only affects rows that actually have overlaps.
 */
const meta: Meta<typeof Gantt> = {
  title: 'Guides/Overlapping tasks',
  component: Gantt,
  tags: ['autodocs'],
  argTypes: {
    overlap: {
      control: 'inline-radio',
      options: ['lanes', 'overlap', 'cascade', 'conflict'],
      description: 'How overlapping tasks on the same row are displayed.',
    },
  },
  args: {
    rows,
    tiers: ['month', 'week', 'day'],
    columnWidth: 34,
    rowHeight: 40,
    height: 220,
    draggable: true,
    rowMovable: true,
  },
}
export default meta

type Story = StoryObj<typeof Gantt>

/** Stack overlapping tasks into sub-lanes; the row grows taller. */
export const Lanes: Story = { args: { overlap: 'lanes' } }

/** Keep one band; overlapping bars turn translucent so the shared span blends. */
export const Translucent: Story = { args: { overlap: 'overlap' } }

/** Thinner bars offset vertically like stacked cards. */
export const Cascade: Story = { args: { overlap: 'cascade' } }

/** Bars keep full size; the overlapping span is hatched and flagged as a clash. */
export const Conflict: Story = { args: { overlap: 'conflict' } }

/**
 * The `conflicts` slot overrides how clashing spans are rendered. It receives a
 * scoped prop `conflicts: GanttConflict[]` — one segment per overlapping span,
 * each carrying `{ rowId, order, x, width }` in body pixels (empty unless
 * `overlap: 'conflict'`). Here it draws a translucent red highlight per segment
 * instead of the default `<GanttConflicts>` hatch.
 */
export const ConflictSlot: Story = {
  args: { overlap: 'conflict' },
  render: args => ({
    components: { Gantt },
    setup: () => ({ args }),
    template: `
      <Gantt v-bind="args">
        <template #conflicts="{ conflicts }">
          <div
            v-for="(c, i) in conflicts"
            :key="i"
            :style="{
              position: 'absolute',
              left: c.x + 'px',
              width: c.width + 'px',
              top: c.order * args.rowHeight + 'px',
              height: args.rowHeight + 'px',
              background: 'rgba(239, 68, 68, 0.25)',
              outline: '1px dashed #ef4444',
              pointerEvents: 'none',
            }"
          />
        </template>
      </Gantt>
    `,
  }),
}
