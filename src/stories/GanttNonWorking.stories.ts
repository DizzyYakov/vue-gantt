import type { Meta, StoryObj } from '@storybook/vue3-vite'
import GanttDependencies from '../components/GanttDependencies.vue'
import GanttGrid from '../components/GanttGrid.vue'
import GanttNonWorking from '../components/GanttNonWorking.vue'
import GanttRoot from '../components/GanttRoot.vue'
import GanttRow from '../components/GanttRow.vue'
import GanttTask from '../components/GanttTask.vue'
import GanttTaskList from '../components/GanttTaskList.vue'
import GanttTimeline from '../components/GanttTimeline.vue'
import type { NonWorkingCalendar } from '../types'

/**
 * A **working calendar** overlay: shades non-working time (weekends, holidays, or
 * arbitrary off spans) as a faint full-height background band. Unlike
 * [timeline periods](/docs/components-ganttperiods--docs), it's purely decorative —
 * it never adds a header row and never extends the auto date range, it only tints
 * time that's already on the chart.
 *
 * `<Gantt>` / `<GanttView>` render it automatically whenever the `nonWorking` prop is
 * set (`true` shades Saturday/Sunday; pass a `NonWorkingCalendar` — `{ weekends?,
 * holidays?, periods? }` — for full control). Declaratively, drop `<GanttNonWorking>`
 * into a `GanttRoot` that has `nonWorking` set; it renders nothing when the calendar
 * resolves to no bands, so it's safe to always mount.
 *
 * **Data:** the pure `nonWorkingBands(calendar, range)` helper (also exported) computes
 * the same bands outside of Vue, e.g. to report or validate a schedule against the
 * calendar.
 *
 * **Slots** (on `<Gantt>`): `non-working` replaces this whole overlay layer.
 * `GanttNonWorking`'s own default slot gives you `{ band }` to render custom content
 * inside each band.
 *
 * **Theme** with `--gantt-nonworking-bg` (the band fill).
 */
const meta: Meta<typeof GanttNonWorking> = {
  title: 'Components/GanttNonWorking',
  component: GanttNonWorking,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof GanttNonWorking>

const components = {
  GanttRoot,
  GanttTaskList,
  GanttTimeline,
  GanttGrid,
  GanttRow,
  GanttTask,
  GanttDependencies,
  GanttNonWorking,
}

// Saturdays/Sundays (default `weekends: [0, 6]`) plus a Friday holiday (Jun 19) shade
// across the whole month regardless of which row's tasks happen to cover them.
function nonWorkingChart(calendar: boolean | NonWorkingCalendar, slot = '') {
  return () => ({
    components,
    setup() {
      return { calendar }
    },
    template: /* html */ `
      <GanttRoot :non-working="calendar" :tiers="['month','week','day']" :column-width="36">
        <div class="sb-chart">
          <div class="sb-chart__side">
            <div class="sb-chart__corner" />
            <GanttTaskList />
          </div>
          <div class="sb-chart__main">
            <GanttTimeline />
            <div class="sb-chart__body">
              <GanttGrid />
              <GanttNonWorking>${slot}</GanttNonWorking>
              <GanttRow id="planning" name="Planning">
                <GanttTask id="spec" name="Spec" start="2026-06-01" end="2026-06-10" :progress="100" />
              </GanttRow>
              <GanttRow id="design" name="Design">
                <GanttTask id="design" name="Design" start="2026-06-10" end="2026-06-22" :progress="60" :dependencies="['spec']" />
              </GanttRow>
              <GanttRow id="dev" name="Development">
                <GanttTask id="build" name="Implementation" start="2026-06-22" end="2026-06-30" :progress="20" :dependencies="['design']" />
              </GanttRow>
              <GanttDependencies />
            </div>
          </div>
        </div>
      </GanttRoot>
    `,
  })
}

/** Default weekends (`getDay()` 0/6) plus a single holiday (`2026-06-19`). */
export const Default: Story = {
  render: nonWorkingChart({ holidays: ['2026-06-19'] }),
}

/** `true` is shorthand for the default calendar — just Saturday/Sunday shaded. */
export const WeekendsOnly: Story = {
  render: nonWorkingChart(true),
}

/**
 * `periods` shades arbitrary off spans that aren't tied to a weekday or a single
 * date — here a two-day maintenance window mid-month. `weekends: []` turns off the
 * default Sat/Sun shading so only the explicit span shows.
 */
export const CustomOffPeriod: Story = {
  render: nonWorkingChart({
    weekends: [],
    periods: [{ id: 'maintenance', start: '2026-06-15', end: '2026-06-17' }],
  }),
}

/**
 * The default slot (`{ band }`) renders custom content inside each band — here a
 * small centered label pinned to the top.
 */
export const CustomBand: Story = {
  render: nonWorkingChart(
    { holidays: ['2026-06-19'] },
    /* html */ `<template #default="{ band }">
      <span style="position:absolute;top:4px;left:50%;transform:translateX(-50%);padding:0 6px;font-size:.62em;font-weight:600;color:#64748b;white-space:nowrap">{{ band.id.startsWith('nonworking-period') ? 'Off' : '' }}</span>
    </template>`,
  ),
}
