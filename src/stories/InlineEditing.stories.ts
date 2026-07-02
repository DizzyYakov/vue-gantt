import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import Gantt from '../components/Gantt.vue'
import type { GanttRow } from '../types'
import { sampleRows } from './_shared'

/**
 * With the `editable` prop, **double-click** a row name in the sidebar or a bar's
 * label in the body to open an inline `<input>`. **Enter** or **blur** commits,
 * **Esc** cancels; an empty or unchanged value is ignored.
 *
 * Like every other interaction the edit is **controlled**: the chart emits
 * `row-edit` (`GanttRowEditEvent { id, patch, row }`) / `task-edit`
 * (`GanttTaskEditEvent { id, patch, task }`). With `v-model:rows` (used below) the
 * patch is applied for you via `updateRow` / `updateTask` and re-emitted through
 * `update:rows`, so renames stick without a manual handler. Style the input with
 * the `--gantt-edit-*` variables (class `.gantt-edit-input`), or replace it wholesale
 * with the `rowEditor` / `taskEditor` slots.
 */
const meta: Meta<typeof Gantt> = {
  title: 'Guides/Inline editing',
  component: Gantt,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof Gantt>

/**
 * Double-click the **Planning** / **Design** / **Development** row names, or the
 * bar labels (**Specification**, **Design**, **Implementation**…), to rename them.
 * Enter commits, Esc cancels. Bound with `v-model:rows`, so the edit is applied
 * automatically — the "Last edit" line echoes the emitted event.
 */
export const InlineEditing: Story = {
  args: {
    editable: true,
    draggable: true,
  },
  render: args => ({
    components: { Gantt },
    setup() {
      const rows = ref<GanttRow[]>(JSON.parse(JSON.stringify(sampleRows)))
      const last = ref('— double-click a row name or bar label —')
      const onRowEdit = (e: { id: string; patch: { name?: string } }) =>
        (last.value = `row-edit: ${e.id} → "${e.patch.name}"`)
      const onTaskEdit = (e: { id: string; patch: { name?: string } }) =>
        (last.value = `task-edit: ${e.id} → "${e.patch.name}"`)
      return { args, rows, last, onRowEdit, onTaskEdit }
    },
    template: /* html */ `
      <div>
        <div style="margin-bottom:10px; font:13px/1.4 system-ui; color:#475569;">
          Last edit: <code>{{ last }}</code>
        </div>
        <Gantt v-bind="args" v-model:rows="rows" @row-edit="onRowEdit" @task-edit="onTaskEdit" />
      </div>
    `,
  }),
}

/**
 * Replace the built-in input with your own editor via the `rowEditor`
 * (`{ row, value, commit, cancel }`) / `taskEditor` (`{ task, value, commit, cancel }`)
 * slots. Here the row editor prefixes an emoji picker `<select>` and the task
 * editor is a bare input — each calls `commit(newValue)` to save or `cancel()` to
 * discard. Double-click a row name or a bar label to see them.
 */
export const CustomEditors: Story = {
  args: {
    editable: true,
  },
  render: args => ({
    components: { Gantt },
    setup() {
      const rows = ref<GanttRow[]>(JSON.parse(JSON.stringify(sampleRows)))
      const icons = ['📋', '🎨', '🛠️', '🚀', '✅']
      return { args, rows, icons }
    },
    template: /* html */ `
      <Gantt v-bind="args" v-model:rows="rows">
        <template #rowEditor="{ value, commit, cancel }">
          <span style="display:inline-flex; gap:4px; align-items:center;">
            <select :value="icons[0]" @change="commit(($event.target.value) + ' ' + value)">
              <option v-for="i in icons" :key="i" :value="i">{{ i }}</option>
            </select>
            <input
              class="gantt-edit-input"
              :value="value"
              @keydown.enter="commit($event.target.value)"
              @keydown.esc="cancel"
              @blur="commit($event.target.value)"
            />
          </span>
        </template>
        <template #taskEditor="{ value, commit, cancel }">
          <input
            class="gantt-edit-input"
            :value="value"
            @keydown.enter="commit($event.target.value)"
            @keydown.esc="cancel"
            @blur="commit($event.target.value)"
          />
        </template>
      </Gantt>
    `,
  }),
}
