<script setup lang="ts">
import { computed } from 'vue'
import { useGanttContext } from '../composables/useGanttContext'

// Baseline (planned) bars: a thin "shadow" bar at the bottom of each task's row
// band, under the actual bar, spanning the planned interval. Decorative overlay
// (no pointers), virtualized via `visibleTasks`. Renders nothing when no task has
// a baseline, so it's safe to always mount.
const { visibleTasks, taskBand, dateToX, widthBetween, contentWidth, contentHeight } =
  useGanttContext()

const bars = computed(() =>
  visibleTasks.value.flatMap(task => {
    if (task.baselineStart == null || task.baselineEnd == null) return []
    const band = taskBand(task)
    const left = dateToX(task.baselineStart)
    const width = widthBetween(task.baselineStart, task.baselineEnd)
    return [{ id: task.id, task, left, width, top: band.top, height: band.height }]
  }),
)
</script>

<template>
  <div
    class="gantt-baselines"
    :style="{ width: `${contentWidth}px`, height: `${contentHeight}px` }"
    aria-hidden="true"
  >
    <div
      v-for="b in bars"
      :key="b.id"
      class="gantt-baseline"
      :data-id="b.id"
      :style="{
        left: `${b.left}px`,
        width: `${b.width}px`,
        top: `${b.top}px`,
        height: `${b.height}px`,
      }"
    >
      <div class="gantt-baseline__bar">
        <slot :task="b.task" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.gantt-baselines {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

/* Full row band; the thin bar aligns to the bottom, under the actual bar. */
.gantt-baseline {
  position: absolute;
  display: flex;
  align-items: flex-end;
}

.gantt-baseline__bar {
  box-sizing: border-box;
  width: 100%;
  height: var(--gantt-baseline-height, 22%);
  background: var(--gantt-baseline-bg, #cbd5e1);
  border-radius: var(--gantt-baseline-radius, 2px);
  opacity: var(--gantt-baseline-opacity, 0.8);
}
</style>
