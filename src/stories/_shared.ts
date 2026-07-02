// Shared sample data + a layout helper used by the component stories.
import GanttDependencies from '../components/GanttDependencies.vue'
import GanttGrid from '../components/GanttGrid.vue'
import GanttMilestone from '../components/GanttMilestone.vue'
import GanttRoot from '../components/GanttRoot.vue'
import GanttRow from '../components/GanttRow.vue'
import GanttTask from '../components/GanttTask.vue'
import GanttTaskList from '../components/GanttTaskList.vue'
import GanttTimeline from '../components/GanttTimeline.vue'
import GanttToday from '../components/GanttToday.vue'
import type { GanttRow as GanttRowData } from '../types'

/** Rows-with-tasks sample reused across the wrapper stories. */
export const sampleRows: GanttRowData[] = [
  {
    id: 'planning',
    name: 'Planning',
    tasks: [
      { id: 'spec', name: 'Specification', start: '2026-06-01', end: '2026-06-08', progress: 100 },
      {
        id: 'review',
        name: 'Review',
        type: 'milestone',
        start: '2026-06-30',
        dependencies: ['build'],
      },
    ],
  },
  {
    id: 'design',
    name: 'Design',
    tasks: [
      {
        id: 'design',
        name: 'Design',
        start: '2026-06-08',
        end: '2026-06-16',
        progress: 70,
        dependencies: ['spec'],
      },
    ],
  },
  {
    id: 'dev',
    name: 'Development',
    tasks: [
      {
        id: 'build',
        name: 'Implementation',
        start: '2026-06-16',
        end: '2026-06-28',
        progress: 30,
        dependencies: ['design'],
      },
      { id: 'polish', name: 'Polish', start: '2026-06-22', end: '2026-06-27', progress: 0 },
    ],
  },
]

const STRESS_DAY = 86_400_000
const STRESS_BASE = new Date(2026, 0, 1).getTime()

/**
 * Deterministic large dataset for the performance story and benchmarks. `groups`
 * (>0) splits the rows into that many contiguous groups; `deps` chains each task
 * to the previous one in its row (a DAG — safe for critical-path/auto-schedule).
 */
export function makeStressRows(
  rowCount: number,
  opts: { tasksPerRow?: number; groups?: number; deps?: boolean } = {},
): GanttRowData[] {
  const tasksPerRow = opts.tasksPerRow ?? 5
  const groups = opts.groups ?? 0
  const withDeps = opts.deps ?? false
  const rows: GanttRowData[] = []

  for (let r = 0; r < rowCount; r++) {
    const tasks = []
    for (let k = 0; k < tasksPerRow; k++) {
      const idx = r * tasksPerRow + k
      // Spread deterministically across ~10 years so the axis is realistically wide.
      const start = STRESS_BASE + (idx % 3650) * STRESS_DAY
      const end = start + (1 + (idx % 6)) * STRESS_DAY
      tasks.push({
        id: `t-${r}-${k}`,
        name: `Task ${r + 1}.${k + 1}`,
        start,
        end,
        progress: (idx * 37) % 101,
        ...(withDeps && k > 0 ? { dependencies: [`t-${r}-${k - 1}`] } : {}),
      })
    }
    rows.push({
      id: `row-${r}`,
      name: `Row ${r + 1}`,
      ...(groups ? { groupId: `g-${Math.floor((r * groups) / rowCount)}` } : {}),
      tasks,
    })
  }
  return rows
}

/** Components available to the inline-template renders below. */
export const ganttComponents = {
  GanttRoot,
  GanttTaskList,
  GanttTimeline,
  GanttGrid,
  GanttRow,
  GanttTask,
  GanttMilestone,
  GanttDependencies,
  GanttToday,
}

/**
 * A small, fully-assembled declarative chart (frozen sidebar + multi-tier
 * header + grid + bars + dependencies + today line). Used as the canvas for the
 * per-component stories so each renders in a realistic context.
 *
 * Pass `rootProps` to bind extra `GanttRoot` props (e.g. `dependencyShape`,
 * `arrowHead`) — they're merged over the defaults via `v-bind`.
 */
export function declarativeChart(rootProps: Record<string, unknown> = {}) {
  return () => ({
    components: ganttComponents,
    setup() {
      return { rootProps }
    },
    template: /* html */ `
      <GanttRoot v-bind="rootProps" :tiers="['month','week','day']" :column-width="40">
        <div class="sb-chart">
          <div class="sb-chart__side">
            <div class="sb-chart__corner" />
            <GanttTaskList />
          </div>
          <div class="sb-chart__main">
            <GanttTimeline />
            <div class="sb-chart__body">
              <GanttGrid />
              <GanttRow id="backend" name="Backend">
                <GanttTask id="t1" name="Spec" start="2026-06-02" end="2026-06-10" :progress="80" />
              </GanttRow>
              <GanttRow id="frontend" name="Frontend">
                <GanttTask id="t2" name="UI" start="2026-06-10" end="2026-06-20" :progress="40" :dependencies="['t1']" />
              </GanttRow>
              <GanttRow id="qa" name="QA">
                <GanttTask id="t3" name="Testing" start="2026-06-18" end="2026-06-26" :progress="10" :dependencies="['t2']" />
                <GanttMilestone id="ship" name="Ship" start="2026-06-28" :dependencies="['t3']" />
              </GanttRow>
              <GanttRow id="ops" name="Ops">
                <GanttTask id="t4" name="Deploy" start="2026-06-26" end="2026-06-30" :progress="0" />
              </GanttRow>
              <GanttDependencies />
              <GanttToday />
            </div>
          </div>
        </div>
      </GanttRoot>
    `,
  })
}
