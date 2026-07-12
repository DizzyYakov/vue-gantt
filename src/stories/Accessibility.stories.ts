import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Gantt from '../components/Gantt.vue'
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
 */
export const Keyboard: StoryObj<typeof Gantt> = {
  args: { keyboard: true, ariaLabel: 'Project timeline', draggable: true, resizable: true },
}
