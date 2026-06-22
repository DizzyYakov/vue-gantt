<script setup lang="ts">
import { computed } from 'vue'
import type { GanttMoveEvent, GanttRootProps } from '../types'
import GanttRoot from './GanttRoot.vue'
import GanttView from './GanttView.vue'

const props = defineProps<GanttRootProps & {
  /** Max height of the scroll viewport (number = px). Enables row virtualization. */
  height?: number | string
}>()

const emit = defineEmits<{ move: [event: GanttMoveEvent] }>()

defineSlots<{
  sidebar?: () => unknown
  row?: (props: { row: unknown; index: number }) => unknown
  corner?: () => unknown
  timeline?: () => unknown
  column?: (props: { column: unknown; tier: unknown }) => unknown
  bar?: (props: { task: unknown; progress: number }) => unknown
  milestone?: (props: { task: unknown }) => unknown
  grid?: () => unknown
  dependencies?: () => unknown
  today?: () => unknown
  'body-extra'?: () => unknown
}>()

// Everything except `height` is forwarded to GanttRoot.
const rootProps = computed<GanttRootProps>(() => {
  const { height, ...rest } = props
  void height
  return rest
})
</script>

<template>
  <GanttRoot v-bind="rootProps" @move="emit('move', $event)">
    <GanttView :height="height">
      <template v-if="$slots.corner" #corner><slot name="corner" /></template>
      <template v-if="$slots.timeline" #timeline><slot name="timeline" /></template>
      <template v-if="$slots.sidebar" #sidebar><slot name="sidebar" /></template>
      <template v-if="$slots.grid" #grid><slot name="grid" /></template>
      <template v-if="$slots.dependencies" #dependencies><slot name="dependencies" /></template>
      <template v-if="$slots.today" #today><slot name="today" /></template>
      <template v-if="$slots['body-extra']" #body-extra><slot name="body-extra" /></template>
      <template v-if="$slots.row" #row="slotProps"><slot name="row" v-bind="slotProps" /></template>
      <template v-if="$slots.column" #column="slotProps"><slot name="column" v-bind="slotProps" /></template>
      <template v-if="$slots.bar" #bar="slotProps"><slot name="bar" v-bind="slotProps" /></template>
      <template v-if="$slots.milestone" #milestone="slotProps">
        <slot name="milestone" v-bind="slotProps" />
      </template>
    </GanttView>
  </GanttRoot>
</template>
