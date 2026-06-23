<script setup lang="ts">
import { computed } from 'vue'
import { useGanttContext } from '../composables/useGanttContext'
import type { GanttCellEvent, GanttUnit, ResolvedRow } from '../types'

const props = defineProps<{
  /** Which time group the vertical lines follow. Defaults to the base unit. */
  tier?: GanttUnit
}>()

const { config, visibleColumnsFor, visibleRows, visibleGroups, xToDate, dispatch } = useGanttContext()

const emit = defineEmits<{
  'cell-click': [event: GanttCellEvent]
  'cell-dblclick': [event: GanttCellEvent]
}>()

const tier = computed(() => props.tier ?? config.value.unit)
const columns = computed(() => visibleColumnsFor(tier.value))

// The row band spans the full content width from the body origin, so the
// pointer's offsetX maps straight to a chart date.
function onCellClick(row: ResolvedRow, event: MouseEvent): void {
  const payload: GanttCellEvent = { row, date: xToDate(event.offsetX), event }
  emit('cell-click', payload)
  dispatch('cell-click', payload)
}
function onCellDblclick(row: ResolvedRow, event: MouseEvent): void {
  const payload: GanttCellEvent = { row, date: xToDate(event.offsetX), event }
  emit('cell-dblclick', payload)
  dispatch('cell-dblclick', payload)
}
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
      @click="onCellClick(row, $event)"
      @dblclick="onCellDblclick(row, $event)"
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
  /* Re-enable pointer events (the grid container disables them) so empty cells
     are clickable; bars sit above and capture their own clicks. */
  pointer-events: auto;
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
