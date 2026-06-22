<script setup lang="ts">
import { computed } from 'vue'
import { useGanttItem, type GanttItemProps } from '../composables/useGanttItem'
import type { GanttTaskEvent } from '../types'

const props = defineProps<GanttItemProps>()

const emit = defineEmits<{
  click: [event: GanttTaskEvent]
  dblclick: [event: GanttTaskEvent]
  contextmenu: [event: GanttTaskEvent]
}>()

const {
  ctx,
  resolved,
  rowStyle,
  left,
  width,
  dragging,
  moved,
  draggable,
  onPointerDown,
  startResize,
  ghost,
  previewLabel,
  overlapping,
  hidden,
} = useGanttItem(props, { type: 'task' })

const resizable = computed(() => ctx.config.value.resizable)
const linkable = computed(() => ctx.config.value.linkable)

// Start dragging a new finish-to-start dependency from this task's finish edge.
function onConnectorDown(event: PointerEvent): void {
  ctx.beginLink({
    anchorId: resolved.value.id,
    anchorEdge: 'finish',
    mode: 'create',
    pointer: { x: event.clientX, y: event.clientY },
  })
}

// Click fires after a drag's pointerup; skip it so a drag isn't read as a click.
function onClick(event: MouseEvent): void {
  if (moved.value) return
  const payload: GanttTaskEvent = { task: resolved.value, event }
  emit('click', payload)
  ctx.dispatch('task-click', payload)
}
function onDblclick(event: MouseEvent): void {
  const payload: GanttTaskEvent = { task: resolved.value, event }
  emit('dblclick', payload)
  ctx.dispatch('task-dblclick', payload)
}
function onContextmenu(event: MouseEvent): void {
  const payload: GanttTaskEvent = { task: resolved.value, event }
  emit('contextmenu', payload)
  ctx.dispatch('task-contextmenu', payload)
}

const overlapMode = computed(() => ctx.config.value.overlap)
const barStyle = computed(() => ({ left: `${left.value}px`, width: `${width.value}px` }))
const progressStyle = computed(() => ({ width: `${resolved.value.progress}%` }))

const ghostStyle = computed(() =>
  ghost.value
    ? {
        left: `${ghost.value.left}px`,
        width: `${ghost.value.width}px`,
        transform: `translateY(${ghost.value.translateY}px)`,
      }
    : undefined,
)
const labelStyle = computed(() =>
  ghost.value
    ? { left: `${ghost.value.left}px`, transform: `translateY(${ghost.value.translateY}px)` }
    : undefined,
)
</script>

<template>
  <div
    v-if="!hidden"
    class="gantt-task"
    :data-id="resolved.id"
    :data-dragging="dragging || undefined"
    :data-overlap="overlapMode"
    :data-overlapping="overlapping || undefined"
    :style="rowStyle"
  >
    <div
      class="gantt-bar"
      :data-id="resolved.id"
      :data-draggable="draggable || undefined"
      :style="barStyle"
      @pointerdown="onPointerDown"
      @click="onClick"
      @dblclick="onDblclick"
      @contextmenu="onContextmenu"
    >
      <slot :task="resolved" :progress="resolved.progress">
        <div
          class="gantt-bar__progress"
          :style="progressStyle"
          :aria-label="`${resolved.progress}%`"
        />
        <span class="gantt-bar__label">{{ resolved.name }}</span>
      </slot>

      <!-- Edge handles for resizing (drag a side; sides flip past each other). -->
      <template v-if="resizable">
        <div class="gantt-bar__resize gantt-bar__resize--start" @pointerdown.stop="startResize($event, 'start')" />
        <div class="gantt-bar__resize gantt-bar__resize--end" @pointerdown.stop="startResize($event, 'end')" />
      </template>

      <!-- Connector to drag a new dependency from this task's finish. -->
      <div
        v-if="linkable"
        class="gantt-bar__connector"
        title="Drag to link"
        @pointerdown.stop="onConnectorDown"
      />
    </div>

    <!-- Translucent ghost + live date label shown while dragging. -->
    <template v-if="ghost">
      <div class="gantt-bar gantt-bar--ghost" :style="ghostStyle" aria-hidden="true">
        <div class="gantt-bar__progress" :style="progressStyle" />
        <span class="gantt-bar__label">{{ resolved.name }}</span>
      </div>
      <div class="gantt-drag-label" :style="labelStyle">{{ previewLabel }}</div>
    </template>
  </div>
</template>

<style scoped>
.gantt-task {
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  /* The full-width band is transparent to pointers; only the bar itself reacts,
     so clicks on empty parts of the row reach the grid (cell-click). */
  pointer-events: none;
}

/* Lift the row above its neighbours while dragging. */
.gantt-task[data-dragging] {
  z-index: 5;
}

.gantt-bar {
  position: absolute;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  height: var(--gantt-bar-height, 60%);
  min-width: 1px;
  border-radius: var(--gantt-bar-radius, 4px);
  background: var(--gantt-bar-bg, #c7d2fe);
  overflow: hidden;
  pointer-events: auto;
}

/* Edge resize handles: thin strips at the bar's sides. */
.gantt-bar__resize {
  position: absolute;
  top: 0;
  bottom: 0;
  width: var(--gantt-resize-handle-width, 7px);
  cursor: ew-resize;
  touch-action: none;
  z-index: 1;
}
.gantt-bar__resize--start {
  left: 0;
}
.gantt-bar__resize--end {
  right: 0;
}
.gantt-bar__resize:hover {
  background: var(--gantt-resize-handle-bg, rgb(0 0 0 / 12%));
}

/* Connector dot to drag out a new dependency from the bar's finish. */
.gantt-bar__connector {
  position: absolute;
  top: 50%;
  right: 2px;
  width: var(--gantt-connector-size, 8px);
  height: var(--gantt-connector-size, 8px);
  transform: translateY(-50%);
  border-radius: 50%;
  background: var(--gantt-connector-bg, #fff);
  border: 1.5px solid var(--gantt-connector-color, var(--gantt-progress-bg, #6366f1));
  cursor: crosshair;
  touch-action: none;
  z-index: 2;
}

/* Overlap mode: overlapping bars become translucent so the shared span blends. */
.gantt-task[data-overlap='overlap'][data-overlapping] .gantt-bar {
  opacity: var(--gantt-overlap-opacity, 0.6);
}

/* Cascade mode: a separating outline so staggered bars read as distinct cards. */
.gantt-task[data-overlap='cascade'][data-overlapping] .gantt-bar {
  border: 1px solid var(--gantt-surface, #fff);
}

.gantt-bar[data-draggable] {
  cursor: grab;
  touch-action: none;
}

.gantt-task[data-dragging] .gantt-bar[data-draggable] {
  cursor: grabbing;
}

/* The drag preview: a translucent copy that follows the pointer with precision. */
.gantt-bar--ghost {
  opacity: var(--gantt-ghost-opacity, 0.55);
  pointer-events: none;
  box-shadow: var(--gantt-bar-drag-shadow, 0 4px 12px rgb(0 0 0 / 25%));
}

.gantt-bar__progress {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: var(--gantt-progress-bg, #6366f1);
}

.gantt-bar__label {
  position: relative;
  padding: 0 8px;
  white-space: nowrap;
  color: var(--gantt-bar-color, inherit);
  /* The label can straddle both the filled progress and the empty track, which
     may have opposite luminance (e.g. a dark fill + light track). A theme can
     set a contrasting halo here so the text stays legible over both. */
  text-shadow: var(--gantt-bar-text-shadow, none);
  font-size: var(--gantt-bar-font-size, 0.8em);
}

/* Floating label showing the precise new time during a drag. */
.gantt-drag-label {
  position: absolute;
  top: 0;
  margin-top: -1.7em;
  padding: 1px 6px;
  white-space: nowrap;
  pointer-events: none;
  font-size: var(--gantt-drag-label-font-size, 0.72em);
  color: var(--gantt-drag-label-color, #fff);
  background: var(--gantt-drag-label-bg, #1e293b);
  border-radius: var(--gantt-drag-label-radius, 4px);
}
</style>
