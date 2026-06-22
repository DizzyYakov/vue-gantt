<script setup lang="ts">
import { computed, provide } from 'vue'
import { useRegisteredGroup } from '../composables/useTaskRegistry'
import { GANTT_GROUP } from '../context'
import type { GanttGroup } from '../types'

const props = defineProps<{
  id: string
  name?: string
  /** Initial collapsed state. */
  collapsed?: boolean
  meta?: Record<string, unknown>
}>()

// Register the group itself; nested GanttRow children inherit its id.
const group = computed<GanttGroup>(() => ({
  id: props.id,
  name: props.name,
  collapsed: props.collapsed,
  meta: props.meta,
}))
useRegisteredGroup(group)

// Expose this group's id to declarative GanttRow descendants.
provide(
  GANTT_GROUP,
  computed(() => props.id),
)
</script>

<template>
  <slot />
</template>
