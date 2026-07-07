<script setup lang="ts">
import { computed, inject, provide } from 'vue'
import { useRegisteredRow } from '../composables/useTaskRegistry'
import { GANTT_GROUP, GANTT_PARENT_ROW, GANTT_ROW } from '../context'
import type { GanttRow, GanttTask } from '../types'

const props = defineProps<{
  id: string
  name?: string
  /** Tasks for this row (alternative to nested `GanttTask` children). */
  tasks?: GanttTask[]
  /** Group id (overrides an enclosing `GanttGroup`). */
  groupId?: string
  /** Parent row id for tree nesting (overrides an enclosing `GanttRow`). */
  parentId?: string
  /** Initial collapsed state of this row's subtree. */
  collapsed?: boolean
  meta?: Record<string, unknown>
}>()

// Inherit the enclosing GanttGroup's id unless an explicit `groupId` is given.
const injectedGroup = inject(GANTT_GROUP, null)
// Inherit the enclosing GanttRow's id as the tree parent unless `parentId` is given.
const injectedParentRow = inject(GANTT_PARENT_ROW, null)

// Register the row itself; nested GanttTask children register into it by id.
const row = computed<GanttRow>(() => ({
  id: props.id,
  name: props.name,
  tasks: props.tasks,
  groupId: props.groupId ?? (injectedGroup ? injectedGroup.value : undefined),
  parentId: props.parentId ?? (injectedParentRow ? injectedParentRow.value : undefined),
  collapsed: props.collapsed,
  meta: props.meta,
}))
useRegisteredRow(row)

// Expose this row's id to declarative GanttTask/GanttMilestone descendants.
provide(
  GANTT_ROW,
  computed(() => props.id),
)

// Expose this row's id as the tree parent for nested GanttRow descendants.
provide(
  GANTT_PARENT_ROW,
  computed(() => props.id),
)
</script>

<template>
  <slot />
</template>
