<script setup lang="ts">
import { useGanttContext } from '../composables/useGanttContext'

const { config, visibleColumnsFor, contentWidth } = useGanttContext()
</script>

<template>
  <div class="gantt-timeline" :style="{ width: `${contentWidth}px` }">
    <div
      v-for="tier in config.tiers"
      :key="tier"
      class="gantt-timeline__row"
      :data-tier="tier"
    >
      <div
        v-for="column in visibleColumnsFor(tier)"
        :key="column.key"
        class="gantt-timeline__cell"
        :data-today="column.isToday || undefined"
        :style="{ left: `${column.x}px`, width: `${column.width}px` }"
      >
        <slot name="column" :column="column" :tier="tier">
          <span class="gantt-timeline__label">{{ column.label }}</span>
        </slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gantt-timeline {
  position: relative;
}

.gantt-timeline__row {
  position: relative;
  height: var(--gantt-header-row-height, var(--gantt-row-height));
}

.gantt-timeline__cell {
  position: absolute;
  top: 0;
  bottom: 0;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: var(--gantt-header-align, flex-start);
  /* No `overflow: hidden`: that would create a scroll container and break the
     sticky label below. */
  border-left: var(--gantt-grid-border, 1px solid var(--gantt-grid-color, #e5e7eb));
  border-bottom: var(--gantt-grid-border, 1px solid var(--gantt-grid-color, #e5e7eb));
}

.gantt-timeline__label {
  /* Follow the viewport: the label stays pinned at the left of the visible
     area while its cell spans across it, so the current period is always
     readable. Bounded by its own cell. */
  position: sticky;
  /* Offset by the frozen sidebar when one shares this scroll container
     (set by GanttView); 0 for a standalone/manual layout. */
  left: var(--gantt-label-sticky-left, 0px);
  padding: 0 var(--gantt-header-padding, 4px);
  white-space: nowrap;
  font-size: var(--gantt-header-font-size, 0.8em);
}
</style>
