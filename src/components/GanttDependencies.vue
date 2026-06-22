<script setup lang="ts">
import { computed, useId } from 'vue'
import { useGanttContext } from '../composables/useGanttContext'
import type { ResolvedTask } from '../types'

const { tasks, contentWidth, contentHeight, dateToX, taskBand } = useGanttContext()

const markerId = `gantt-arrow-${useId()}`

/** Vertical centre of a task's bar (accounts for lanes/cascade offsets). */
function centerY(task: ResolvedTask): number {
  const band = taskBand(task)
  return band.top + band.height / 2
}

interface DependencyLink {
  key: string
  from: string
  to: string
  d: string
}

const STUB = 12

// Finish-to-start links: an arrow from each dependency's end to the task's start.
const links = computed<DependencyLink[]>(() => {
  const byId = new Map<string, ResolvedTask>(tasks.value.map((t) => [t.id, t]))
  const result: DependencyLink[] = []

  for (const task of tasks.value) {
    for (const depId of task.dependencies) {
      const from = byId.get(depId)
      if (!from) continue

      // Finish (right edge of predecessor) -> start (left edge of successor).
      const ex = dateToX(from.end)
      const ey = centerY(from)
      const sx = dateToX(task.start)
      const sy = centerY(task)

      // Always approach the successor's start from the left so the arrowhead
      // points into the bar (rightward). `firstX` is the stub leaving the
      // predecessor; `approachX` is the stub arriving at the successor.
      const firstX = ex + STUB
      const approachX = sx - STUB

      const d =
        approachX >= firstX
          ? // Enough room for a simple elbow.
            `M ${ex} ${ey} H ${approachX} V ${sy} H ${sx}`
          : // Tight or backward gap: jog out, cross at mid-height, come back in.
            `M ${ex} ${ey} H ${firstX} V ${(ey + sy) / 2} H ${approachX} V ${sy} H ${sx}`

      result.push({ key: `${depId}->${task.id}`, from: depId, to: task.id, d })
    }
  }

  return result
})
</script>

<template>
  <svg
    class="gantt-dependencies"
    :width="contentWidth"
    :height="contentHeight"
    :viewBox="`0 0 ${contentWidth} ${contentHeight}`"
    aria-hidden="true"
  >
    <defs>
      <marker
        :id="markerId"
        class="gantt-dependencies__marker"
        markerWidth="8"
        markerHeight="8"
        refX="6"
        refY="3"
        orient="auto"
      >
        <path d="M0,0 L6,3 L0,6 Z" />
      </marker>
    </defs>
    <slot :links="links">
      <path
        v-for="link in links"
        :key="link.key"
        class="gantt-dependency"
        :d="link.d"
        :data-from="link.from"
        :data-to="link.to"
        :marker-end="`url(#${markerId})`"
      />
    </slot>
  </svg>
</template>

<style scoped>
.gantt-dependencies {
  position: absolute;
  top: 0;
  left: 0;
  overflow: visible;
  pointer-events: none;
}

.gantt-dependency {
  fill: none;
  stroke: var(--gantt-dependency-color, #94a3b8);
  stroke-width: var(--gantt-dependency-width, 1.5);
}

.gantt-dependencies__marker path {
  fill: var(--gantt-dependency-color, #94a3b8);
}
</style>
