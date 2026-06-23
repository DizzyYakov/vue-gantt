import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Gantt from '../components/Gantt.vue'
import { sampleRows } from './_shared'

/**
 * Because the chart is themed entirely through `--gantt-*` custom properties,
 * dropping it into any design system is just a matter of mapping those
 * properties to the system's tokens — on `.gantt-root` or any ancestor (e.g. the
 * design system's theme provider / root class).
 *
 * The stories below use each system's representative palette. In a real app you
 * would point the variables at the live tokens, e.g.:
 *
 * - **shadcn/ui** — `--gantt-bar-bg: hsl(var(--primary))`, `--gantt-grid-color: hsl(var(--border))`, `--gantt-bar-radius: var(--radius)`
 * - **Ant Design** — read from theme: `--gantt-progress-bg: ${token.colorPrimary}`, `--gantt-bar-radius: ${token.borderRadius}px`
 * - **Material UI** — `--gantt-progress-bg: ${theme.palette.primary.main}`, `--gantt-grid-color: ${theme.palette.divider}`
 * - **Vuetify** — `--gantt-progress-bg: rgb(var(--v-theme-primary))`, `--gantt-surface: rgb(var(--v-theme-surface))`
 * - **Quasar** — `--gantt-progress-bg: var(--q-primary)`, `--gantt-milestone-bg: var(--q-accent)`
 */
const meta: Meta<typeof Gantt> = {
  title: 'Guides/Design systems',
  component: Gantt,
  tags: ['autodocs'],
  args: {
    rows: sampleRows,
    tiers: ['month', 'week', 'day'],
    columnWidth: 36,
    height: 240,
  },
}
export default meta

type Story = StoryObj<typeof Gantt>

/** Wrap the chart in a host element that maps `--gantt-*` to a system's tokens. */
function themed(vars: Record<string, string>): Story['render'] {
  return (args) => ({
    components: { Gantt },
    setup: () => ({ args, vars }),
    template: `<div :style="vars"><Gantt v-bind="args" /></div>`,
  })
}

/**
 * **shadcn/ui** (neutral preset). Bars use the muted/primary pair, the border
 * token drives the grid, `--radius` the corners, and `destructive` the today line.
 */
export const Shadcn: Story = {
  name: 'shadcn/ui',
  render: themed({
    '--gantt-surface': 'hsl(0 0% 100%)',
    '--gantt-bar-bg': 'hsl(240 4.8% 95.9%)',
    '--gantt-progress-bg': 'hsl(240 5.9% 10%)',
    '--gantt-bar-color': 'hsl(240 5.9% 10%)',
    // The fill is near-black and the track near-white, so the dark label gets a
    // white halo to stay readable over the filled part (clean on the track).
    '--gantt-bar-text-shadow': '0 0 2px hsl(0 0% 100%), 0 0 3px hsl(0 0% 100%)',
    '--gantt-bar-radius': '0.5rem',
    '--gantt-grid-color': 'hsl(240 5.9% 90%)',
    '--gantt-milestone-bg': 'hsl(240 5.9% 10%)',
    '--gantt-today-color': 'hsl(0 84.2% 60.2%)',
  }),
}

/** **Ant Design** — `colorPrimary #1677ff`, `borderRadius 6`, neutral borders. */
export const AntDesign: Story = {
  name: 'Ant Design',
  render: themed({
    '--gantt-bar-bg': '#e6f4ff',
    '--gantt-progress-bg': '#1677ff',
    '--gantt-bar-color': '#003eb3',
    '--gantt-bar-radius': '6px',
    '--gantt-grid-color': '#f0f0f0',
    '--gantt-milestone-bg': '#fa8c16',
    '--gantt-today-color': '#ff4d4f',
  }),
}

/** **Material UI** — `primary #1976d2`, `secondary #9c27b0`, `divider` grid, radius 4. */
export const MaterialUI: Story = {
  name: 'Material UI',
  render: themed({
    '--gantt-bar-bg': '#bbdefb',
    '--gantt-progress-bg': '#1976d2',
    '--gantt-bar-color': '#0d47a1',
    '--gantt-bar-radius': '4px',
    '--gantt-grid-color': 'rgba(0, 0, 0, 0.12)',
    '--gantt-milestone-bg': '#9c27b0',
    '--gantt-today-color': '#d32f2f',
  }),
}

/** **Vuetify** — default light theme (`primary #1867C0`, `error #B00020`). */
export const Vuetify: Story = {
  name: 'Vuetify',
  render: themed({
    '--gantt-bar-bg': '#e3f2fd',
    '--gantt-progress-bg': '#1867c0',
    '--gantt-bar-color': '#0d47a1',
    '--gantt-bar-radius': '4px',
    '--gantt-grid-color': '#e0e0e0',
    '--gantt-milestone-bg': '#48a9a6',
    '--gantt-today-color': '#b00020',
  }),
}

/** **Quasar** — brand palette (`primary #1976d2`, `accent #9c27b0`, `negative #c10015`). */
export const Quasar: Story = {
  name: 'Quasar',
  render: themed({
    '--gantt-bar-bg': '#e3f2fd',
    '--gantt-progress-bg': '#1976d2',
    '--gantt-bar-color': '#0d47a1',
    '--gantt-bar-radius': '4px',
    '--gantt-grid-color': '#e0e0e0',
    '--gantt-milestone-bg': '#9c27b0',
    '--gantt-today-color': '#c10015',
  }),
}
