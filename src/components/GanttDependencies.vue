<script setup lang="ts">
import { computed, useId, useTemplateRef } from 'vue'
import { useGanttContext } from '../composables/useGanttContext'
import type { DependencyPoint } from '../dependencyPaths'
import type { GanttDependencyEvent, ResolvedTask } from '../types'

const {
  tasks,
  config,
  contentWidth,
  contentHeight,
  dateToX,
  taskBand,
  dispatch,
  linkDraft,
  beginLink,
} = useGanttContext()

const emit = defineEmits<{
  'dependency-click': [event: GanttDependencyEvent]
}>()

const linkable = computed(() => config.value.linkable)
const svg = useTemplateRef<SVGSVGElement>('svg')

const markerId = `gantt-arrow-${useId()}`

// Selected connector path builder + resolved arrowhead (default: elbow + triangle).
const buildPath = computed(() => config.value.dependencyShape)
const arrow = computed(() => config.value.arrowHead())
const markerEnd = computed(() => (arrow.value ? `url(#${markerId})` : undefined))

function onLinkClick(fromId: string, toId: string, event: MouseEvent): void {
  const byId = new Map(tasks.value.map(t => [t.id, t]))
  const from = byId.get(fromId)
  const to = byId.get(toId)
  if (!from || !to) return
  // Generic click (custom handling) always fires; default remove on linkable.
  emit('dependency-click', { from, to, event })
  dispatch('dependency-click', { from, to, event })
  if (linkable.value) dispatch('dependency-remove', { from: fromId, to: toId })
}

function onEndpointDown(link: DependencyLink, event: PointerEvent): void {
  // Re-route the arrowhead: keep the predecessor (anchor = its finish),
  // retarget the successor on drop.
  beginLink({
    anchorId: link.from,
    anchorEdge: 'finish',
    mode: 'reroute-head',
    link: { from: link.from, to: link.to },
    pointer: { x: event.clientX, y: event.clientY },
  })
}

/** Vertical centre of a task's bar (accounts for lanes/cascade offsets). */
function centerY(task: ResolvedTask): number {
  const band = taskBand(task)
  return band.top + band.height / 2
}

interface DependencyLink {
  key: string
  from: string
  to: string
  d: string
  /** Arrow tail (predecessor finish) and head (successor start) points. */
  tail: DependencyPoint
  head: DependencyPoint
}

// Finish-to-start links: an arrow from each dependency's end to the task's start.
const links = computed<DependencyLink[]>(() => {
  const byId = new Map<string, ResolvedTask>(tasks.value.map(t => [t.id, t]))
  const result: DependencyLink[] = []

  for (const task of tasks.value) {
    for (const depId of task.dependencies) {
      const from = byId.get(depId)
      if (!from) continue

      const tail = { x: dateToX(from.end), y: centerY(from) }
      const head = { x: dateToX(task.start), y: centerY(task) }

      result.push({
        key: `${depId}->${task.id}`,
        from: depId,
        to: task.id,
        d: buildPath.value(tail, head),
        tail,
        head,
      })
    }
  }

  return result
})

// Temporary arrow shown while dragging a new/re-routed dependency — same connector
// shape + arrowhead as a real link, so you drag the actual arrow.
const draftPath = computed<string | null>(() => {
  const d = linkDraft.value
  if (!d) return null
  const anchor = tasks.value.find(t => t.id === d.anchorId)
  if (!anchor) return null
  const ax = dateToX(d.anchorEdge === 'finish' ? anchor.end : anchor.start)
  const ay = centerY(anchor)
  const rect = svg.value?.getBoundingClientRect()
  const px = rect ? d.pointer.x - rect.left : ax
  const py = rect ? d.pointer.y - rect.top : ay
  // The anchor is the tail on a finish edge, otherwise the head.
  return d.anchorEdge === 'finish'
    ? buildPath.value({ x: ax, y: ay }, { x: px, y: py })
    : buildPath.value({ x: px, y: py }, { x: ax, y: ay })
})
</script>

<template>
  <svg
    ref="svg"
    class="gantt-dependencies"
    :width="contentWidth"
    :height="contentHeight"
    :viewBox="`0 0 ${contentWidth} ${contentHeight}`"
    aria-hidden="true"
  >
    <defs v-if="arrow">
      <marker
        :id="markerId"
        class="gantt-dependencies__marker"
        :class="{ 'gantt-dependencies__marker--open': arrow.filled === false }"
        markerWidth="8"
        markerHeight="8"
        refX="6"
        refY="3"
        orient="auto"
      >
        <!-- An unfilled shape (`filled: false`) is stroked via the `--open` class. -->
        <path :d="arrow.d" />
      </marker>
    </defs>
    <slot :links="links">
      <path
        v-for="link in links"
        :key="link.key"
        class="gantt-dependency"
        :d="link.d"
        :data-from="link.from"
        :data-to="link.to"
        :marker-end="markerEnd"
        @click="onLinkClick(link.from, link.to, $event)"
      />
    </slot>

    <!-- Draggable arrowhead for re-routing a link onto another task. The tail
         coincides with the task's connector dot, so only the head gets a handle. -->
    <template v-if="linkable">
      <circle
        v-for="link in links"
        :key="`h-${link.key}`"
        class="gantt-dependency-handle"
        :cx="link.head.x"
        :cy="link.head.y"
        :r="4"
        @pointerdown.stop.prevent="onEndpointDown(link, $event)"
      />
    </template>

    <!-- In-progress arrow (does not capture pointers, so drop hit-tests work). -->
    <path v-if="draftPath" class="gantt-dependency-draft" :d="draftPath" :marker-end="markerEnd" />
  </svg>
</template>

<style scoped>
.gantt-dependencies {
  position: absolute;
  top: 0;
  left: 0;
  overflow: visible;
  pointer-events: none;
}

.gantt-dependency {
  fill: none;
  stroke: var(--gantt-dependency-color, #94a3b8);
  stroke-width: var(--gantt-dependency-width, 1.5);
  /* The SVG layer is click-through; let the arrow stroke itself catch clicks. */
  pointer-events: stroke;
}

.gantt-dependencies__marker path {
  fill: var(--gantt-dependency-color, #94a3b8);
}

.gantt-dependencies__marker--open path {
  fill: none;
  stroke: var(--gantt-dependency-color, #94a3b8);
  stroke-width: 1.5;
}

.gantt-dependency-handle {
  fill: var(--gantt-connector-bg, #fff);
  stroke: var(--gantt-dependency-handle-color, var(--gantt-progress-bg, #6366f1));
  stroke-width: 1.5;
  cursor: crosshair;
  pointer-events: auto;
  touch-action: none;
}

.gantt-dependency-draft {
  fill: none;
  stroke: var(--gantt-dependency-draft-color, var(--gantt-progress-bg, #6366f1));
  stroke-width: var(--gantt-dependency-width, 1.5);
  stroke-dasharray: 4 3;
  pointer-events: none;
}
</style>
