<script setup lang="ts">
import { computed } from 'vue'
import { useGanttItem, type GanttItemProps } from '../composables/useGanttItem'

const props = defineProps<GanttItemProps>()

const {
  ctx,
  resolved,
  rowStyle,
  left,
  width,
  dragging,
  draggable,
  onPointerDown,
  ghost,
  previewLabel,
  overlapping,
  hidden,
} = useGanttItem(props, { type: 'task' })

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
    >
      <slot :task="resolved" :progress="resolved.progress">
        <div
          class="gantt-bar__progress"
          :style="progressStyle"
          :aria-label="`${resolved.progress}%`"
        />
        <span class="gantt-bar__label">{{ resolved.name }}</span>
      </slot>
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
