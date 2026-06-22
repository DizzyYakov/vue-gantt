<script setup lang="ts">
import { computed, ref, type Ref } from 'vue'
import {
  Gantt,
  GanttDependencies,
  GanttGrid,
  GanttMilestone,
  GanttRoot,
  GanttRow,
  GanttTask,
  GanttTaskList,
  GanttTimeline,
  GanttToday,
  type GanttMoveEvent,
  type GanttRowData,
  type GanttTaskData,
  type GanttUnit,
} from '../index'

// All selectable time groups, coarse → fine.
const ALL_TIERS: GanttUnit[] = ['year', 'quarter', 'month', 'week', 'day', 'hour', 'minute']

const enabled = ref<Record<GanttUnit, boolean>>({
  year: false,
  quarter: false,
  month: true,
  week: true,
  day: true,
  hour: false,
  minute: false,
})

const tiers = computed<GanttUnit[]>(() => ALL_TIERS.filter((t) => enabled.value[t]))

const columnWidth = computed(() => {
  const finest = tiers.value.at(-1)
  if (finest === 'minute' || finest === 'hour') return 44
  if (finest === 'day') return 40
  return 80
})

// Drag & drop toggles.
const draggable = ref(true)
const rowMovable = ref(true)

// Rows are containers; each holds any number of tasks (note multiple bars per row).
const rows = ref<GanttRowData[]>([
  {
    id: 'r-plan',
    name: 'Planning',
    tasks: [
      { id: 'spec', name: 'Specification', start: '2026-06-01', end: '2026-06-08', progress: 100 },
      { id: 'review', name: 'Review', type: 'milestone', start: '2026-06-30', dependencies: ['build'] },
    ],
  },
  {
    id: 'r-design',
    name: 'Design',
    tasks: [
      { id: 'design', name: 'Design', start: '2026-06-08', end: '2026-06-16', progress: 70, dependencies: ['spec'] },
    ],
  },
  {
    id: 'r-dev',
    name: 'Development',
    tasks: [
      { id: 'build', name: 'Implementation', start: '2026-06-16', end: '2026-06-28', progress: 30, dependencies: ['design'] },
      { id: 'polish', name: 'Polish', start: '2026-06-22', end: '2026-06-27', progress: 0 },
    ],
  },
  { id: 'r-qa', name: 'QA', tasks: [] },
])

// A larger generated set to show row + column virtualization and the grid.
const manyRows = ref<GanttRowData[]>(
  Array.from({ length: 40 }, (_, r) => ({
    id: `row-${r}`,
    name: `Team ${r + 1}`,
    tasks: Array.from({ length: 1 + (r % 3) }, (_, k) => {
      const startDay = 1 + ((r * 3 + k * 7) % 24)
      return {
        id: `t-${r}-${k}`,
        name: `Task ${r + 1}.${k + 1}`,
        start: `2026-06-${String(startDay).padStart(2, '0')}`,
        end: `2026-06-${String(Math.min(30, startDay + 2 + (k % 4))).padStart(2, '0')}`,
        progress: (r * 13 + k * 29) % 101,
      }
    }),
  })),
)

// Apply a completed drag: move the task into its target row, updating dates.
function applyMove(list: Ref<GanttRowData[]>, e: GanttMoveEvent) {
  let moved: GanttTaskData | undefined
  const next = list.value.map((row) => {
    const kept = (row.tasks ?? []).filter((t) => {
      if (t.id !== e.id) return true
      moved = { ...t, start: e.start, end: e.end }
      return false
    })
    return { ...row, tasks: kept }
  })
  if (!moved) return
  const target = next.find((r) => r.id === e.toRowId)
  if (target) target.tasks = [...(target.tasks ?? []), moved]
  list.value = next
}

const onMoveRows = (e: GanttMoveEvent) => applyMove(rows, e)
const onMoveMany = (e: GanttMoveEvent) => applyMove(manyRows, e)
</script>

<template>
  <main class="demo">
    <h1>vue-gantt — dev playground</h1>

    <fieldset class="control">
      <legend>Time groups on the timeline</legend>
      <label v-for="tier in ALL_TIERS" :key="tier" class="control__item">
        <input v-model="enabled[tier]" type="checkbox" />
        {{ tier }}
      </label>
    </fieldset>

    <fieldset class="control">
      <legend>Drag &amp; drop</legend>
      <label class="control__item">
        <input v-model="draggable" type="checkbox" />
        draggable (move dates)
      </label>
      <label class="control__item">
        <input v-model="rowMovable" type="checkbox" />
        move between rows
      </label>
    </fieldset>

    <section>
      <h2>1. Prop-driven wrapper (<code>&lt;Gantt :rows /&gt;</code>) — rows hold tasks</h2>
      <div class="card">
        <Gantt
          :rows="rows"
          :tiers="tiers"
          :column-width="columnWidth"
          :height="240"
          :draggable="draggable"
          :row-movable="rowMovable"
          @move="onMoveRows"
        />
      </div>
    </section>

    <section>
      <h2>2. Declarative (<code>&lt;GanttRow&gt;</code> + <code>&lt;GanttTask&gt;</code>)</h2>
      <div class="card">
        <GanttRoot :tiers="tiers" :column-width="columnWidth" >
          <div class="manual">
            <div class="manual__side">
              <div class="manual__corner" />
              <GanttTaskList />
            </div>
            <div class="manual__main">
              <GanttTimeline />
              <div class="manual__body">
                <GanttGrid />
                <GanttRow id="r-plan" name="Planning">
                  <GanttTask id="d-spec" name="Spec" start="2026-06-01" end="2026-06-08" :progress="100" />
                </GanttRow>
                <GanttRow id="r-dev" name="Development">
                  <GanttTask
                    id="d-build"
                    name="Build"
                    start="2026-06-10"
                    end="2026-06-22"
                    :progress="40"
                    :dependencies="['d-spec']"
                  />
                  <GanttMilestone id="d-ship" name="Ship" start="2026-06-24" />
                </GanttRow>
                <GanttDependencies />
                <GanttToday />
              </div>
            </div>
          </div>
        </GanttRoot>
      </div>
    </section>

    <section>
      <h2>3. Custom design system via CSS variables</h2>
      <div class="card themed">
        <Gantt
          :rows="rows"
          :tiers="tiers"
          :column-width="columnWidth"
          :height="240"
        />
      </div>
    </section>

    <section>
      <h2>4. Virtualized: 40 rows of tasks, sticky header/sidebar, grid</h2>
      <div class="card">
        <Gantt
          :rows="manyRows"
          :tiers="tiers"
          :column-width="columnWidth"
          :height="360"
          :draggable="draggable"
          :row-movable="rowMovable"
          @move="onMoveMany"
        />
      </div>
    </section>
  </main>
</template>

<style>
.demo {
  font-family: system-ui, sans-serif;
  padding: 24px;
  max-width: 1100px;
  margin: 0 auto;
}

.control {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  align-items: center;
  margin-bottom: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 12px;
}
.control legend {
  padding: 0 6px;
  font-size: 0.85em;
  color: #64748b;
}
.control__item {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  text-transform: capitalize;
}

.card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  overflow: hidden;
}

.manual {
  display: flex;
  align-items: flex-start;
}
.manual__side {
  flex: none;
  width: 180px;
}
.manual__corner {
  height: var(--gantt-header-height, var(--gantt-row-height));
  border-bottom: 1px solid #e5e7eb;
}
.manual__main {
  flex: 1 1 auto;
  overflow-x: auto;
}
.manual__body {
  position: relative;
  width: var(--gantt-content-width);
  height: var(--gantt-content-height);
}

/* A different design system, achieved purely with custom properties. */
.themed {
  --gantt-bar-bg: #d1fae5;
  --gantt-progress-bg: #10b981;
  --gantt-bar-color: #064e3b;
  --gantt-bar-radius: 999px;
  --gantt-milestone-bg: #8b5cf6;
  --gantt-today-color: #0ea5e9;
  --gantt-grid-color: #f1f5f9;
  --gantt-row-height: 44px;
}
</style>
