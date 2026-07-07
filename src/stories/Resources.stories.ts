import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Gantt from '../components/Gantt.vue'
import type { GanttResource, GanttRow } from '../types'

// A flat lookup table of resources (people/equipment) — passed to the
// `resources` prop, referenced from tasks/milestones via `resourceIds`.
const resources: GanttResource[] = [
  { id: 'alice', name: 'Alice', color: '#6366f1' },
  { id: 'bob', name: 'Bob', color: '#f59e0b' },
  { id: 'carol', name: 'Carol', color: '#10b981' },
]

const rows: GanttRow[] = [
  {
    id: 'design',
    name: 'Design',
    tasks: [
      {
        id: 'design',
        name: 'Design',
        start: '2026-06-01',
        end: '2026-06-10',
        progress: 70,
        // Single assignee.
        resourceIds: ['alice'],
      },
    ],
  },
  {
    id: 'build',
    name: 'Development',
    tasks: [
      {
        id: 'build',
        name: 'Implementation',
        start: '2026-06-10',
        end: '2026-06-22',
        progress: 30,
        // Multiple assignees on the same bar.
        resourceIds: ['alice', 'bob'],
      },
      {
        // No `resourceIds` — the bar's `resources` slot prop resolves to `[]`.
        id: 'polish',
        name: 'Polish (unassigned)',
        start: '2026-06-18',
        end: '2026-06-22',
        progress: 0,
      },
    ],
  },
  {
    id: 'release',
    name: 'Release',
    tasks: [
      {
        id: 'ship',
        name: 'Ship',
        type: 'milestone',
        start: '2026-06-24',
        dependencies: ['build'],
        resourceIds: ['carol'],
      },
    ],
  },
]

/**
 * Assign a task or milestone to one or more **resources** (people/equipment)
 * via `resourceIds`, and pass the flat lookup table to the `resources` prop.
 * The library resolves each item's assignees and surfaces them into its
 * `#bar` (`{ task, progress, resources }`) / `#milestone` (`{ task,
 * resources }`) slot — rendering (a badge, an avatar, initials) is entirely up
 * to the consumer; resources don't add their own swimlane. Unassigned items
 * simply get an empty `resources` array.
 */
const meta: Meta<typeof Gantt> = {
  title: 'Guides/Resources',
  component: Gantt,
  tags: ['autodocs'],
  args: {
    rows,
    resources,
    tiers: ['month', 'week', 'day'],
    columnWidth: 34,
    rowHeight: 40,
    height: 220,
  },
}
export default meta

type Story = StoryObj<typeof Gantt>

/**
 * `#bar` and `#milestone` render a name label plus one badge per assigned
 * resource, tinted from `resource.color` (falls back to
 * `--gantt-progress-bg` when a resource has no color). The unassigned
 * "Polish" bar renders no badges — `resources` resolves to `[]`.
 */
export const Default: Story = {
  render: args => ({
    components: { Gantt },
    setup: () => ({ args }),
    template: `
      <Gantt v-bind="args">
        <template #bar="{ task, resources }">
          <span style="padding: 0 6px; white-space: nowrap;">{{ task.name }}</span>
          <span
            v-for="resource in resources"
            :key="resource.id"
            :style="{
              padding: '0 6px',
              marginRight: '2px',
              borderRadius: '999px',
              fontSize: '0.7em',
              color: '#fff',
              background: resource.color || 'var(--gantt-progress-bg)',
            }"
          >{{ resource.name }}</span>
        </template>
        <template #milestone="{ resources }">
          <div class="gantt-milestone__diamond" />
          <span
            v-for="resource in resources"
            :key="resource.id"
            style="position: absolute; top: -1.6em; white-space: nowrap;"
            :style="{
              background: resource.color || 'var(--gantt-progress-bg)',
              padding: '0 6px',
              borderRadius: '999px',
              fontSize: '0.7em',
              color: '#fff',
            }"
          >{{ resource.name }}</span>
        </template>
      </Gantt>
    `,
  }),
}
