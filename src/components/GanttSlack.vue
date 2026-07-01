<script setup lang="ts">
import { computed } from 'vue'
import { useGanttContext } from '../composables/useGanttContext'

// Translucent free-float bars: each task's slack span drawn from its end across
// the gap to its nearest successor's start. Decorative overlay (no pointers), on
// the same row band as the bar — so the fill is centered like the real bar.
// Virtualized via `visibleTasks`.
const { visibleTasks, slack, taskBand, dateToX, widthBetween, contentWidth, contentHeight } =
  useGanttContext()

const MS_PER_DAY = 86_400_000

const segments = computed(() =>
  visibleTasks.value.flatMap(task => {
    const days = slack.value.get(task.id)
    if (!days) return []
    const band = taskBand(task)
    const left = dateToX(task.end)
    const width = widthBetween(task.end, new Date(task.end.getTime() + days * MS_PER_DAY))
    return [{ id: task.id, days, left, width, top: band.top, height: band.height }]
  }),
)
</script>

<template>
  <div
    class="gantt-slack"
    :style="{ width: `${contentWidth}px`, height: `${contentHeight}px` }"
    aria-hidden="true"
  >
    <div
      v-for="seg in segments"
      :key="seg.id"
      class="gantt-slack__bar"
      :data-id="seg.id"
      :style="{
        left: `${seg.left}px`,
        width: `${seg.width}px`,
        top: `${seg.top}px`,
        height: `${seg.height}px`,
      }"
    >
      <div class="gantt-slack__fill">
        <slot :task-id="seg.id" :slack="seg.days" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.gantt-slack {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

/* Full row band; centers the fill the same way `.gantt-task` centers the bar. */
.gantt-slack__bar {
  position: absolute;
  display: flex;
  align-items: center;
}

.gantt-slack__fill {
  box-sizing: border-box;
  width: 100%;
  height: var(--gantt-bar-height, 60%);
  border-radius: var(--gantt-bar-radius, 4px);
  background: var(
    --gantt-slack-bg,
    repeating-linear-gradient(
      45deg,
      var(--gantt-slack-color, #94a3b8) 0,
      var(--gantt-slack-color, #94a3b8) 1px,
      transparent 1px,
      transparent 5px
    )
  );
  border: var(--gantt-slack-border, 1px dashed var(--gantt-slack-color, #94a3b8));
  opacity: var(--gantt-slack-opacity, 0.7);
}
</style>
