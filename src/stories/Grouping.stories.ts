import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Gantt from '../components/Gantt.vue'
import type { GanttGroup, GanttRow } from '../types'

/**
 * # Row grouping
 *
 * Rows that reference the same `groupId` render under a collapsible **header band**
 * in the sidebar, with a rolled-up summary bar spanning all their tasks. This groups
 * the *rows* — orthogonal to [timeline period bands](/docs/components-ganttperiods--docs),
 * which group the time axis.
 *
 * Provide the group labels (and initial `collapsed` state) with the `groups` prop,
 * keyed by `id`; each row opts in via `groupId`. Collapse is **uncontrolled** — click
 * a header (or set `collapsed`) to fold a group: its member rows + bars hide while the
 * rollup bar remains, and `group-toggle` fires on every toggle. Declaratively, wrap
 * `<GanttRow>`s in a `<GanttGroup id name>`.
 *
 * Customize the header with the `group` slot (`{ group, collapsed, toggle }`) and the
 * rollup bar with the `groupBar` slot (`{ group }`).
 *
 * For a deep, collapsible hierarchy instead of flat groups, see
 * [Row tree (WBS)](/docs/guides-row-tree-wbs--docs) (`GanttRow.parentId`) — the two
 * are mutually exclusive within the same dataset.
 */
const meta: Meta<typeof Gantt> = {
  title: 'Guides/Row grouping',
  component: Gantt,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof Gantt>

const groups: GanttGroup[] = [
  { id: 'g-be', name: 'Backend' },
  { id: 'g-fe', name: 'Frontend' },
]

const rows: GanttRow[] = [
  {
    id: 'gr-api',
    name: 'API',
    groupId: 'g-be',
    tasks: [{ id: 'g-api', name: 'API', start: '2026-06-01', end: '2026-06-10', progress: 80 }],
  },
  {
    id: 'gr-db',
    name: 'Database',
    groupId: 'g-be',
    tasks: [{ id: 'g-db', name: 'Schema', start: '2026-06-06', end: '2026-06-14', progress: 40 }],
  },
  {
    id: 'gr-ui',
    name: 'UI',
    groupId: 'g-fe',
    tasks: [
      { id: 'g-ui', name: 'Components', start: '2026-06-10', end: '2026-06-20', progress: 20 },
    ],
  },
  {
    id: 'gr-ux',
    name: 'UX',
    groupId: 'g-fe',
    tasks: [{ id: 'g-ux', name: 'Flows', start: '2026-06-12', end: '2026-06-18' }],
  },
]

/** Two groups, each with a header band + a rolled-up summary bar over its rows. */
export const Default: Story = {
  args: {
    groups,
    rows,
    tiers: ['month', 'week', 'day'],
    height: 320,
  },
}

/** The Frontend group starts `collapsed`: its rows fold away, the rollup bar stays. */
export const Collapsed: Story = {
  args: {
    groups: [
      { id: 'g-be', name: 'Backend' },
      { id: 'g-fe', name: 'Frontend', collapsed: true },
    ],
    rows,
    tiers: ['month', 'week', 'day'],
    height: 320,
  },
}

/**
 * Custom header via the `group` slot (chevron + name + a member count) and a custom
 * rollup bar via the `groupBar` slot. `toggle()` folds the group; `collapsed` tells
 * you the current state.
 */
export const CustomGroup: Story = {
  args: {
    groups,
    rows,
    tiers: ['month', 'week', 'day'],
    height: 320,
  },
  render: args => ({
    components: { Gantt },
    setup: () => ({ args }),
    template: `
      <Gantt v-bind="args">
        <template #group="{ group, collapsed, toggle }">
          <button
            type="button"
            @click="toggle"
            style="display:flex;align-items:center;gap:6px;width:100%;padding:0 8px;border:0;background:transparent;font:inherit;font-weight:700;cursor:pointer;text-align:left"
          >
            <span style="transition:transform .15s" :style="{ transform: collapsed ? 'rotate(-90deg)' : 'none' }">▾</span>
            {{ group.name }}
          </button>
        </template>
        <template #groupBar="{ group }">
          <div style="height:100%;border-radius:6px;background:repeating-linear-gradient(45deg,#6366f1,#6366f1 6px,#818cf8 6px,#818cf8 12px);opacity:.85" :title="group.name" />
        </template>
      </Gantt>`,
  }),
}
