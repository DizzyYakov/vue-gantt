import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { onBeforeUnmount, onMounted } from 'vue'
import Gantt from '../components/Gantt.vue'
import type { GanttRow } from '../types'

/**
 * # Row decoration
 *
 * Two additive hooks let you mark up a sidebar row without overriding its whole
 * render — for a full replacement of the row instead, see the
 * [`row` slot](/docs/guides-row-tree-wbs--docs):
 *
 * - The **`row-suffix` slot** renders *after* the row name (`{ row, index,
 *   depth, collapsed, hasChildren }` — same scope as `row`, minus `toggle`).
 *   Handy for a badge/marker without touching the default name rendering.
 * - **`meta` → `data-*`**: primitive (`string`/`number`/`boolean`) entries of a
 *   row's `meta` are forwarded as `data-<key>` attributes on its
 *   `.gantt-task-list__row` element, so a row can be highlighted with plain
 *   CSS, no slot needed. Reserved attributes (`data-id`, `data-group`,
 *   `data-depth`, `data-has-children`, `data-collapsed`) are never overwritten.
 */
const meta: Meta<typeof Gantt> = {
  title: 'Guides/Row decoration',
  component: Gantt,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof Gantt>

const rows: GanttRow[] = [
  {
    id: 'api',
    name: 'API',
    meta: { ppr: true },
    tasks: [
      { id: 'api-build', name: 'Build', start: '2026-06-01', end: '2026-06-10', progress: 80 },
    ],
  },
  {
    id: 'db',
    name: 'Database',
    tasks: [
      { id: 'db-schema', name: 'Schema', start: '2026-06-06', end: '2026-06-14', progress: 40 },
    ],
  },
  {
    id: 'ui',
    name: 'UI',
    meta: { ppr: true },
    tasks: [
      {
        id: 'ui-build',
        name: 'Components',
        start: '2026-06-10',
        end: '2026-06-20',
        progress: 20,
      },
    ],
  },
]

/**
 * A "PPR" badge rendered after the row name via the `row-suffix` slot — the
 * row's own name rendering (and its `row` slot, if any) stays untouched. Here
 * `row.meta.ppr` decides whether a row gets tagged.
 */
export const BadgeSlot: Story = {
  args: {
    rows,
    tiers: ['month', 'week', 'day'],
    height: 260,
  },
  render: args => ({
    components: { Gantt },
    setup: () => ({ args }),
    template: `
      <Gantt v-bind="args">
        <template #row-suffix="{ row }">
          <span
            v-if="row.meta.ppr"
            style="margin-left:6px;padding:1px 6px;font-size:.66em;font-weight:700;color:#fff;background:var(--gantt-critical-color, #dc2626);border-radius:4px;white-space:nowrap"
          >PPR</span>
        </template>
      </Gantt>`,
  }),
}

/**
 * No slot at all: primitive `meta` entries surface as `data-*` on
 * `.gantt-task-list__row`, so a plain CSS attribute selector (`[data-ppr]`)
 * tints the whole row — here the "API" and "UI" rows (both `meta: { ppr: true }`)
 * get a tinted background, "Database" (no `ppr` in `meta`) stays default.
 */
export const MetaDataAttribute: Story = {
  args: {
    rows,
    tiers: ['month', 'week', 'day'],
    height: 260,
  },
  render: args => ({
    components: { Gantt },
    setup: () => {
      // A `<style>` tag inside a runtime-compiled template is stripped by Vue, so
      // the plain-CSS rule is injected imperatively here (a real app would just
      // ship this in a stylesheet).
      let styleEl: HTMLStyleElement | undefined
      onMounted(() => {
        styleEl = document.createElement('style')
        styleEl.textContent =
          '.gantt-task-list__row[data-ppr] { background: color-mix(in srgb, var(--gantt-critical-color, #dc2626) 12%, transparent); }'
        document.head.appendChild(styleEl)
      })
      onBeforeUnmount(() => styleEl?.remove())
      return { args }
    },
    template: `<Gantt v-bind="args" />`,
  }),
}
