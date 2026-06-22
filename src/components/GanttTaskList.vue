<script setup lang="ts">
import { useGanttContext } from '../composables/useGanttContext'

const { visibleRows } = useGanttContext()
</script>

<template>
  <div class="gantt-task-list" :style="{ height: 'var(--gantt-content-height)' }">
    <div
      v-for="row in visibleRows"
      :key="row.id"
      class="gantt-task-list__row"
      :data-id="row.id"
      :style="{ top: `${row.top}px`, height: `${row.height}px` }"
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

.gantt-task-list__name {
  padding: 0 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}
</style>
