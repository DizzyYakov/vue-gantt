<script setup lang="ts">
import { computed } from 'vue'
import { useGanttContext } from '../composables/useGanttContext'
import type { ResolvedRow } from '../types'

const { visibleRows, dateToX, widthBetween } = useGanttContext()

interface SummaryBar {
  row: ResolvedRow
  left: number
  width: number
  progress: number
}

// One rolled-up bar per parent row (`hasChildren` with a `rollup`), spanning the
// earliest start to the latest end across its whole subtree, drawn on the row's
// own band.
const bars = computed<SummaryBar[]>(() => {
  const out: SummaryBar[] = []
  for (const row of visibleRows.value) {
    const rollup = row.rollup
    if (!row.hasChildren || !rollup) continue
    out.push({
      row,
      left: dateToX(rollup.start),
      width: widthBetween(rollup.start, rollup.end),
      progress: rollup.progress,
    })
  }
  return out
})
</script>

<template>
  <div class="gantt-summary-bars" aria-hidden="true">
    <div
      v-for="bar in bars"
      :key="bar.row.id"
      class="gantt-summary-bar"
      :data-id="bar.row.id"
      :style="{ top: `${bar.row.top}px`, height: `${bar.row.height}px` }"
    >
      <slot :row="bar.row">
        <div
          class="gantt-summary-bar__track"
          :style="{ left: `${bar.left}px`, width: `${bar.width}px` }"
        >
          <div
            class="gantt-summary-bar__progress"
            :style="{ width: `${bar.progress}%` }"
            :aria-label="`${Math.round(bar.progress)}%`"
          />
        </div>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.gantt-summary-bars {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.gantt-summary-bar {
  position: absolute;
  left: 0;
  right: 0;
  box-sizing: border-box;
}

.gantt-summary-bar__track {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: var(--gantt-summary-bar-height, 40%);
  min-width: 1px;
  overflow: hidden;
  border-radius: var(--gantt-summary-bar-radius, 3px);
  background: var(--gantt-summary-bar-bg, #cbd5e1);
}

.gantt-summary-bar__progress {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: var(--gantt-summary-bar-progress-bg, #94a3b8);
}
</style>
