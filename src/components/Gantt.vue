<script setup lang="ts">
import { computed, ref } from 'vue'
import type {
  GanttCellEvent,
  GanttColumnEvent,
  GanttDependencyChange,
  GanttDependencyEvent,
  GanttDependencyUpdate,
  GanttGroupToggleEvent,
  GanttMoveEvent,
  GanttProgressEvent,
  GanttResizeEvent,
  GanttRootProps,
  GanttRowEvent,
  GanttScrollOptions,
  GanttTaskEvent,
} from '../types'
import GanttRoot from './GanttRoot.vue'
import GanttView from './GanttView.vue'

const props = defineProps<GanttRootProps & {
  /** Max height of the scroll viewport (number = px). Enables row virtualization. */
  height?: number | string
}>()

const emit = defineEmits<{
  move: [event: GanttMoveEvent]
  resize: [event: GanttResizeEvent]
  progress: [event: GanttProgressEvent]
  'group-toggle': [event: GanttGroupToggleEvent]
  'dependency-create': [event: GanttDependencyChange]
  'dependency-remove': [event: GanttDependencyChange]
  'dependency-update': [event: GanttDependencyUpdate]
  'task-click': [event: GanttTaskEvent]
  'task-dblclick': [event: GanttTaskEvent]
  'task-contextmenu': [event: GanttTaskEvent]
  'milestone-click': [event: GanttTaskEvent]
  'milestone-dblclick': [event: GanttTaskEvent]
  'milestone-contextmenu': [event: GanttTaskEvent]
  'row-click': [event: GanttRowEvent]
  'row-dblclick': [event: GanttRowEvent]
  'row-contextmenu': [event: GanttRowEvent]
  'cell-click': [event: GanttCellEvent]
  'cell-dblclick': [event: GanttCellEvent]
  'column-click': [event: GanttColumnEvent]
  'dependency-click': [event: GanttDependencyEvent]
}>()

defineSlots<{
  sidebar?: () => unknown
  row?: (props: { row: unknown; index: number }) => unknown
  group?: (props: { group: unknown; collapsed: boolean; toggle: () => void }) => unknown
  groupBar?: (props: { group: unknown }) => unknown
  corner?: () => unknown
  timeline?: () => unknown
  column?: (props: { column: unknown; tier: unknown }) => unknown
  bar?: (props: { task: unknown; progress: number }) => unknown
  milestone?: (props: { task: unknown }) => unknown
  grid?: () => unknown
  conflicts?: (props: { conflicts: unknown }) => unknown
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

// Forward the imperative scroll API from GanttRoot so a `ref` to `<Gantt>` works.
const root = ref<InstanceType<typeof GanttRoot>>()
defineExpose({
  scrollToDate: (date: Date | string | number, options?: GanttScrollOptions) =>
    root.value?.scrollToDate(date, options),
  scrollToTask: (id: string, options?: GanttScrollOptions) => root.value?.scrollToTask(id, options),
  scrollToToday: (options?: GanttScrollOptions) => root.value?.scrollToToday(options),
})
</script>

<template>
  <GanttRoot
    ref="root"
    v-bind="rootProps"
    @move="emit('move', $event)"
    @resize="emit('resize', $event)"
    @progress="emit('progress', $event)"
    @group-toggle="emit('group-toggle', $event)"
    @dependency-create="emit('dependency-create', $event)"
    @dependency-remove="emit('dependency-remove', $event)"
    @dependency-update="emit('dependency-update', $event)"
    @task-click="emit('task-click', $event)"
    @task-dblclick="emit('task-dblclick', $event)"
    @task-contextmenu="emit('task-contextmenu', $event)"
    @milestone-click="emit('milestone-click', $event)"
    @milestone-dblclick="emit('milestone-dblclick', $event)"
    @milestone-contextmenu="emit('milestone-contextmenu', $event)"
    @row-click="emit('row-click', $event)"
    @row-dblclick="emit('row-dblclick', $event)"
    @row-contextmenu="emit('row-contextmenu', $event)"
    @cell-click="emit('cell-click', $event)"
    @cell-dblclick="emit('cell-dblclick', $event)"
    @column-click="emit('column-click', $event)"
    @dependency-click="emit('dependency-click', $event)"
  >
    <GanttView :height="height">
      <template v-if="$slots.corner" #corner><slot name="corner" /></template>
      <template v-if="$slots.timeline" #timeline><slot name="timeline" /></template>
      <template v-if="$slots.sidebar" #sidebar><slot name="sidebar" /></template>
      <template v-if="$slots.grid" #grid><slot name="grid" /></template>
      <template v-if="$slots.conflicts" #conflicts="slotProps">
        <slot name="conflicts" v-bind="slotProps" />
      </template>
      <template v-if="$slots.dependencies" #dependencies><slot name="dependencies" /></template>
      <template v-if="$slots.today" #today><slot name="today" /></template>
      <template v-if="$slots['body-extra']" #body-extra><slot name="body-extra" /></template>
      <template v-if="$slots.row" #row="slotProps"><slot name="row" v-bind="slotProps" /></template>
      <template v-if="$slots.group" #group="slotProps"><slot name="group" v-bind="slotProps" /></template>
      <template v-if="$slots.groupBar" #groupBar="slotProps"><slot name="groupBar" v-bind="slotProps" /></template>
      <template v-if="$slots.column" #column="slotProps"><slot name="column" v-bind="slotProps" /></template>
      <template v-if="$slots.bar" #bar="slotProps"><slot name="bar" v-bind="slotProps" /></template>
      <template v-if="$slots.milestone" #milestone="slotProps">
        <slot name="milestone" v-bind="slotProps" />
      </template>
    </GanttView>
  </GanttRoot>
</template>
