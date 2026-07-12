import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import Gantt from '../components/Gantt.vue'
import type { GanttCreateEvent, GanttMoveEvent, GanttRow } from '../types'
import { addTask } from '../utils'
import { sampleRows } from './_shared'

/**
 * # Interactions (move, create, edit)
 *
 * The chart is **controlled**: interactions never mutate your data directly —
 * they emit an event describing the intended change, and you apply it. Opt into
 * each interaction with a prop:
 *
 * - `draggable` — drag a bar along its row to reschedule it (`move`).
 * - `rowMovable` — also drop a task into another row (implies `draggable`).
 * - `resizable` — drag a bar edge to change its start/end (`resize`); the sides
 *   flip past each other.
 * - `progressDraggable` — drag a handle to edit progress (`progress`).
 * - `linkable` — drag between tasks to create/edit dependencies.
 * - `cellCreatable` — drag across an empty grid band to create a task (`create`).
 *
 * Moves are **full-precision** by default (any datetime); set `snapToGrid` to snap
 * to the base unit. For the keyboard equivalents (Shift/Alt + arrows), see
 * [Accessibility](/docs/guides-accessibility--docs).
 *
 * `v-model:rows` is a convenience layer that applies all of these edits to your
 * data for you — no manual handlers needed.
 */
const meta: Meta<typeof Gantt> = {
  title: 'Guides/Interactions',
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

type Story = StoryObj<typeof Gantt>

/**
 * Drag bars to reschedule (full precision, with a live time label + ghost) and,
 * with `rowMovable`, drop a task into another row. `move` is controlled — this
 * demo owns a local copy of the rows and applies the change on release.
 */
export const DragAndDrop: Story = {
  args: { draggable: true, rowMovable: true },
  render: args => ({
    components: { Gantt },
    setup() {
      const rows = ref<GanttRow[]>(JSON.parse(JSON.stringify(sampleRows)))
      function onMove(e: GanttMoveEvent) {
        for (const row of rows.value) row.tasks = (row.tasks ?? []).filter(t => t.id !== e.id)
        const target = rows.value.find(r => r.id === e.toRowId)
        if (target)
          target.tasks = [...(target.tasks ?? []), { id: e.id, start: e.start, end: e.end }]
      }
      return { args, rows, onMove }
    },
    template: `<Gantt v-bind="args" :rows="rows" @move="onMove" />`,
  }),
}

/**
 * With `cellCreatable`, dragging across an empty row band draws a ghost preview
 * and emits `create` on release (below the drag threshold it's still read as a
 * plain `cell-click`). The chart stays controlled — this demo applies the intent
 * with the `addTask` utility. Try it in the empty band below the last task of any
 * row.
 */
export const CellCreatable: Story = {
  args: { cellCreatable: true },
  render: args => ({
    components: { Gantt },
    setup() {
      const rows = ref<GanttRow[]>(JSON.parse(JSON.stringify(sampleRows)))
      let nextId = 0
      function onCreate(e: GanttCreateEvent) {
        rows.value = addTask(rows.value, e.row.id, {
          id: `created-${nextId++}`,
          name: 'New task',
          start: e.start,
          end: e.end,
        })
      }
      return { args, rows, onCreate }
    },
    template: `<Gantt v-bind="args" :rows="rows" @create="onCreate" />`,
  }),
}

/**
 * `v-model:rows` is a convenience layer over the controlled events: drag, resize,
 * progress and dependency edits are applied to your data for you — no manual
 * `@move`/`@resize`/… handlers. (The controlled events still fire if you want them.)
 */
export const VModelRows: Story = {
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
      return { args, rows }
    },
    template: `<Gantt v-bind="args" v-model:rows="rows" />`,
  }),
}
