<script setup lang="ts">
import { computed, provide } from 'vue'
import { useRegisteredRow } from '../composables/useTaskRegistry'
import { GANTT_ROW } from '../context'
import type { GanttRow, GanttTask } from '../types'

const props = defineProps<{
  id: string
  name?: string
  /** Tasks for this row (alternative to nested `GanttTask` children). */
  tasks?: GanttTask[]
  meta?: Record<string, unknown>
}>()

// Register the row itself; nested GanttTask children register into it by id.
const row = computed<GanttRow>(() => ({
  id: props.id,
  name: props.name,
  tasks: props.tasks,
  meta: props.meta,
}))
useRegisteredRow(row)

// Expose this row's id to declarative GanttTask/GanttMilestone descendants.
provide(
  GANTT_ROW,
  computed(() => props.id),
)
</script>

<template>
  <slot />
</template>
