<script setup lang="ts">
import { useGanttContext } from '../composables/useGanttContext'
import type { GanttRowEvent, ResolvedRow } from '../types'

const { visibleRows, visibleGroups, toggleGroup, dispatch } = useGanttContext()

const emit = defineEmits<{
  'row-click': [event: GanttRowEvent]
  'row-dblclick': [event: GanttRowEvent]
  'row-contextmenu': [event: GanttRowEvent]
}>()

function onRowClick(row: ResolvedRow, event: MouseEvent): void {
  emit('row-click', { row, event })
  dispatch('row-click', { row, event })
}
function onRowDblclick(row: ResolvedRow, event: MouseEvent): void {
  emit('row-dblclick', { row, event })
  dispatch('row-dblclick', { row, event })
}
function onRowContextmenu(row: ResolvedRow, event: MouseEvent): void {
  emit('row-contextmenu', { row, event })
  dispatch('row-contextmenu', { row, event })
}
</script>

<template>
  <div class="gantt-task-list" :style="{ height: 'var(--gantt-content-height)' }">
    <!-- Collapsible group headers (a band above their member rows). -->
    <div
      v-for="group in visibleGroups"
      :key="`g-${group.id}`"
      class="gantt-task-list__group"
      :data-id="group.id"
      :data-collapsed="group.collapsed || undefined"
      :style="{ top: `${group.top}px`, height: `${group.height}px` }"
    >
      <slot
        name="group"
        :group="group"
        :collapsed="group.collapsed"
        :toggle="() => toggleGroup(group.id)"
      >
        <button
          type="button"
          class="gantt-task-list__group-toggle"
          :aria-expanded="!group.collapsed"
          @click="toggleGroup(group.id)"
        >
          <span class="gantt-task-list__chevron" aria-hidden="true" />
          <span class="gantt-task-list__group-name">{{ group.name }}</span>
        </button>
      </slot>
    </div>

    <div
      v-for="row in visibleRows"
      :key="row.id"
      class="gantt-task-list__row"
      :data-id="row.id"
      :data-group="row.groupId || undefined"
      :style="{ top: `${row.top}px`, height: `${row.height}px` }"
      @click="onRowClick(row, $event)"
      @dblclick="onRowDblclick(row, $event)"
      @contextmenu="onRowContextmenu(row, $event)"
    >
      <slot name="row" :row="row" :index="row.order">
        <span class="gantt-task-list__name">{{ row.name }}</span>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.gantt-task-list {
  position: relative;
}

.gantt-task-list__row {
  position: absolute;
  left: 0;
  right: 0;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  overflow: hidden;
  border-bottom: var(--gantt-grid-border, 1px solid var(--gantt-grid-color, #e5e7eb));
}

/* Member rows are indented under their group header. */
.gantt-task-list__row[data-group] {
  padding-left: var(--gantt-group-indent, 16px);
}

.gantt-task-list__name {
  padding: 0 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.gantt-task-list__group {
  position: absolute;
  left: 0;
  right: 0;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  overflow: hidden;
  background: var(--gantt-group-header-bg, #f8fafc);
  color: var(--gantt-group-header-color, inherit);
  font-weight: var(--gantt-group-header-font-weight, 600);
  border-bottom: var(--gantt-grid-border, 1px solid var(--gantt-grid-color, #e5e7eb));
}

.gantt-task-list__group-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  height: 100%;
  padding: 0 10px;
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.gantt-task-list__chevron {
  width: 0;
  height: 0;
  flex: none;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  border-left: 6px solid currentcolor;
  /* Points down when expanded; rotates to point right when collapsed. */
  transform: rotate(90deg);
  transition: transform 0.15s ease;
}

.gantt-task-list__group[data-collapsed] .gantt-task-list__chevron {
  transform: rotate(0deg);
}

.gantt-task-list__group-name {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}
</style>
