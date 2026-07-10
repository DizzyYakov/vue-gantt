<script setup lang="ts">
import { computed } from 'vue'
import { useGanttContext } from '../composables/useGanttContext'
import type { ResolvedRow } from '../types'

const { visibleRows, dateToX, widthBetween, config } = useGanttContext()

interface SummaryBar {
  row: ResolvedRow
  left: number
  width: number
  progress: number
  collapsed: boolean
  /** Draw a filled bar (legacy `bar` style, or a collapsed `bracket`) vs a bracket line. */
  filled: boolean
}

// One rolled-up bar per parent row (`hasChildren` with a `rollup`), spanning the
// earliest start to the latest end across its whole subtree, drawn on the row's
// own band. In `bracket` style an expanded parent draws a thin span line (its
// children carry the detail below); a collapsed parent keeps a filled accent bar.
const bars = computed<SummaryBar[]>(() => {
  const style = config.value.summaryStyle
  const out: SummaryBar[] = []
  for (const row of visibleRows.value) {
    const rollup = row.rollup
    if (!row.hasChildren || !rollup) continue
    const collapsed = row.collapsed
    out.push({
      row,
      left: dateToX(rollup.start),
      width: widthBetween(rollup.start, rollup.end),
      progress: rollup.progress,
      collapsed,
      filled: style === 'bar' || collapsed,
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
      :data-collapsed="bar.collapsed || undefined"
      :style="{ top: `${bar.row.top}px`, height: `${bar.row.height}px` }"
    >
      <slot :row="bar.row" :collapsed="bar.collapsed" :left="bar.left" :width="bar.width">
        <div
          v-if="bar.filled"
          class="gantt-summary-bar__track"
          :style="{ left: `${bar.left}px`, width: `${bar.width}px` }"
        >
          <div
            class="gantt-summary-bar__progress"
            :style="{ width: `${bar.progress}%` }"
            :aria-label="`${Math.round(bar.progress)}%`"
          />
        </div>
        <div
          v-else
          class="gantt-summary-bar__bracket"
          :style="{ left: `${bar.left}px`, width: `${bar.width}px` }"
        />
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

/* Expanded-parent bracket: a thin span line with downward end caps that "bracket"
   the child rows below. No progress fill — the children carry the detail. */
.gantt-summary-bar__bracket {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: var(--gantt-summary-bracket-thickness, 2px);
  min-width: 1px;
  background: var(--gantt-summary-bracket-color, var(--gantt-summary-bar-progress-bg, #94a3b8));
}

.gantt-summary-bar__bracket::before,
.gantt-summary-bar__bracket::after {
  content: '';
  position: absolute;
  top: 0;
  width: var(--gantt-summary-bracket-thickness, 2px);
  height: var(--gantt-summary-bracket-cap, 6px);
  background: inherit;
}

.gantt-summary-bar__bracket::before {
  left: 0;
}

.gantt-summary-bar__bracket::after {
  right: 0;
}
</style>
