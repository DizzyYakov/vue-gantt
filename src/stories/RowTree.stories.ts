import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Gantt from '../components/Gantt.vue'
import type { GanttRow } from '../types'

/**
 * # Row tree (WBS)
 *
 * `GanttRow.parentId` nests a row under another, building a collapsible tree of
 * arbitrary depth — a work-breakdown structure. Rows must be given in **pre-order**
 * (a parent immediately before its subtree), and a dataset uses either `parentId`
 * nesting or flat [`groupId` grouping](/docs/guides-row-grouping--docs), never both.
 *
 * A parent row keeps its own tasks (if any) **and** shows a rolled-up **summary
 * bar** spanning the earliest start to the latest end across its whole subtree.
 * The sidebar indents each row by its depth and adds a chevron toggle to rows
 * with children. Collapse is **uncontrolled** — click the chevron (or set
 * `collapsed`) to fold a subtree: descendants hide recursively while the
 * summary bar keeps covering the full extent, and `row-toggle` fires on every
 * toggle.
 *
 * Customize the sidebar row with the `row` slot
 * (`{ row, index, depth, collapsed, hasChildren, toggle }`) and the rollup bar
 * with the `summaryBar` slot (`{ row }`).
 */
const meta: Meta<typeof Gantt> = {
  title: 'Guides/Row tree (WBS)',
  component: Gantt,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof Gantt>

// Pre-order, 3 levels deep: project (0) → phase (1) → task (2).
const rows: GanttRow[] = [
  {
    id: 'project',
    name: 'Website relaunch',
    tasks: [{ id: 'kickoff', name: 'Kickoff', type: 'milestone', start: '2026-06-01' }],
  },
  {
    id: 'phase-design',
    name: 'Design',
    parentId: 'project',
    tasks: [
      { id: 'wireframes', name: 'Wireframes', start: '2026-06-01', end: '2026-06-08', progress: 100 },
    ],
  },
  {
    id: 'design-review',
    name: 'Review',
    parentId: 'phase-design',
    tasks: [{ id: 'review', name: 'Design review', start: '2026-06-08', end: '2026-06-12', progress: 60 }],
  },
  {
    id: 'phase-build',
    name: 'Build',
    parentId: 'project',
    tasks: [{ id: 'build-plan', name: 'Sprint plan', start: '2026-06-12', end: '2026-06-14', progress: 100 }],
  },
  {
    id: 'build-frontend',
    name: 'Frontend',
    parentId: 'phase-build',
    tasks: [
      { id: 'frontend', name: 'Components', start: '2026-06-14', end: '2026-06-24', progress: 30 },
    ],
  },
  {
    id: 'build-backend',
    name: 'Backend',
    parentId: 'phase-build',
    tasks: [{ id: 'backend', name: 'API', start: '2026-06-14', end: '2026-06-26', progress: 10 }],
  },
]

/** A 3-level WBS tree: each parent shows its own tasks plus a rolled-up summary bar. */
export const Default: Story = {
  args: {
    rows,
    tiers: ['month', 'week', 'day'],
    height: 360,
  },
}

/** The mid-level `phase-build` starts `collapsed`: its two child rows fold away
 * (recursively), while its summary bar keeps spanning the whole (still-collapsed)
 * subtree. */
export const Collapsed: Story = {
  args: {
    rows: rows.map(row => (row.id === 'phase-build' ? { ...row, collapsed: true } : row)),
    tiers: ['month', 'week', 'day'],
    height: 360,
  },
}

/**
 * Custom sidebar row (manual chevron + depth indent) via the `row` slot, and a
 * custom rollup bar via the `summaryBar` slot. `toggle()` folds the row's subtree;
 * `hasChildren`/`collapsed` tell you whether/how to render the chevron.
 */
export const CustomSummaryBar: Story = {
  args: {
    rows,
    tiers: ['month', 'week', 'day'],
    height: 360,
  },
  render: args => ({
    components: { Gantt },
    setup: () => ({ args }),
    template: `
      <Gantt v-bind="args">
        <template #row="{ row, depth, collapsed, hasChildren, toggle }">
          <div :style="{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: (depth * 16) + 'px', width: '100%' }">
            <button
              v-if="hasChildren"
              type="button"
              @click="toggle"
              style="border:0;background:transparent;cursor:pointer;padding:0;font:inherit"
              :style="{ transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform .15s' }"
            >▾</button>
            <span :style="{ fontWeight: hasChildren ? 700 : 400 }">{{ row.name }}</span>
          </div>
        </template>
        <template #summaryBar="{ row }">
          <div style="height:100%;border-radius:6px;background:repeating-linear-gradient(45deg,#6366f1,#6366f1 6px,#818cf8 6px,#818cf8 12px);opacity:.85" :title="row.name" />
        </template>
      </Gantt>`,
  }),
}
