<script setup lang="ts">
import { computed, useId } from 'vue'
import { useGanttContext } from '../composables/useGanttContext'

const { conflicts, rows, contentWidth, contentHeight } = useGanttContext()

const patternId = `gantt-hatch-${useId()}`

// Position each conflict span over its row's band.
const rects = computed(() =>
  conflicts.value.map(c => {
    const row = rows.value[c.order]
    return {
      key: `${c.rowId}-${c.x}`,
      x: c.x,
      width: c.width,
      top: row?.top ?? 0,
      height: row?.height ?? 0,
    }
  }),
)
</script>

<template>
  <svg
    class="gantt-conflicts"
    :width="contentWidth"
    :height="contentHeight"
    :viewBox="`0 0 ${contentWidth} ${contentHeight}`"
    aria-hidden="true"
  >
    <defs>
      <pattern
        :id="patternId"
        width="6"
        height="6"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <line class="gantt-conflicts__hatch" x1="0" y1="0" x2="0" y2="6" />
      </pattern>
    </defs>
    <g v-for="rect in rects" :key="rect.key">
      <rect
        :x="rect.x"
        :y="rect.top"
        :width="rect.width"
        :height="rect.height"
        :fill="`url(#${patternId})`"
      />
      <rect
        class="gantt-conflicts__outline"
        :x="rect.x"
        :y="rect.top"
        :width="rect.width"
        :height="rect.height"
        fill="none"
      />
    </g>
  </svg>
</template>

<style scoped>
.gantt-conflicts {
  position: absolute;
  top: 0;
  left: 0;
  overflow: visible;
  pointer-events: none;
}

.gantt-conflicts__hatch {
  stroke: var(--gantt-conflict-color, #ef4444);
  stroke-width: var(--gantt-conflict-width, 1.5);
}

.gantt-conflicts__outline {
  stroke: var(--gantt-conflict-color, #ef4444);
  stroke-width: 1;
  opacity: 0.6;
}
</style>
