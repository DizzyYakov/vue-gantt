<script setup lang="ts">
import { computed } from 'vue'
import { format } from 'date-fns'
import { useGanttItem, type GanttItemProps } from '../composables/useGanttItem'
import { useHoverTooltip } from '../composables/useHoverTooltip'
import { useInlineEdit, vFocus } from '../composables/useInlineEdit'
import { useLongPress } from '../composables/useLongPress'
import { isOverdue, violatesConstraint } from '../utils'
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
  startProgress,
  liveProgress,
  segmentBars,
  ghost,
  previewLabel,
  labelBelow,
  overlapping,
  hidden,
  resources,
  keyboard,
  tabIndex,
  onItemKeydown,
} = useGanttItem(props, { type: 'task' })

const resizable = computed(() => ctx.config.value.resizable)
const progressDraggable = computed(() => ctx.config.value.progressDraggable)
const linkable = computed(() => ctx.config.value.linkable)
const editable = computed(() => ctx.config.value.editable)
const fmtDate = (d: Date): string => format(d, 'd MMM yyyy', { locale: ctx.config.value.locale })

// Screen-reader label for the bar: name, span and progress.
const ariaLabel = computed(
  () =>
    `${resolved.value.name}, ${fmtDate(resolved.value.start)}–${fmtDate(resolved.value.end)}, ${liveProgress.value}% complete`,
)
// Inline rename of the bar label (opt-in via `editable`, on double-click).
const {
  editing: editingName,
  draft: nameDraft,
  start: startNameEdit,
  save: saveName,
  commit: commitName,
  cancel: cancelName,
} = useInlineEdit(
  () => resolved.value.name,
  name => ctx.editTask({ id: resolved.value.id, patch: { name }, task: resolved.value }),
)
// Flags: bar finishes past its deadline, or breaches an upper-bound constraint.
const overdue = computed(() => isOverdue(resolved.value))
const constraintViolation = computed(() => violatesConstraint(resolved.value))
// Highlight this bar while a dependency drag hovers it as a drop target.
const linkTarget = computed(() => ctx.linkDraft.value?.over === resolved.value.id)
// Whether this task is on the critical path (only when `criticalPath` is on).
const critical = computed(() => ctx.criticalTasks.value.has(resolved.value.id))

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
  if (editable.value) startNameEdit()
}
function onContextmenu(event: MouseEvent): void {
  const payload: GanttTaskEvent = { task: resolved.value, event }
  emit('contextmenu', payload)
  ctx.dispatch('task-contextmenu', payload)
}

const overlapMode = computed(() => ctx.config.value.overlap)
const barStyle = computed(() => ({ left: `${left.value}px`, width: `${width.value}px` }))
// Follows the live drag value in `progress` mode; the resolved value otherwise.
const progressStyle = computed(() => ({ width: `${liveProgress.value}%` }))

const ghostStyle = computed(() =>
  ghost.value
    ? {
        left: `${ghost.value.left}px`,
        width: `${ghost.value.width}px`,
        transform: `translateY(${ghost.value.translateY}px)`,
      }
    : undefined,
)

// Live tooltip shown for any drag (move / resize / progress).
const showTooltip = computed(() => dragging.value && !!previewLabel.value)
const tooltipStyle = computed(() =>
  ghost.value
    ? { left: `${ghost.value.left}px`, transform: `translateY(${ghost.value.translateY}px)` }
    : { left: `${left.value}px` },
)

// Opt-in hover tooltip (enabled by the `tooltip` flag or a `tooltip` slot);
// `tipStyle` clamps the left-anchored tooltip within the content (no edge clipping).
const {
  show: showHoverTip,
  tipStyle: hoverTipStyle,
  toggleTouch,
  onPointerEnter,
  onPointerLeave,
} = useHoverTooltip(dragging, left, false)

// Touch has no `dblclick`; a long-press opens the same inline name editor.
const longPress = useLongPress(() => {
  if (editable.value) startNameEdit()
})

// Combine the drag start with the long-press timer on a single pointerdown.
function onBarDown(event: PointerEvent): void {
  onPointerDown(event)
  longPress.onPointerdown(event)
}
// Touch has no hover, so a tap (non-drag, non-edit) toggles the tooltip.
function onBarUp(event: PointerEvent): void {
  longPress.onPointerup()
  if (event.pointerType === 'touch' && !moved.value && !editingName.value) toggleTouch()
}
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
      ref="anchor"
      class="gantt-bar"
      :data-id="resolved.id"
      :data-draggable="draggable || undefined"
      :data-link-target="linkTarget || undefined"
      :data-critical="critical || undefined"
      :data-overdue="overdue || undefined"
      :data-constraint-violation="constraintViolation || undefined"
      :data-split="segmentBars.length ? '' : undefined"
      :role="keyboard ? 'button' : undefined"
      :tabindex="tabIndex"
      :aria-label="keyboard ? ariaLabel : undefined"
      :data-gantt-focusable="keyboard ? '' : undefined"
      :style="barStyle"
      @keydown="onItemKeydown"
      @focus="keyboard && ctx.setKeyboardActive(resolved.id)"
      @pointerdown="onBarDown"
      @pointermove="longPress.onPointermove"
      @pointerup="onBarUp"
      @pointercancel="longPress.onPointercancel"
      @pointerenter="onPointerEnter"
      @pointerleave="onPointerLeave"
      @click="onClick"
      @dblclick="onDblclick"
      @contextmenu="onContextmenu"
    >
      <slot :task="resolved" :progress="liveProgress" :resources="resources">
        <!-- Split task: work segments with paused gaps, progress flowing through them. -->
        <template v-if="segmentBars.length">
          <div class="gantt-bar__split-line" />
          <div
            v-for="(seg, i) in segmentBars"
            :key="i"
            class="gantt-bar__segment"
            :style="{ left: `${seg.leftPct}%`, width: `${seg.widthPct}%` }"
          >
            <div class="gantt-bar__segment-progress" :style="{ width: `${seg.progressPct}%` }" />
          </div>
        </template>
        <div
          v-else
          class="gantt-bar__progress"
          :style="progressStyle"
          :aria-label="`${liveProgress}%`"
        />
        <slot
          v-if="editable && editingName"
          name="taskEditor"
          :task="resolved"
          :value="nameDraft"
          :commit="commitName"
          :cancel="cancelName"
        >
          <input
            v-model="nameDraft"
            v-focus
            class="gantt-edit-input gantt-bar__label"
            @keydown.enter="saveName"
            @keydown.esc="cancelName"
            @blur="saveName"
            @pointerdown.stop
            @mousedown.stop
            @click.stop
            @dblclick.stop
          />
        </slot>
        <span v-else class="gantt-bar__label">{{ resolved.name }}</span>
      </slot>

      <!-- Edge handles for resizing (drag a side; sides flip past each other). -->
      <template v-if="resizable">
        <div
          class="gantt-bar__resize gantt-bar__resize--start"
          @pointerdown.stop="startResize($event, 'start')"
        />
        <div
          class="gantt-bar__resize gantt-bar__resize--end"
          @pointerdown.stop="startResize($event, 'end')"
        />
      </template>

      <!-- Progress handle: drag to change completion. -->
      <div
        v-if="progressDraggable"
        class="gantt-bar__progress-handle"
        :style="{ left: `${liveProgress}%` }"
        title="Drag to set progress"
        @pointerdown.stop.prevent="startProgress"
      />

      <!-- Connector to drag a new dependency from this task's finish. -->
      <div
        v-if="linkable"
        class="gantt-bar__connector"
        title="Drag to link"
        @pointerdown.stop.prevent="onConnectorDown"
      />
    </div>

    <!-- Translucent ghost for move/resize. -->
    <div v-if="ghost" class="gantt-bar gantt-bar--ghost" :style="ghostStyle" aria-hidden="true">
      <div class="gantt-bar__progress" :style="progressStyle" />
      <span class="gantt-bar__label">{{ resolved.name }}</span>
    </div>

    <!-- Live tooltip for any drag (move / resize / progress). -->
    <div
      v-if="showTooltip"
      class="gantt-drag-label"
      :class="{ 'gantt-drag-label--below': labelBelow }"
      :style="tooltipStyle"
    >
      {{ previewLabel }}
    </div>

    <!-- Opt-in hover tooltip (default content or the `tooltip` slot). -->
    <div
      v-if="showHoverTip"
      ref="tip"
      class="gantt-tooltip"
      :class="{ 'gantt-tooltip--below': labelBelow }"
      :style="hoverTipStyle"
      role="tooltip"
    >
      <slot name="tooltip" :task="resolved">
        <span class="gantt-tooltip__name">{{ resolved.name }}</span>
        <span class="gantt-tooltip__dates">
          {{ fmtDate(resolved.start) }} – {{ fmtDate(resolved.end) }}
        </span>
        <span class="gantt-tooltip__progress">{{ Math.round(resolved.progress) }}%</span>
      </slot>
    </div>
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

.gantt-bar:focus-visible {
  outline: var(--gantt-focus-outline, 2px solid var(--gantt-progress-bg, #6366f1));
  outline-offset: var(--gantt-focus-outline-offset, 2px);
}

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

.gantt-bar__progress-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: var(--gantt-progress-handle-width, 10px);
  transform: translateX(-50%);
  cursor: ew-resize;
  touch-action: none;
  z-index: 1;
}
.gantt-bar__progress-handle::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 2px;
  height: 55%;
  transform: translate(-50%, -50%);
  border-radius: 1px;
  background: var(--gantt-progress-handle-color, #fff);
  box-shadow: 0 0 0 1px rgb(0 0 0 / 15%);
}

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

.gantt-bar[data-link-target] {
  outline: var(--gantt-link-target-outline, 2px solid var(--gantt-progress-bg, #6366f1));
  outline-offset: 1px;
}

.gantt-bar[data-critical] {
  outline: var(--gantt-critical-outline, 2px solid var(--gantt-critical-color, #dc2626));
  outline-offset: 1px;
}

.gantt-bar[data-overdue] {
  outline: var(--gantt-overdue-outline, 1.5px solid var(--gantt-deadline-color, #dc2626));
  outline-offset: 1px;
  background-image: var(
    --gantt-overdue-bg,
    linear-gradient(var(--gantt-overdue-tint, rgb(220 38 38 / 12%)), var(--gantt-overdue-tint, rgb(220 38 38 / 12%)))
  );
}

.gantt-bar[data-constraint-violation] {
  outline: var(--gantt-constraint-outline, 1.5px dashed var(--gantt-constraint-color, #f59e0b));
  outline-offset: 1px;
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

/* Split task: the bar itself is transparent; segments carry the fill, and the
   connector line shows through the paused gaps between them. */
.gantt-bar[data-split] {
  background: transparent;
}

.gantt-bar__split-line {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: var(--gantt-split-line-width, 2px);
  transform: translateY(-50%);
  background: var(--gantt-split-line-color, var(--gantt-progress-bg, #6366f1));
}

.gantt-bar__segment {
  position: absolute;
  top: 0;
  bottom: 0;
  overflow: hidden;
  background: var(--gantt-split-segment-bg, var(--gantt-bar-bg, #c7d2fe));
  border-radius: var(--gantt-split-segment-radius, var(--gantt-bar-radius, 4px));
}

.gantt-bar__segment-progress {
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

.gantt-edit-input {
  position: relative;
  z-index: 3;
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  margin: 0 4px;
  font: inherit;
  font-size: var(--gantt-bar-font-size, 0.8em);
  color: var(--gantt-edit-color, inherit);
  background: var(--gantt-edit-bg, var(--gantt-surface, #fff));
  border: var(--gantt-edit-border, 1px solid var(--gantt-progress-bg, #6366f1));
  border-radius: var(--gantt-edit-radius, 3px);
}

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

/* Near the top edge, flip below the bar so the sticky header can't cover it. */
.gantt-drag-label--below {
  top: 100%;
  margin-top: 4px;
}

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
  font-size: var(--gantt-tooltip-font-size, var(--gantt-drag-label-font-size, 0.72em));
  color: var(--gantt-tooltip-color, var(--gantt-drag-label-color, #fff));
  background: var(--gantt-tooltip-bg, var(--gantt-drag-label-bg, #1e293b));
  border-radius: var(--gantt-tooltip-radius, var(--gantt-drag-label-radius, 4px));
  box-shadow: var(--gantt-tooltip-shadow, 0 2px 8px rgb(0 0 0 / 25%));
}

/* Near the top edge, flip below the bar so the sticky header can't cover it. */
.gantt-tooltip--below {
  top: 100%;
  margin-top: 4px;
}
.gantt-tooltip__name {
  font-weight: 600;
}
</style>
