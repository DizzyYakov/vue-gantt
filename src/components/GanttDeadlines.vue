<script setup lang="ts">
import { computed } from 'vue'
import { useGanttContext } from '../composables/useGanttContext'

// Deadline markers: a vertical line at each task's `deadline`, bounded to that
// task's row band (like a per-task "today" line). Decorative overlay (no
// pointers), virtualized via `visibleTasks`. Renders nothing when no task has a
// deadline, so it's safe to always mount.
const { visibleTasks, taskBand, dateToX, contentWidth, contentHeight } = useGanttContext()

const markers = computed(() =>
  visibleTasks.value.flatMap(task => {
    if (task.deadline == null) return []
    const band = taskBand(task)
    return [{ id: task.id, deadline: task.deadline, x: dateToX(task.deadline), top: band.top, height: band.height }]
  }),
)
</script>

<template>
  <div
    class="gantt-deadlines"
    :style="{ width: `${contentWidth}px`, height: `${contentHeight}px` }"
    aria-hidden="true"
  >
    <div
      v-for="m in markers"
      :key="m.id"
      class="gantt-deadline"
      :data-id="m.id"
      :style="{ left: `${m.x}px`, top: `${m.top}px`, height: `${m.height}px` }"
    >
      <slot :task-id="m.id" :deadline="m.deadline" />
    </div>
  </div>
</template>

<style scoped>
.gantt-deadlines {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.gantt-deadline {
  position: absolute;
  width: 0;
  border-left: var(
    --gantt-deadline-border,
    var(--gantt-deadline-width, 2px) solid var(--gantt-deadline-color, #dc2626)
  );
}
</style>
