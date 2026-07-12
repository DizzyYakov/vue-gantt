<script setup lang="ts">
import { computed } from 'vue'
import { useGanttContext } from '../composables/useGanttContext'
import { useGanttCreate } from '../composables/useGanttCreate'
import type { GanttCellEvent, GanttUnit, ResolvedRow } from '../types'

const props = defineProps<{
  /** Which time group the vertical lines follow. Defaults to the base unit. */
  tier?: GanttUnit
}>()

const ctx = useGanttContext()
const { config, visibleColumnsFor, visibleRows, visibleGroups, xToDate, dateToX, widthBetween, dispatch } =
  ctx

// Drag-to-create (opt-in via `cellCreatable`, gated inside the composable): a drag
// across an empty band emits `create`; the live draft drives the ghost preview below.
const { createDraft, moved, onBandPointerDown } = useGanttCreate(ctx)

const emit = defineEmits<{
  'cell-click': [event: GanttCellEvent]
  'cell-dblclick': [event: GanttCellEvent]
}>()

const tier = computed(() => props.tier ?? config.value.unit)
const columns = computed(() => visibleColumnsFor(tier.value))

// The row band spans the full content width from the body origin, so the
// pointer's offsetX maps straight to a chart date.
function onCellClick(row: ResolvedRow, event: MouseEvent): void {
  // Swallow the click that trails a create-drag so it isn't read as a cell click.
  if (moved.value) return
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
      @pointerdown="onBandPointerDown(row, $event)"
      @click="onCellClick(row, $event)"
      @dblclick="onCellDblclick(row, $event)"
    />
    <div
      v-for="group in visibleGroups"
      :key="`g-${group.id}`"
      class="gantt-grid__group"
      :style="{ top: `${group.top}px`, height: `${group.height}px` }"
    />
    <!-- Ghost bar shown while dragging out a new task (cellCreatable). -->
    <div
      v-if="createDraft"
      class="gantt-create-preview"
      :style="{
        left: `${dateToX(createDraft.start)}px`,
        width: `${widthBetween(createDraft.start, createDraft.end)}px`,
        top: `${createDraft.row.top}px`,
        height: `${createDraft.row.height}px`,
      }"
    >
      <div class="gantt-create-preview__bar" />
    </div>
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

.gantt-create-preview {
  position: absolute;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  pointer-events: none;
}

.gantt-create-preview__bar {
  width: 100%;
  height: var(--gantt-bar-height, 60%);
  min-width: 1px;
  border-radius: var(--gantt-bar-radius, 4px);
  background: var(--gantt-create-preview-bg, var(--gantt-bar-bg, #c7d2fe));
  opacity: var(--gantt-ghost-opacity, 0.55);
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
