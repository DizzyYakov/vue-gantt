import type { Meta, StoryObj } from '@storybook/vue3-vite'
import GanttDependencies from '../components/GanttDependencies.vue'
import GanttGrid from '../components/GanttGrid.vue'
import GanttPeriods from '../components/GanttPeriods.vue'
import GanttRoot from '../components/GanttRoot.vue'
import GanttRow from '../components/GanttRow.vue'
import GanttTask from '../components/GanttTask.vue'
import GanttTaskList from '../components/GanttTaskList.vue'
import GanttTimeline from '../components/GanttTimeline.vue'
import type { GanttPeriod } from '../types'
import { sprintPeriods } from '../utils'

/**
 * Custom timeline **periods** (e.g. sprints) group the *time axis*, unlike
 * [row groups](/docs/guides-row-grouping--docs) which group rows. Each period
 * paints a faint, full-height alternating **band** over the chart body (this
 * `GanttPeriods` layer) plus a **labelled row** in the timeline header — ideal for
 * sprints, phases or release windows. Bands alternate via `data-parity`, and the
 * periods also extend the auto date range so a period outside the task extent stays
 * visible.
 *
 * `<Gantt>` / `<GanttView>` render it automatically under the `periods` prop;
 * declaratively, drop `<GanttPeriods>` into a `GanttRoot` that has `periods` set.
 *
 * **Data:** build a regular cadence with the exported
 * `sprintPeriods({ from, every, unit: 'day' | 'week', count, label?, id? })` helper,
 * or pass your own `GanttPeriod[]` (uneven spans + custom labels are fine).
 *
 * **Slots** (on `<Gantt>`): `period-bands` replaces this whole body layer; `period`
 * replaces the header label of each period. `GanttPeriods`' own default slot gives
 * you `{ period }` to render custom content inside each band.
 *
 * **Theme** with `--gantt-period-band-bg` / `--gantt-period-band-alt-bg` (the
 * alternating body/header fill), `--gantt-period-border`, and the header label
 * `--gantt-period-color` / `--gantt-period-font-weight` / `--gantt-period-font-size`.
 */
const meta: Meta<typeof GanttPeriods> = {
  title: 'Components/GanttPeriods',
  component: GanttPeriods,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof GanttPeriods>

const components = {
  GanttRoot,
  GanttTaskList,
  GanttTimeline,
  GanttGrid,
  GanttRow,
  GanttTask,
  GanttDependencies,
  GanttPeriods,
}

// Three back-to-back two-week sprints from Jun 1; the header shows the labels, the
// body shows the alternating bands behind the bars. Pass your own `periods` for
// uneven, hand-authored spans.
function periodsChart(
  slot = '',
  periods: GanttPeriod[] = sprintPeriods({ from: '2026-06-01', every: 2, unit: 'week', count: 3 }),
) {
  return () => ({
    components,
    setup() {
      return { periods }
    },
    template: /* html */ `
      <GanttRoot :periods="periods" :tiers="['month','week','day']" :column-width="36">
        <div class="sb-chart">
          <div class="sb-chart__side">
            <div class="sb-chart__corner" />
            <GanttTaskList />
          </div>
          <div class="sb-chart__main">
            <GanttTimeline />
            <div class="sb-chart__body">
              <GanttGrid />
              <GanttPeriods>${slot}</GanttPeriods>
              <GanttRow id="planning" name="Planning">
                <GanttTask id="spec" name="Spec" start="2026-06-02" end="2026-06-10" :progress="100" />
              </GanttRow>
              <GanttRow id="design" name="Design">
                <GanttTask id="design" name="Design" start="2026-06-11" end="2026-06-22" :progress="60" :dependencies="['spec']" />
              </GanttRow>
              <GanttRow id="dev" name="Development">
                <GanttTask id="build" name="Implementation" start="2026-06-22" end="2026-07-02" :progress="20" :dependencies="['design']" />
              </GanttRow>
              <GanttDependencies />
            </div>
          </div>
        </div>
      </GanttRoot>
    `,
  })
}

/** Alternating background bands, one per sprint, behind the bars. */
export const Default: Story = { render: periodsChart() }

/**
 * The default slot (`{ period }`) renders custom content inside each band — here a
 * small centered sprint tag pinned to the top of the band.
 */
export const CustomBand: Story = {
  render: periodsChart(
    /* html */ `<template #default="{ period }">
      <span style="position:absolute;top:4px;left:50%;transform:translateX(-50%);padding:0 6px;font-size:.62em;font-weight:600;color:#6366f1;white-space:nowrap">{{ period.label }}</span>
    </template>`,
  ),
}

/**
 * Periods don't have to be a regular cadence — pass your own `GanttPeriod[]` with
 * **uneven spans and custom labels** (here a short kickoff, a longer build phase and
 * a hardening window). Only `id`, `start` and `end` are required; `label` falls back
 * to `id`.
 */
export const UnevenBands: Story = {
  render: periodsChart('', [
    { id: 'kickoff', start: '2026-06-01', end: '2026-06-05', label: 'Kickoff' },
    { id: 'build', start: '2026-06-05', end: '2026-06-24', label: 'Build phase' },
    { id: 'hardening', start: '2026-06-24', end: '2026-07-02', label: 'Hardening' },
  ]),
}
