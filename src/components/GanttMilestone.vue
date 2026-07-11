<script setup lang="ts">
import { computed } from 'vue'
import { format } from 'date-fns'
import { onActivateKey, useGanttItem, type GanttItemProps } from '../composables/useGanttItem'
import { useHoverTooltip } from '../composables/useHoverTooltip'
import type { GanttTaskEvent } from '../types'

const props = defineProps<GanttItemProps>()

const emit = defineEmits<{
  click: [event: GanttTaskEvent]
  dblclick: [event: GanttTaskEvent]
  contextmenu: [event: GanttTaskEvent]
}>()

// A milestone is a point in time; `end` is ignored and collapsed onto `start`.
const {
  ctx,
  resolved,
  rowStyle,
  left,
  dragging,
  moved,
  draggable,
  onPointerDown,
  ghost,
  previewLabel,
  hidden,
  resources,
} = useGanttItem(props, { type: 'milestone' })

// Click fires after a drag's pointerup; skip it so a drag isn't read as a click.
function onClick(event: MouseEvent): void {
  if (moved.value) return
  const payload: GanttTaskEvent = { task: resolved.value, event }
  emit('click', payload)
  ctx.dispatch('milestone-click', payload)
}
function onDblclick(event: MouseEvent): void {
  const payload: GanttTaskEvent = { task: resolved.value, event }
  emit('dblclick', payload)
  ctx.dispatch('milestone-dblclick', payload)
}
function onContextmenu(event: MouseEvent): void {
  const payload: GanttTaskEvent = { task: resolved.value, event }
  emit('contextmenu', payload)
  ctx.dispatch('milestone-contextmenu', payload)
}

const overlapMode = computed(() => ctx.config.value.overlap)
const markerStyle = computed(() => ({ left: `${left.value}px` }))

// Adaptive max width for a consumer-rendered label (exposed in the default slot):
// the horizontal gap to the next item on the same row, so labels of nearby
// milestones don't overlap. Falls back to the remaining content width when this
// is the last item on its row.
const LABEL_GUTTER = 8
const labelMaxWidth = computed(() => {
  const self = resolved.value
  const selfX = left.value
  // Only this milestone's own row can crowd its label (rows are indexed by
  // `order`); scanning the whole `tasks` list would be O(all tasks) per marker.
  const rowTasks = ctx.rows.value[self.order]?.tasks ?? []
  let nextX = ctx.contentWidth.value
  for (const task of rowTasks) {
    if (task.id === self.id) continue
    const x = ctx.dateToX(task.start)
    if (x > selfX && x < nextX) nextX = x
  }
  return Math.max(0, nextX - selfX - LABEL_GUTTER)
})
// Tooltip date formatter, localized via the `locale` config.
const fmtDate = (d: Date): string => format(d, 'd MMM yyyy', { locale: ctx.config.value.locale })
// Keyboard-operable a11y layer (opt-in via `keyboard`).
const keyboard = computed(() => ctx.config.value.keyboard)
// Screen-reader label for the marker: name, date and that it's a milestone.
const ariaLabel = computed(() => `${resolved.value.name}, ${fmtDate(resolved.value.start)} (milestone)`)
// Highlight while a dependency drag hovers this milestone as a drop target.
const linkTarget = computed(() => ctx.linkDraft.value?.over === resolved.value.id)
// Whether this milestone is on the critical path (only when `criticalPath` is on).
const critical = computed(() => ctx.criticalTasks.value.has(resolved.value.id))

const ghostStyle = computed(() =>
  ghost.value
    ? { left: `${ghost.value.left}px`, transform: `translate(-50%, ${ghost.value.translateY}px)` }
    : undefined,
)
const labelStyle = computed(() =>
  ghost.value
    ? { left: `${ghost.value.left}px`, transform: `translateY(${ghost.value.translateY}px)` }
    : undefined,
)

// Opt-in hover tooltip (enabled by the `tooltip` flag or a `tooltip` slot);
// `tipStyle` clamps the centred tooltip within the content (no edge clipping).
const {
  show: showHoverTip,
  tipStyle: hoverTipStyle,
  toggleTouch,
  onPointerEnter,
  onPointerLeave,
} = useHoverTooltip(dragging, left, true)

// Touch has no hover, so a tap (non-drag) toggles the tooltip.
function onMarkerUp(event: PointerEvent): void {
  if (event.pointerType === 'touch' && !moved.value) toggleTouch()
}
</script>

<template>
  <div
    v-if="!hidden"
    class="gantt-milestone"
    :data-id="resolved.id"
    :data-dragging="dragging || undefined"
    :data-overlap="overlapMode"
    :style="rowStyle"
  >
    <div
      ref="anchor"
      class="gantt-milestone__marker"
      :data-draggable="draggable || undefined"
      :data-link-target="linkTarget || undefined"
      :data-critical="critical || undefined"
      :role="keyboard ? 'button' : undefined"
      :tabindex="keyboard ? 0 : undefined"
      :aria-label="keyboard ? ariaLabel : undefined"
      :style="markerStyle"
      @keydown="keyboard && onActivateKey($event)"
      @pointerdown="onPointerDown"
      @pointerenter="onPointerEnter"
      @pointerleave="onPointerLeave"
      @pointerup="onMarkerUp"
      @click="onClick"
      @dblclick="onDblclick"
      @contextmenu="onContextmenu"
    >
      <slot :task="resolved" :resources="resources" :label-max-width="labelMaxWidth">
        <div class="gantt-milestone__diamond" />
      </slot>
    </div>

    <!-- Opt-in hover tooltip (default content or the `tooltip` slot). -->
    <div v-if="showHoverTip" ref="tip" class="gantt-tooltip" :style="hoverTipStyle" role="tooltip">
      <slot name="tooltip" :task="resolved">
        <span class="gantt-tooltip__name">{{ resolved.name }}</span>
        <span class="gantt-tooltip__dates">{{ fmtDate(resolved.start) }}</span>
      </slot>
    </div>

    <!-- Translucent ghost + live date label shown while dragging. -->
    <template v-if="ghost">
      <div
        class="gantt-milestone__marker gantt-milestone__marker--ghost"
        :style="ghostStyle"
        aria-hidden="true"
      >
        <div class="gantt-milestone__diamond" />
      </div>
      <div class="gantt-drag-label" :style="labelStyle">{{ previewLabel }}</div>
    </template>
  </div>
</template>

<style scoped>
.gantt-milestone {
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  /* Only the marker reacts to pointers; clicks elsewhere reach the grid. */
  pointer-events: none;
}

.gantt-milestone[data-dragging] {
  z-index: 5;
}

.gantt-milestone__marker {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Center the marker on the milestone date. */
  transform: translateX(-50%);
  /* Sit above the dependency SVG layer (painted later in `.gantt__body`), whose
     arrow strokes (`pointer-events: stroke`) would otherwise steal the marker's
     hover/click/drag where a connector crosses it. */
  z-index: 1;
  pointer-events: auto;
}

/* Keyboard focus ring (a11y layer, `keyboard` prop). */
.gantt-milestone__marker:focus-visible {
  outline: var(--gantt-focus-outline, 2px solid var(--gantt-progress-bg, #6366f1));
  outline-offset: var(--gantt-focus-outline-offset, 2px);
}

.gantt-milestone__marker[data-draggable] {
  cursor: grab;
  touch-action: none;
}

.gantt-milestone[data-dragging] .gantt-milestone__marker[data-draggable] {
  cursor: grabbing;
}

.gantt-milestone__marker--ghost {
  opacity: var(--gantt-ghost-opacity, 0.55);
  pointer-events: none;
}

.gantt-milestone__diamond {
  width: var(--gantt-milestone-size, 14px);
  height: var(--gantt-milestone-size, 14px);
  background: var(--gantt-milestone-bg, #f59e0b);
  transform: rotate(45deg);
  border-radius: var(--gantt-milestone-radius, 2px);
}

/* Drop-target affordance while a dependency is being dragged onto this marker. */
.gantt-milestone__marker[data-link-target] .gantt-milestone__diamond {
  outline: var(--gantt-link-target-outline, 2px solid var(--gantt-progress-bg, #6366f1));
  outline-offset: 2px;
}

/* Critical-path highlight. */
.gantt-milestone__marker[data-critical] .gantt-milestone__diamond {
  outline: var(--gantt-critical-outline, 2px solid var(--gantt-critical-color, #dc2626));
  outline-offset: 2px;
}

.gantt-drag-label {
  position: absolute;
  top: 0;
  margin-top: -1.7em;
  padding: 1px 6px;
  white-space: nowrap;
  pointer-events: none;
  transform-origin: left center;
  font-size: var(--gantt-drag-label-font-size, 0.72em);
  color: var(--gantt-drag-label-color, #fff);
  background: var(--gantt-drag-label-bg, #1e293b);
  border-radius: var(--gantt-drag-label-radius, 4px);
}

/* Opt-in hover tooltip, floating just above the marker (defaults mirror the drag label). */
.gantt-tooltip {
  position: absolute;
  top: 0;
  margin-top: -2em;
  z-index: 6;
  display: flex;
  gap: 8px;
  align-items: baseline;
  padding: 2px 8px;
  max-width: max-content;
  white-space: nowrap;
  pointer-events: none;
  transform: translateX(-50%);
  font-size: var(--gantt-tooltip-font-size, var(--gantt-drag-label-font-size, 0.72em));
  color: var(--gantt-tooltip-color, var(--gantt-drag-label-color, #fff));
  background: var(--gantt-tooltip-bg, var(--gantt-drag-label-bg, #1e293b));
  border-radius: var(--gantt-tooltip-radius, var(--gantt-drag-label-radius, 4px));
  box-shadow: var(--gantt-tooltip-shadow, 0 2px 8px rgb(0 0 0 / 25%));
}
.gantt-tooltip__name {
  font-weight: 600;
}
</style>
