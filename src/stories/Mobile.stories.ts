import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import Gantt from '../components/Gantt.vue'
import type { GanttRow } from '../types'
import { sampleRows } from './_shared'

/**
 * # Mobile & touch
 *
 * The chart is pointer-event based end to end, so drag / resize / progress /
 * dependency editing already work with a finger. This guide shows the touch-UX
 * polish on top of that:
 *
 * - **Bigger hit areas.** On a coarse pointer (`@media (pointer: coarse)`) the
 *   resize / progress / connector handles, milestones and dependency handles grow
 *   toward the ~44px touch guideline — automatically, no config. Force the same on
 *   any device with the `touchTargets` prop (adds `data-touch` to the root). All
 *   sizes stay overridable via the `--gantt-*` tokens.
 * - **Tap for the tooltip.** Touch has no hover, so a tap on a bar/milestone
 *   toggles its `tooltip`; a tap elsewhere dismisses it.
 * - **Long-press to edit.** `dblclick` is unreliable on touch, so with `editable`
 *   a ~500ms long-press on a row name (sidebar) or task label opens the inline
 *   editor. `dblclick` still works on desktop.
 * - **Steadier drags.** The drag threshold is larger for touch pointers so a bar
 *   isn't nudged by finger jitter.
 *
 * Use the toolbar's viewport control (or your browser's device mode) to preview
 * at a phone size; a coarse pointer is what actually triggers the auto-enlargement.
 */
const meta: Meta<typeof Gantt> = {
  title: 'Guides/Mobile & touch',
  component: Gantt,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  globals: {
    viewport: { value: 'iphonex' },
  },
}
export default meta

type Story = StoryObj<typeof Gantt>

/** Each touch story owns a deep copy of `sampleRows` so drags/edits are live. */
const withModelRows = (args: Parameters<NonNullable<Story['render']>>[0]) => ({
  components: { Gantt },
  setup: () => ({ args, rows: ref<GanttRow[]>(JSON.parse(JSON.stringify(sampleRows))) }),
  template: `<Gantt v-bind="args" v-model:rows="rows" />`,
})

/**
 * Enlarged hit areas via `touchTargets`, with every interaction on. Try dragging a
 * bar, dragging an edge to resize, tapping a bar for its tooltip, and long-pressing
 * a row name or a bar label to rename it (`v-model:rows` applies the edits).
 */
export const TouchOptimized: Story = {
  args: {
    touchTargets: true,
    draggable: true,
    rowMovable: true,
    resizable: true,
    progressDraggable: true,
    linkable: true,
    editable: true,
    tooltip: true,
    height: 320,
  },
  render: withModelRows,
}

/**
 * Same chart without `touchTargets`: on a coarse pointer the handles still enlarge
 * automatically (`@media (pointer: coarse)`); on a mouse they stay compact.
 */
export const AutoOnCoarsePointer: Story = {
  args: {
    draggable: true,
    resizable: true,
    progressDraggable: true,
    linkable: true,
    editable: true,
    tooltip: true,
    height: 320,
  },
  render: withModelRows,
}

/**
 * **Tap for the tooltip.** Touch has no hover, so with `tooltip` on a tap on a bar
 * or milestone toggles its floating summary; a tap elsewhere dismisses it. (On a
 * mouse the same `tooltip` shows on hover.)
 */
export const TapTooltip: Story = {
  args: {
    touchTargets: true,
    tooltip: true,
    height: 320,
  },
  render: withModelRows,
}

/**
 * **Long-press to edit.** `dblclick` is unreliable on touch, so with `editable` a
 * ~500ms long-press on a row name (sidebar) or a task label (bar) opens the inline
 * editor; Enter/blur commits, Esc cancels (`v-model:rows` applies the edit).
 * `dblclick` still works on desktop.
 */
export const LongPressEdit: Story = {
  args: {
    touchTargets: true,
    editable: true,
    height: 320,
  },
  render: withModelRows,
}
