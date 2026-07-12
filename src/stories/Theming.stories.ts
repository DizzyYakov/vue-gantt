import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Gantt from '../components/Gantt.vue'
import { sampleRows } from './_shared'

/**
 * # Theming
 *
 * The library ships only **structural** CSS — every decorative value is a
 * `--gantt-*` custom property with a sensible default. Override any of them on
 * the chart (or any ancestor, e.g. a design-system wrapper) to re-skin the whole
 * chart without touching a single prop or slot.
 *
 * Defaults live in `vue-gantt/styles` (`src/styles/gantt.css`), declared on
 * `:root` so the nearest override always wins. Common tokens: `--gantt-bar-bg`,
 * `--gantt-progress-bg`, `--gantt-bar-color`, `--gantt-bar-radius`,
 * `--gantt-milestone-bg`, `--gantt-today-color`, `--gantt-grid-color`. Feature
 * layers add their own namespaced tokens (`--gantt-period-*`, `--gantt-critical-*`,
 * `--gantt-slack-*`, `--gantt-nonworking-bg`, …).
 *
 * For ready-made token maps onto popular design systems (shadcn, Ant, MUI,
 * Vuetify, Quasar), see [Design systems](/docs/guides-design-systems--docs).
 */
const meta: Meta<typeof Gantt> = {
  title: 'Guides/Theming',
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

/** Everything is themed via `--gantt-*` custom properties — no prop changes. */
export const Theming: StoryObj<typeof Gantt> = {
  render: args => ({
    components: { Gantt },
    setup: () => ({ args }),
    template: `
      <div :style="{
        '--gantt-bar-bg': '#d1fae5',
        '--gantt-progress-bg': '#10b981',
        '--gantt-bar-color': '#064e3b',
        '--gantt-bar-radius': '999px',
        '--gantt-milestone-bg': '#8b5cf6',
        '--gantt-today-color': '#0ea5e9',
        '--gantt-grid-color': '#eef2ff',
      }">
        <Gantt v-bind="args" />
      </div>`,
  }),
}
