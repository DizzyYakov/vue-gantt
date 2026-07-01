<script setup lang="ts">
import { computed, ref } from 'vue'
import { format } from 'date-fns'
import {
  addDependency,
  applyMove,
  Gantt,
  GanttDependencies,
  GanttGrid,
  GanttGroup,
  GanttMilestone,
  GanttRoot,
  GanttRow,
  GanttTask,
  GanttTaskList,
  GanttTimeline,
  GanttToday,
  removeDependency,
  updateTask,
  type GanttDependencyChange,
  type GanttDependencyUpdate,
  type GanttDragLabelInfo,
  type GanttGroupData,
  type GanttGroupToggleEvent,
  type GanttMoveEvent,
  type GanttProgressEvent,
  type GanttResizeEvent,
  type GanttRowData,
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

const tiers = computed<GanttUnit[]>(() => ALL_TIERS.filter(t => enabled.value[t]))

const columnWidth = computed(() => {
  const finest = tiers.value.at(-1)
  if (finest === 'minute' || finest === 'hour') return 44
  if (finest === 'day') return 40
  return 80
})

// Drag & drop toggles.
const draggable = ref(true)
const rowMovable = ref(true)
const resizable = ref(true)
const progressDraggable = ref(true)
const linkable = ref(true)
// Auto-scheduling (cascade successors on move/resize/link) — v-model:rows only.
const autoSchedule = ref(true)

// Custom drag tooltip text for every drag kind (move / resize / progress).
const dragLabel = (i: GanttDragLabelInfo) =>
  i.mode === 'progress'
    ? `${i.progress}% готово`
    : i.task.type === 'milestone'
      ? format(i.start, 'd MMM')
      : `${format(i.start, 'd MMM')} – ${format(i.end, 'd MMM')}`

// Rows are containers; each holds any number of tasks (note multiple bars per row).
const rows = ref<GanttRowData[]>([
  {
    id: 'r-plan',
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
    id: 'r-design',
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
    id: 'r-dev',
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

// Two-way binding: `v-model:rows` applies every task change for us (no manual
// @move/@resize/@progress/@dependency-* handlers needed).
const vmodelRows = ref<GanttRowData[]>([
  {
    id: 'vm-plan',
    name: 'Planning',
    tasks: [{ id: 'vm-spec', name: 'Spec', start: '2026-06-01', end: '2026-06-08', progress: 100 }],
  },
  {
    id: 'vm-dev',
    name: 'Development',
    tasks: [
      {
        id: 'vm-build',
        name: 'Build',
        start: '2026-06-09',
        end: '2026-06-20',
        progress: 30,
        dependencies: ['vm-spec'],
      },
    ],
  },
])

// Apply a completed drag with the library's `applyMove` helper (controlled data).
const onMoveRows = (e: GanttMoveEvent) => (rows.value = applyMove(rows.value, e))
const onMoveMany = (e: GanttMoveEvent) => (manyRows.value = applyMove(manyRows.value, e))

// Resize + dependency edits — all controlled via the exported utils.
const onResizeRows = (e: GanttResizeEvent) =>
  (rows.value = updateTask(rows.value, e.id, { start: e.start, end: e.end }))
const onProgressRows = (e: GanttProgressEvent) =>
  (rows.value = updateTask(rows.value, e.id, { progress: e.progress }))
const onCreateDep = (e: GanttDependencyChange) =>
  (rows.value = addDependency(rows.value, e.from, e.to))
const onRemoveDep = (e: GanttDependencyChange) =>
  (rows.value = removeDependency(rows.value, e.from, e.to))
const onUpdateDep = (e: GanttDependencyUpdate) =>
  (rows.value = addDependency(
    removeDependency(rows.value, e.previous.from, e.previous.to),
    e.from,
    e.to,
  ))

// Imperative scroll API: a template ref to the chart exposes scrollTo* helpers.
const mainGantt = ref<InstanceType<typeof Gantt>>()
const scrollToToday = () => mainGantt.value?.scrollToToday()

// Row grouping: rows reference a group via `groupId`; groups carry the labels.
const groups = ref<GanttGroupData[]>([
  { id: 'g-be', name: 'Backend' },
  { id: 'g-fe', name: 'Frontend', collapsed: true },
])
const groupedRows = ref<GanttRowData[]>([
  {
    id: 'gr-api',
    name: 'API',
    groupId: 'g-be',
    tasks: [{ id: 'g-api', name: 'API', start: '2026-06-01', end: '2026-06-10', progress: 80 }],
  },
  {
    id: 'gr-db',
    name: 'Database',
    groupId: 'g-be',
    tasks: [{ id: 'g-db', name: 'Schema', start: '2026-06-06', end: '2026-06-14', progress: 40 }],
  },
  {
    id: 'gr-ui',
    name: 'UI',
    groupId: 'g-fe',
    tasks: [
      { id: 'g-ui', name: 'Components', start: '2026-06-10', end: '2026-06-20', progress: 20 },
    ],
  },
  {
    id: 'gr-ux',
    name: 'UX',
    groupId: 'g-fe',
    tasks: [{ id: 'g-ux', name: 'Flows', start: '2026-06-12', end: '2026-06-18', progress: 0 }],
  },
])
const lastToggle = ref('')
const onGroupToggle = (e: GanttGroupToggleEvent) => {
  lastToggle.value = `${e.id} → ${e.collapsed ? 'collapsed' : 'expanded'}`
}
const onMoveGrouped = (e: GanttMoveEvent) => (groupedRows.value = applyMove(groupedRows.value, e))
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
      <label class="control__item">
        <input v-model="resizable" type="checkbox" />
        resize edges
      </label>
      <label class="control__item">
        <input v-model="progressDraggable" type="checkbox" />
        drag progress
      </label>
      <label class="control__item">
        <input v-model="linkable" type="checkbox" />
        edit dependencies
      </label>
      <label class="control__item">
        <input v-model="autoSchedule" type="checkbox" />
        auto-schedule (v-model only)
      </label>
    </fieldset>

    <section>
      <h2>1. Prop-driven wrapper (<code>&lt;Gantt :rows /&gt;</code>) — rows hold tasks</h2>
      <p class="hint">
        <button type="button" class="btn" @click="scrollToToday">Сегодня</button>
        — прокрутить график к текущей дате через <code>scrollToToday()</code> (template ref).
      </p>
      <div class="card">
        <Gantt
          ref="mainGantt"
          :rows="rows"
          :tiers="tiers"
          :column-width="columnWidth"
          :height="240"
          :draggable="draggable"
          :row-movable="rowMovable"
          :resizable="resizable"
          :progress-draggable="progressDraggable"
          :linkable="linkable"
          :drag-label="dragLabel"
          @move="onMoveRows"
          @resize="onResizeRows"
          @progress="onProgressRows"
          @dependency-create="onCreateDep"
          @dependency-remove="onRemoveDep"
          @dependency-update="onUpdateDep"
        />
      </div>
    </section>

    <section>
      <h2>1b. Two-way binding (<code>v-model:rows</code>) — no manual handlers</h2>
      <p class="hint">
        Drag / resize / progress / dependency edits apply straight to
        <code>vmodelRows</code>. First task: <strong>{{ vmodelRows[0]?.tasks?.[0]?.start }}</strong
        >.
      </p>
      <div class="card">
        <Gantt
          v-model:rows="vmodelRows"
          :tiers="tiers"
          :column-width="columnWidth"
          :height="200"
          :draggable="draggable"
          :row-movable="rowMovable"
          :resizable="resizable"
          :progress-draggable="progressDraggable"
          :linkable="linkable"
          :auto-schedule="autoSchedule"
          :drag-label="dragLabel"
        />
      </div>
    </section>

    <section>
      <h2>2. Declarative (<code>&lt;GanttRow&gt;</code> + <code>&lt;GanttTask&gt;</code>)</h2>
      <div class="card">
        <GanttRoot :tiers="tiers" :column-width="columnWidth">
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
                  <GanttTask
                    id="d-spec"
                    name="Spec"
                    start="2026-06-01"
                    end="2026-06-08"
                    :progress="100"
                  />
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
        <Gantt :rows="rows" :tiers="tiers" :column-width="columnWidth" :height="240" />
      </div>
    </section>

    <section>
      <h2>5. Row grouping — collapsible groups + rollup bars</h2>
      <p class="hint">
        Rows reference a group via <code>groupId</code>; click a group header to collapse/expand.
        Last toggle: <strong>{{ lastToggle || '—' }}</strong>
      </p>
      <div class="card">
        <Gantt
          :rows="groupedRows"
          :groups="groups"
          :tiers="tiers"
          :column-width="columnWidth"
          :height="300"
          :draggable="draggable"
          :row-movable="rowMovable"
          @group-toggle="onGroupToggle"
          @move="onMoveGrouped"
        />
      </div>
    </section>

    <section>
      <h2>6. Row grouping — declarative <code>&lt;GanttGroup&gt;</code></h2>
      <div class="card">
        <GanttRoot :tiers="tiers" :column-width="columnWidth">
          <div class="manual">
            <div class="manual__side">
              <div class="manual__corner" />
              <GanttTaskList />
            </div>
            <div class="manual__main">
              <GanttTimeline />
              <div class="manual__body">
                <GanttGrid />
                <GanttGroup id="dg-be" name="Backend">
                  <GanttRow id="dg-api" name="API">
                    <GanttTask
                      id="dt-api"
                      name="API"
                      start="2026-06-01"
                      end="2026-06-09"
                      :progress="60"
                    />
                  </GanttRow>
                  <GanttRow id="dg-db" name="Database">
                    <GanttTask
                      id="dt-db"
                      name="Schema"
                      start="2026-06-05"
                      end="2026-06-12"
                      :progress="30"
                    />
                  </GanttRow>
                </GanttGroup>
                <GanttGroup id="dg-fe" name="Frontend" :collapsed="true">
                  <GanttRow id="dg-ui" name="UI">
                    <GanttTask id="dt-ui" name="Components" start="2026-06-10" end="2026-06-18" />
                  </GanttRow>
                </GanttGroup>
                <GanttToday />
              </div>
            </div>
          </div>
        </GanttRoot>
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

.hint {
  margin: 0 0 8px;
  font-size: 0.85em;
  color: #64748b;
}

.btn {
  padding: 2px 10px;
  font: inherit;
  font-size: 0.85em;
  color: #1e293b;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  cursor: pointer;
}
.btn:hover {
  background: #e2e8f0;
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
