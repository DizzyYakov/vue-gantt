import type { Meta, StoryObj } from '@storybook/vue3-vite'
import GanttDependencies from '../components/GanttDependencies.vue'
import GanttGrid from '../components/GanttGrid.vue'
import GanttRoot from '../components/GanttRoot.vue'
import GanttRow from '../components/GanttRow.vue'
import GanttSlack from '../components/GanttSlack.vue'
import GanttTask from '../components/GanttTask.vue'
import GanttTaskList from '../components/GanttTaskList.vue'
import GanttTimeline from '../components/GanttTimeline.vue'

/**
 * A decorative overlay that draws each task's **free float** — the gap between its
 * end and the start of its nearest finish-to-start successor — as a translucent bar
 * trailing the task. It reads the slack map from the shared context (populated when
 * the `slack` prop is on) and is virtualized like the bars. `<Gantt>` / `<GanttView>`
 * render it automatically under the `slack` prop; declaratively, drop it into a
 * `GanttRoot` that has `slack` set. The default slot (`{ taskId, slack }`) overrides
 * the rendered segment; theme via `--gantt-slack-color` / `--gantt-slack-opacity`
 * (or the un-defaulted `--gantt-slack-bg` / `--gantt-slack-border` hooks).
 */
const meta: Meta<typeof GanttSlack> = {
  title: 'Components/GanttSlack',
  component: GanttSlack,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof GanttSlack>

const components = {
  GanttRoot,
  GanttTaskList,
  GanttTimeline,
  GanttGrid,
  GanttRow,
  GanttTask,
  GanttDependencies,
  GanttSlack,
}

// `spec` ends Jun-08 but `design` starts Jun-12 (4d slack); `qa` ends Jun-18 but its
// successor `ship` waits until Jun-30 — both trail a slack bar. The `design → build`
// chain is back-to-back, so it has none.
function slackChart(slot = '') {
  return () => ({
    components,
    template: /* html */ `
      <GanttRoot slack :tiers="['month','week','day']" :column-width="40">
        <div class="sb-chart">
          <div class="sb-chart__side">
            <div class="sb-chart__corner" />
            <GanttTaskList />
          </div>
          <div class="sb-chart__main">
            <GanttTimeline />
            <div class="sb-chart__body">
              <GanttGrid />
              <GanttRow id="planning" name="Planning">
                <GanttTask id="spec" name="Spec" start="2026-06-01" end="2026-06-08" :progress="100" />
              </GanttRow>
              <GanttRow id="design" name="Design">
                <GanttTask id="design" name="Design" start="2026-06-12" end="2026-06-20" :progress="60" :dependencies="['spec']" />
              </GanttRow>
              <GanttRow id="dev" name="Development">
                <GanttTask id="build" name="Implementation" start="2026-06-20" end="2026-06-30" :progress="30" :dependencies="['design']" />
              </GanttRow>
              <GanttRow id="qa" name="QA">
                <GanttTask id="qa" name="Testing" start="2026-06-12" end="2026-06-18" :progress="20" :dependencies="['spec']" />
              </GanttRow>
              <GanttDependencies />
              <GanttSlack>${slot}</GanttSlack>
            </div>
          </div>
        </div>
      </GanttRoot>
    `,
  })
}

/** Default hatched slack bars trailing the tasks that have free float. */
export const Default: Story = { render: slackChart() }

/**
 * The default slot (`{ taskId, slack }`) renders custom content inside each slack
 * segment — here a small day-count badge.
 */
export const CustomSegment: Story = {
  render: slackChart(
    /* html */ `<template #default="{ slack }">
      <span style="padding:0 4px;font-size:.62em;font-weight:600;color:#475569">+{{ Math.round(slack) }}d</span>
    </template>`,
  ),
}
