import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import Gantt from '../components/Gantt.vue'
import type { GanttRow } from '../types'
import { sampleRows } from './_shared'

/**
 * # Accessibility & keyboard
 *
 * `keyboard` makes every bar/milestone focusable and operable via a **roving tab
 * stop**: Tab into the chart once (the first task in the first row), see the focus
 * ring, and press Enter/Space to fire the same click event a mouse would. From
 * there the arrow keys move focus without re-tabbing — Left/Right step to the
 * previous/next task in the same row, Up/Down jump to the closest-by-start task in
 * the nearest non-empty row above/below, and Home/End jump to the first/last task
 * in the row — auto-scrolling the target into view. Each item gets a descriptive
 * `aria-label`; the chart root becomes a labelled landmark (`ariaLabel`, defaults
 * to `'Gantt chart'`).
 *
 * From the active item, **Shift + Left/Right** nudges the whole task one unit
 * earlier/later (gated by `draggable`) and **Alt + Left/Right** resizes its end by
 * one unit (gated by `resizable`, tasks only) — both emit the same `move`/`resize`
 * events a mouse drag would.
 *
 * The sidebar (task list) is keyboard-navigable too: it becomes a `tree` (WBS
 * rows) or `list` (flat/grouped rows) of `treeitem`/`listitem` rows with their own
 * roving tab stop — Up/Down move between rows, Left/Right collapse/expand a branch,
 * Enter/Space fires `row-click`, Home/End jump to the ends. See the README's
 * "Keyboard & accessibility" section for the full attribute/key reference — the
 * time body keeps bars as `role="button"` rather than forcing `grid`/`gridcell`
 * roles.
 */
const meta: Meta<typeof Gantt> = {
  title: 'Guides/Accessibility',
  component: Gantt,
  tags: ['autodocs'],
  args: {
    rows: sampleRows,
    tiers: ['month', 'week', 'day'],
    columnWidth: 40,
    rowHeight: 36,
    height: 260,
  },
}
export default meta

/**
 * Tab into the chart, then drive it entirely from the keyboard: arrows move focus,
 * Enter/Space activates, and Shift/Alt + Left/Right move/resize the focused task
 * (enabled here via `draggable`/`resizable`).
 *
 * The chart is **controlled**, so this demo binds `v-model:rows` to apply the
 * keyboard `move`/`resize` edits back to the data — without it the events still
 * fire but the bars wouldn't visibly move.
 */
export const Keyboard: StoryObj<typeof Gantt> = {
  args: { keyboard: true, ariaLabel: 'Project timeline', draggable: true, resizable: true },
  render: args => ({
    components: { Gantt },
    setup() {
      const rows = ref<GanttRow[]>(JSON.parse(JSON.stringify(sampleRows)))
      return { args, rows }
    },
    template: `<Gantt v-bind="args" v-model:rows="rows" />`,
  }),
}

// Pre-order WBS tree so the sidebar becomes a keyboard-navigable `tree` with
// collapsible branches (Left/Right fold/unfold, Up/Down move between rows).
const treeRows: GanttRow[] = [
  {
    id: 'project',
    name: 'Website relaunch',
    tasks: [{ id: 'kickoff', name: 'Kickoff', type: 'milestone', start: '2026-06-01' }],
  },
  {
    id: 'phase-design',
    name: 'Design',
    parentId: 'project',
    tasks: [{ id: 'wireframes', name: 'Wireframes', start: '2026-06-01', end: '2026-06-08', progress: 100 }],
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
    tasks: [{ id: 'frontend', name: 'Components', start: '2026-06-14', end: '2026-06-24', progress: 30 }],
  },
  {
    id: 'build-backend',
    name: 'Backend',
    parentId: 'phase-build',
    tasks: [{ id: 'backend', name: 'API', start: '2026-06-14', end: '2026-06-26', progress: 10 }],
  },
]

/**
 * Driving the **sidebar** from the keyboard. Tab to the row list (its own roving
 * tab stop), then: **Up/Down** move between rows, **Left/Right** collapse/expand
 * the focused branch (this WBS tree has three levels), **Home/End** jump to the
 * first/last row, and **Enter/Space** fire `row-click` — echoed in the readout
 * below so you can see each activation.
 */
export const SidebarNavigation: StoryObj<typeof Gantt> = {
  args: { keyboard: true, ariaLabel: 'Project timeline', height: 360 },
  render: args => ({
    components: { Gantt },
    setup() {
      const lastClicked = ref<string | null>(null)
      return { args, treeRows, lastClicked }
    },
    template: `
      <div>
        <Gantt v-bind="args" :rows="treeRows" @row-click="lastClicked = $event.row.name ?? $event.row.id" />
        <p style="margin-top:8px;font:14px/1.4 system-ui,sans-serif" aria-live="polite">
          Last activated row: <strong>{{ lastClicked ?? '—' }}</strong>
        </p>
      </div>
    `,
  }),
}
