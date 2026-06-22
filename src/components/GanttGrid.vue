<script setup lang="ts">
import { computed } from 'vue'
import { useGanttContext } from '../composables/useGanttContext'
import type { GanttUnit } from '../types'

const props = defineProps<{
  /** Which time group the vertical lines follow. Defaults to the base unit. */
  tier?: GanttUnit
}>()

const { config, visibleColumnsFor, visibleRows, visibleGroups } = useGanttContext()

const tier = computed(() => props.tier ?? config.value.unit)
const columns = computed(() => visibleColumnsFor(tier.value))
</script>

<template>
  <div class="gantt-grid" aria-hidden="true">
    <div
      v-for="column in columns"
      :key="column.key"
      class="gantt-grid__col"
      :data-today="column.isToday || undefined"
      :style="{ left: `${column.x}px`, width: `${column.width}px` }"
    />
    <div
      v-for="row in visibleRows"
      :key="row.id"
      class="gantt-grid__row"
      :style="{ top: `${row.top}px`, height: `${row.height}px` }"
    />
    <div
      v-for="group in visibleGroups"
      :key="`g-${group.id}`"
      class="gantt-grid__group"
      :style="{ top: `${group.top}px`, height: `${group.height}px` }"
    />
  </div>
</template>

<style scoped>
.gantt-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.gantt-grid__col {
  position: absolute;
  top: 0;
  bottom: 0;
  box-sizing: border-box;
  border-left: var(--gantt-grid-border, 1px solid var(--gantt-grid-color, #e5e7eb));
}

.gantt-grid__col[data-today] {
  background: var(--gantt-today-column-bg, transparent);
}

.gantt-grid__row {
  position: absolute;
  left: 0;
  right: 0;
  box-sizing: border-box;
  border-bottom: var(--gantt-grid-border, 1px solid var(--gantt-grid-color, #e5e7eb));
}

/* Tint the group header band across the body so it reads as one strip. */
.gantt-grid__group {
  position: absolute;
  left: 0;
  right: 0;
  box-sizing: border-box;
  background: var(--gantt-group-header-bg, #f8fafc);
  border-bottom: var(--gantt-grid-border, 1px solid var(--gantt-grid-color, #e5e7eb));
}
</style>
