<script setup lang="ts">
import { computed } from 'vue'
import { useGanttContext } from '../composables/useGanttContext'
import type { ResolvedGroup } from '../types'

const { visibleGroups, rows, dateToX, widthBetween } = useGanttContext()

interface GroupBar {
  group: ResolvedGroup
  left: number
  width: number
}

// One rolled-up bar per group that actually has tasks, spanning the earliest
// start to the latest end of its members across the group's header band.
const bars = computed<GroupBar[]>(() => {
  const byId = new Map(rows.value.map(r => [r.id, r]))
  const out: GroupBar[] = []
  for (const group of visibleGroups.value) {
    const hasTasks = group.rowIds.some(id => (byId.get(id)?.tasks.length ?? 0) > 0)
    if (!hasTasks) continue
    out.push({ group, left: dateToX(group.start), width: widthBetween(group.start, group.end) })
  }
  return out
})
</script>

<template>
  <div class="gantt-group-bars" aria-hidden="true">
    <div
      v-for="bar in bars"
      :key="bar.group.id"
      class="gantt-group-bar"
      :data-id="bar.group.id"
      :style="{ top: `${bar.group.top}px`, height: `${bar.group.height}px` }"
    >
      <slot :group="bar.group">
        <div
          class="gantt-group-bar__track"
          :style="{ left: `${bar.left}px`, width: `${bar.width}px` }"
        >
          <div
            class="gantt-group-bar__progress"
            :style="{ width: `${bar.group.progress}%` }"
            :aria-label="`${Math.round(bar.group.progress)}%`"
          />
        </div>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.gantt-group-bars {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.gantt-group-bar {
  position: absolute;
  left: 0;
  right: 0;
  box-sizing: border-box;
}

.gantt-group-bar__track {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: var(--gantt-group-bar-height, 40%);
  min-width: 1px;
  overflow: hidden;
  border-radius: var(--gantt-group-bar-radius, 3px);
  background: var(--gantt-group-bar-bg, #cbd5e1);
}

.gantt-group-bar__progress {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: var(--gantt-group-bar-progress-bg, #94a3b8);
}
</style>
