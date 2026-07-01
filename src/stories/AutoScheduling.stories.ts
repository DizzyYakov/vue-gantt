import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import Gantt from '../components/Gantt.vue'
import { toDate } from '../context'
import type { GanttRow } from '../types'
import { autoSchedule, updateTask } from '../utils'

/**
 * With the `autoSchedule` prop, moving or resizing a task — or creating /
 * re-routing a dependency — pushes every finish-to-start successor forward so
 * none starts before its predecessor ends (MS-Project style), preserving each
 * task's duration. The cascade is transitive: shifting **A** also shifts **B**
 * and **C**.
 *
 * It applies to the emitted `update:rows`, so it works only with `v-model:rows`
 * (or prop-driven `rows`, as here); `dependency-remove` and progress edits don't
 * cascade, and the live drag ghost doesn't preview it — successors snap into
 * place on release. It's built on the exported
 * [`autoSchedule(rows, changedId?)`](?path=/docs/components-gantt--docs) utility,
 * which the **Delay A** button below calls directly to make the cascade obvious
 * without dragging. You can also drag/resize the bars to see the same effect.
 */
const meta: Meta<typeof Gantt> = {
  title: 'Guides/Auto-scheduling',
  component: Gantt,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof Gantt>

// A finish-to-start chain a → b → c, each on its own row (b depends on a, c on b).
const chain = (): GanttRow[] => [
  {
    id: 'a',
    name: 'A',
    tasks: [{ id: 'a', name: 'A', start: '2026-06-01', end: '2026-06-06', progress: 60 }],
  },
  {
    id: 'b',
    name: 'B',
    tasks: [
      { id: 'b', name: 'B', start: '2026-06-06', end: '2026-06-12', progress: 30, dependencies: ['a'] },
    ],
  },
  {
    id: 'c',
    name: 'C',
    tasks: [
      { id: 'c', name: 'C', start: '2026-06-12', end: '2026-06-18', progress: 0, dependencies: ['b'] },
    ],
  },
]

const DAY = 86_400_000

/**
 * Click **Delay A by 3 days** to shift task A and watch B and C cascade to keep
 * the dependencies valid (durations preserved). Dragging or resizing any bar does
 * the same thing live.
 */
export const DelayAndCascade: Story = {
  args: {
    autoSchedule: true,
    draggable: true,
    resizable: true,
    linkable: true,
    // Pin the axis so the cascade is visible as a rightward shift (otherwise the
    // auto-derived range slides with the earliest task and bars look unchanged).
    startDate: '2026-05-25',
    endDate: '2026-07-20',
  },
  render: args => ({
    components: { Gantt },
    setup() {
      const rows = ref<GanttRow[]>(chain())

      // Shift A later and reschedule — the same transform the drag commit runs.
      function delayA(): void {
        const a = rows.value[0]!.tasks![0]!
        const start = new Date(toDate(a.start).getTime() + 3 * DAY)
        const end = new Date(toDate(a.end!).getTime() + 3 * DAY)
        rows.value = autoSchedule(updateTask(rows.value, 'a', { start, end }), 'a')
      }
      function reset(): void {
        rows.value = chain()
      }

      return { args, rows, delayA, reset }
    },
    template: /* html */ `
      <div>
        <div style="display:flex; gap:8px; margin-bottom:10px;">
          <button type="button" @click="delayA">Delay A by 3 days</button>
          <button type="button" @click="reset">Reset</button>
        </div>
        <Gantt v-bind="args" v-model:rows="rows" />
      </div>
    `,
  }),
}
