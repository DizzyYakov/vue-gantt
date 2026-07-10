<script setup lang="ts">
import { computed } from 'vue'
import { useGanttContext } from '../composables/useGanttContext'
import type { ResolvedGroup } from '../types'

const { visibleGroups, rows, dateToX, widthBetween, config } = useGanttContext()

interface GroupBar {
  group: ResolvedGroup
  left: number
  width: number
  collapsed: boolean
  /** Draw a filled bar (legacy `bar` style, or a collapsed `bracket`) vs a bracket line. */
  filled: boolean
}

// One rolled-up bar per group that actually has tasks, spanning the earliest
// start to the latest end of its members across the group's header band. In
// `bracket` style an expanded group draws a thin span line (its member rows carry
// the detail below); a collapsed group keeps a filled accent bar.
const bars = computed<GroupBar[]>(() => {
  const style = config.value.summaryStyle
  const byId = new Map(rows.value.map(r => [r.id, r]))
  const out: GroupBar[] = []
  for (const group of visibleGroups.value) {
    const hasTasks = group.rowIds.some(id => (byId.get(id)?.tasks.length ?? 0) > 0)
    if (!hasTasks) continue
    out.push({
      group,
      left: dateToX(group.start),
      width: widthBetween(group.start, group.end),
      collapsed: group.collapsed,
      filled: style === 'bar' || group.collapsed,
    })
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
      :data-collapsed="bar.collapsed || undefined"
      :style="{ top: `${bar.group.top}px`, height: `${bar.group.height}px` }"
    >
      <slot :group="bar.group" :collapsed="bar.collapsed" :left="bar.left" :width="bar.width">
        <div
          v-if="bar.filled"
          class="gantt-group-bar__track"
          :style="{ left: `${bar.left}px`, width: `${bar.width}px` }"
        >
          <div
            class="gantt-group-bar__progress"
            :style="{ width: `${bar.group.progress}%` }"
            :aria-label="`${Math.round(bar.group.progress)}%`"
          />
        </div>
        <div
          v-else
          class="gantt-group-bar__bracket"
          :style="{ left: `${bar.left}px`, width: `${bar.width}px` }"
        />
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

/* Expanded-group bracket: a thin span line with downward end caps that "bracket"
   the member rows below. No progress fill — the members carry the detail. */
.gantt-group-bar__bracket {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: var(--gantt-group-bracket-thickness, 2px);
  min-width: 1px;
  background: var(--gantt-group-bracket-color, var(--gantt-group-bar-progress-bg, #94a3b8));
}

.gantt-group-bar__bracket::before,
.gantt-group-bar__bracket::after {
  content: '';
  position: absolute;
  top: 0;
  width: var(--gantt-group-bracket-thickness, 2px);
  height: var(--gantt-group-bracket-cap, 6px);
  background: inherit;
}

.gantt-group-bar__bracket::before {
  left: 0;
}

.gantt-group-bar__bracket::after {
  right: 0;
}
</style>
