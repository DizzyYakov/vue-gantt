import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import Gantt from '../components/Gantt.vue'
import { useGanttHistory } from '../composables/useGanttHistory'
import type { GanttRow } from '../types'
import { sampleRows } from './_shared'

/**
 * `useGanttHistory(rows)` adds undo/redo over the same `rows` ref you bind to
 * `v-model:rows`. Every reassignment is recorded as a snapshot — each drag /
 * resize / progress / link edit goes through one `update:rows`, so one user action
 * is one history entry. It returns `{ undo, redo, canUndo, canRedo, clear }`.
 *
 * Drag, resize, drag a progress handle, or link two bars — then hit **Undo** to
 * step the change back and **Redo** to reapply it. `canUndo` / `canRedo` drive the
 * buttons' `disabled` state. Snapshots are cheap (the edit utilities are immutable,
 * so entries share structure — no deep clone), and the composable is pure and
 * context-free (no `GanttRoot`, SSR-safe). Keyboard shortcuts are yours to wire —
 * e.g. Ctrl+Z / Ctrl+Shift+Z to `undo` / `redo`. Pass `{ limit }` to cap the
 * stack size.
 */
const meta: Meta<typeof Gantt> = {
  title: 'Guides/Undo & redo',
  component: Gantt,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof Gantt>

/**
 * Edit the chart (drag / resize / progress / link), then use the **Undo** and
 * **Redo** buttons — they're `disabled` when there's nothing to step to.
 */
export const UndoRedo: Story = {
  args: {
    draggable: true,
    rowMovable: true,
    resizable: true,
    progressDraggable: true,
    linkable: true,
  },
  render: args => ({
    components: { Gantt },
    setup() {
      const rows = ref<GanttRow[]>(JSON.parse(JSON.stringify(sampleRows)))
      const { undo, redo, canUndo, canRedo } = useGanttHistory(rows)
      return { args, rows, undo, redo, canUndo, canRedo }
    },
    template: /* html */ `
      <div>
        <div style="display:flex; gap:8px; margin-bottom:10px;">
          <button type="button" :disabled="!canUndo" @click="undo">Undo</button>
          <button type="button" :disabled="!canRedo" @click="redo">Redo</button>
        </div>
        <Gantt v-bind="args" v-model:rows="rows" />
      </div>
    `,
  }),
}
