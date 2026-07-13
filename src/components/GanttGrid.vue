<script setup lang="ts">
import { format } from 'date-fns'
import { computed } from 'vue'
import { useGanttContext } from '../composables/useGanttContext'
import { useGanttCreate } from '../composables/useGanttCreate'
import { isNearStickyHeader } from '../composables/useGanttItem'
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

// When drag-to-create is on, empty leaf rows carry no bar to grab, so surface a
// hint in their band that the empty strip is draggable. Skip parent rows (they
// show a summary bar) and any row that already has tasks.
const createHintRows = computed<ResolvedRow[]>(() => {
  if (!config.value.cellCreatable) return []
  return visibleRows.value.filter(row => row.tasks.length === 0 && !row.hasChildren)
})

// Live "start → end" label for the create ghost, so the user sees the span they
// are drawing (mirrors the drag preview label; honours `dragLabelFormat`/`locale`).
const createPreviewLabel = computed(() => {
  const draft = createDraft.value
  if (!draft) return ''
  const fmt = config.value.dragLabelFormat
  const locale = config.value.locale
  return `${format(draft.start, fmt, { locale })} → ${format(draft.end, fmt, { locale })}`
})

// On the top row the label would sit under the sticky header — flip it below.
const createLabelBelow = computed(() => isNearStickyHeader(createDraft.value?.row.top ?? 0))

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
    <!-- Affordance for cellCreatable: empty rows have no bar to grab. -->
    <div
      v-for="row in createHintRows"
      :key="`hint-${row.id}`"
      class="gantt-grid__create-hint"
      :style="{ top: `${row.top}px`, height: `${row.height}px` }"
    >
      <slot name="create-hint" :row="row">
        <span class="gantt-grid__create-hint-label">Drag to create</span>
      </slot>
    </div>
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
      <div
        class="gantt-drag-label gantt-create-preview__label"
        :class="{ 'gantt-create-preview__label--below': createLabelBelow }"
      >
        {{ createPreviewLabel }}
      </div>
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

/* Live start → end label above the create ghost (matches the drag label). */
.gantt-create-preview__label {
  position: absolute;
  top: 0;
  left: 0;
  margin-top: -1.7em;
  padding: 1px 6px;
  white-space: nowrap;
  pointer-events: none;
  font-size: var(--gantt-drag-label-font-size, 0.72em);
  color: var(--gantt-drag-label-color, #fff);
  background: var(--gantt-drag-label-bg, #1e293b);
  border-radius: var(--gantt-drag-label-radius, 4px);
}

/* On the top row, flip below the ghost so the sticky header can't cover it. */
.gantt-create-preview__label--below {
  top: 100%;
  margin-top: 4px;
}

/* Hint pinned to the left edge of the empty band (cellCreatable affordance).
   Sticky so it stays visible past the frozen sidebar as the body scrolls. */
.gantt-grid__create-hint {
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  pointer-events: none;
}

.gantt-grid__create-hint-label {
  position: sticky;
  left: var(--gantt-label-sticky-left, 8px);
  margin-left: 8px;
  padding: 2px 8px;
  border: var(--gantt-create-hint-border, 1px dashed currentColor);
  border-radius: var(--gantt-bar-radius, 4px);
  font: var(--gantt-create-hint-font, 12px / 1 system-ui, sans-serif);
  color: var(--gantt-create-hint-color, #94a3b8);
  opacity: var(--gantt-create-hint-opacity, 0.75);
  white-space: nowrap;
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
