import type { Meta, StoryObj } from '@storybook/vue3-vite'
import GanttMilestone from '../components/GanttMilestone.vue'
import { ganttComponents } from './_shared'

/**
 * A point-in-time marker (diamond) on its row — `end` is ignored and collapsed
 * onto `start`. Same declarative/presentational modes and drag support as
 * `GanttTask`. The default slot overrides the marker.
 */
const meta: Meta<typeof GanttMilestone> = {
  title: 'Components/GanttMilestone',
  component: GanttMilestone,
  tags: ['autodocs'],
}
export default meta

/**
 * A release plan built around milestones: a stabilization bar with a GA marker
 * (finish-to-start dependency) plus standalone Beta/RC checkpoints — all within
 * the default viewport so the diamonds are visible at a glance.
 */
export const Default: StoryObj<typeof GanttMilestone> = {
  render: () => ({
    components: ganttComponents,
    template: /* html */ `
      <GanttRoot :tiers="['month','week','day']" :column-width="40">
        <div class="sb-chart">
          <div class="sb-chart__side">
            <div class="sb-chart__corner" />
            <GanttTaskList />
          </div>
          <div class="sb-chart__main">
            <GanttTimeline />
            <div class="sb-chart__body">
              <GanttGrid />
              <GanttRow id="release" name="Release 1.0">
                <GanttTask id="stab" name="Stabilize" start="2026-06-01" end="2026-06-15" :progress="60" />
                <GanttMilestone id="ga" name="GA" start="2026-06-16" :dependencies="['stab']" />
              </GanttRow>
              <GanttRow id="checkpoints" name="Checkpoints">
                <GanttMilestone id="beta" name="Beta" start="2026-06-05" />
                <GanttMilestone id="rc" name="RC" start="2026-06-11" />
              </GanttRow>
              <GanttDependencies />
              <GanttToday />
            </div>
          </div>
        </div>
      </GanttRoot>
    `,
  }),
}

/**
 * Three checkpoints close together on the same row, each rendering a long
 * name via the default slot (`#milestone` for the prop-driven `<Gantt>`).
 * `labelMaxWidth` is the adaptive gap in px to the next milestone on the row;
 * bound as an inline `maxWidth` on a `.gantt-milestone__label` element it
 * ellipsizes the label instead of letting it overlap its neighbour — no
 * hardcoded width, so it keeps working as dates/zoom change.
 */
export const AdaptiveLabels: StoryObj<typeof GanttMilestone> = {
  render: () => ({
    components: ganttComponents,
    template: /* html */ `
      <GanttRoot :tiers="['month','week','day']" :column-width="40">
        <div class="sb-chart">
          <div class="sb-chart__side">
            <div class="sb-chart__corner" />
            <GanttTaskList />
          </div>
          <div class="sb-chart__main">
            <GanttTimeline />
            <div class="sb-chart__body">
              <GanttGrid />
              <GanttRow id="checkpoints" name="Checkpoints">
                <GanttMilestone id="beta" name="Beta available for external testing" start="2026-06-05">
                  <template #default="{ task, labelMaxWidth }">
                    <div class="gantt-milestone__diamond" />
                    <span class="gantt-milestone__label" :style="{ maxWidth: labelMaxWidth + 'px' }">{{ task.name }}</span>
                  </template>
                </GanttMilestone>
                <GanttMilestone id="rc" name="Release candidate ready for QA sign-off" start="2026-06-07">
                  <template #default="{ task, labelMaxWidth }">
                    <div class="gantt-milestone__diamond" />
                    <span class="gantt-milestone__label" :style="{ maxWidth: labelMaxWidth + 'px' }">{{ task.name }}</span>
                  </template>
                </GanttMilestone>
                <GanttMilestone id="ga" name="General availability public launch" start="2026-06-09">
                  <template #default="{ task, labelMaxWidth }">
                    <div class="gantt-milestone__diamond" />
                    <span class="gantt-milestone__label" :style="{ maxWidth: labelMaxWidth + 'px' }">{{ task.name }}</span>
                  </template>
                </GanttMilestone>
              </GanttRow>
              <GanttToday />
            </div>
          </div>
        </div>
      </GanttRoot>
    `,
  }),
}
