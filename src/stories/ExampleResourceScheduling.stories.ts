import type { Meta, StoryObj } from '@storybook/vue3-vite'
import GanttRoot from '../components/GanttRoot.vue'
import GanttView from '../components/GanttView.vue'
import GanttWorkload from '../components/GanttWorkload.vue'
import type { GanttResource, GanttRow } from '../types'

/**
 * # Example — Resource scheduling / capacity
 *
 * A staffing view: the chart on top, a **capacity histogram** (`GanttWorkload`)
 * underneath. Each task is assigned to one or more **resources** via `resourceIds`
 * (the flat lookup goes to the `resources` prop); the `#bar` slot renders assignee
 * badges tinted from each resource's `color`. The histogram — driven by the
 * exported `resourceWorkload` sweep-line — shows, per person, how many of their
 * tasks run concurrently over time, so **over-allocation** (a taller bar) is
 * obvious at a glance.
 *
 * `GanttWorkload` reads the shared context, so it's composed as a **sibling of
 * `GanttView` inside the same `GanttRoot`** (it isn't part of `GanttView`'s
 * layout). Props/pieces in play: `resources`, task `resourceIds`, `#bar` slot,
 * `<GanttWorkload>`, `today`.
 */
const resources: GanttResource[] = [
  { id: 'alice', name: 'Alice', color: '#6366f1' },
  { id: 'bob', name: 'Bob', color: '#f59e0b' },
  { id: 'carol', name: 'Carol', color: '#10b981' },
]

// Alice is double-booked mid-July (design + build overlap) → her histogram row
// peaks at 2 while the others stay at 1.
const rows: GanttRow[] = [
  {
    id: 'design',
    name: 'Design',
    tasks: [
      { id: 'wireframes', name: 'Wireframes', start: '2026-07-01', end: '2026-07-14', progress: 80, resourceIds: ['alice'] },
    ],
  },
  {
    id: 'build',
    name: 'Development',
    tasks: [
      { id: 'build', name: 'Implementation', start: '2026-07-08', end: '2026-07-28', progress: 40, resourceIds: ['alice', 'bob'] },
      { id: 'polish', name: 'Polish', start: '2026-07-28', end: '2026-08-05', progress: 0, resourceIds: ['bob'] },
    ],
  },
  {
    id: 'qa',
    name: 'QA',
    tasks: [
      { id: 'testing', name: 'Testing', start: '2026-07-24', end: '2026-08-05', progress: 0, resourceIds: ['carol'] },
    ],
  },
]

const meta: Meta<typeof GanttWorkload> = {
  title: 'Examples/Resource scheduling',
  component: GanttWorkload,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof GanttWorkload>

/** Chart + per-resource capacity histogram; Alice's row peaks at 2 (double-booked). */
export const Default: Story = {
  render: () => ({
    components: { GanttRoot, GanttView, GanttWorkload },
    setup: () => ({ rows, resources }),
    template: /* html */ `
      <div style="border: 1px solid var(--gantt-grid-color, #e5e7eb); border-radius: 8px; overflow: hidden;">
        <GanttRoot
          :rows="rows"
          :resources="resources"
          today="2026-07-13"
          :tiers="['month','week','day']"
          :column-width="30"
        >
          <GanttView height="220">
            <template #bar="{ task, resources }">
              <span style="padding: 0 6px; white-space: nowrap;">{{ task.name }}</span>
              <span
                v-for="resource in resources"
                :key="resource.id"
                style="padding: 0 6px; margin-right: 2px; border-radius: 999px; font-size: 0.7em; color: #fff;"
                :style="{ background: resource.color || 'var(--gantt-progress-bg)' }"
              >{{ resource.name }}</span>
            </template>
          </GanttView>
          <GanttWorkload>
            <template #label="{ resource, workload }">
              <span style="display:flex;align-items:center;gap:6px;font-size:.78em;white-space:nowrap;padding-left:8px;">
                <span
                  style="width:8px;height:8px;border-radius:999px;flex:none;"
                  :style="{ background: resource?.color || 'var(--gantt-workload-bar-bg, #6366f1)' }"
                />
                {{ resource?.name ?? workload.resourceId }} · peak {{ workload.peak }}
              </span>
            </template>
          </GanttWorkload>
        </GanttRoot>
      </div>
    `,
  }),
}
