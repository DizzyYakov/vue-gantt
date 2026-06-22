<script setup lang="ts">
import { computed, useId, useTemplateRef } from 'vue'
import { useGanttContext } from '../composables/useGanttContext'
import type { GanttDependencyEvent, ResolvedTask } from '../types'

const { tasks, config, contentWidth, contentHeight, dateToX, taskBand, dispatch, linkDraft, beginLink } =
  useGanttContext()

const emit = defineEmits<{
  'dependency-click': [event: GanttDependencyEvent]
}>()

const linkable = computed(() => config.value.linkable)
const svg = useTemplateRef<SVGSVGElement>('svg')

function onLinkClick(fromId: string, toId: string, event: MouseEvent): void {
  const byId = new Map(tasks.value.map((t) => [t.id, t]))
  const from = byId.get(fromId)
  const to = byId.get(toId)
  if (!from || !to) return
  // Generic click (custom handling) always fires; default remove on linkable.
  emit('dependency-click', { from, to, event })
  dispatch('dependency-click', { from, to, event })
  if (linkable.value) dispatch('dependency-remove', { from: fromId, to: toId })
}

function onEndpointDown(link: DependencyLink, end: 'head' | 'tail', event: PointerEvent): void {
  beginLink({
    // Anchor = the endpoint that stays fixed (opposite the one being dragged).
    anchorId: end === 'head' ? link.from : link.to,
    anchorEdge: end === 'head' ? 'finish' : 'start',
    mode: end === 'head' ? 'reroute-head' : 'reroute-tail',
    link: { from: link.from, to: link.to },
    pointer: { x: event.clientX, y: event.clientY },
  })
}

const markerId = `gantt-arrow-${useId()}`

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
  tail: { x: number; y: number }
  head: { x: number; y: number }
}

const STUB = 12

// Finish-to-start links: an arrow from each dependency's end to the task's start.
const links = computed<DependencyLink[]>(() => {
  const byId = new Map<string, ResolvedTask>(tasks.value.map((t) => [t.id, t]))
  const result: DependencyLink[] = []

  for (const task of tasks.value) {
    for (const depId of task.dependencies) {
      const from = byId.get(depId)
      if (!from) continue

      const ex = dateToX(from.end)
      const ey = centerY(from)
      const sx = dateToX(task.start)
      const sy = centerY(task)

      const firstX = ex + STUB
      const approachX = sx - STUB

      const d =
        approachX >= firstX
          ? `M ${ex} ${ey} H ${approachX} V ${sy} H ${sx}`
          : `M ${ex} ${ey} H ${firstX} V ${(ey + sy) / 2} H ${approachX} V ${sy} H ${sx}`

      result.push({
        key: `${depId}->${task.id}`,
        from: depId,
        to: task.id,
        d,
        tail: { x: ex, y: ey },
        head: { x: sx, y: sy },
      })
    }
  }

  return result
})

// Temporary line shown while dragging a new/re-routed dependency.
const draftPath = computed<string | null>(() => {
  const d = linkDraft.value
  if (!d) return null
  const anchor = tasks.value.find((t) => t.id === d.anchorId)
  if (!anchor) return null
  const ax = dateToX(d.anchorEdge === 'finish' ? anchor.end : anchor.start)
  const ay = centerY(anchor)
  const rect = svg.value?.getBoundingClientRect()
  const px = rect ? d.pointer.x - rect.left : ax
  const py = rect ? d.pointer.y - rect.top : ay
  return `M ${ax} ${ay} L ${px} ${py}`
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
    <defs>
      <marker
        :id="markerId"
        class="gantt-dependencies__marker"
        markerWidth="8"
        markerHeight="8"
        refX="6"
        refY="3"
        orient="auto"
      >
        <path d="M0,0 L6,3 L0,6 Z" />
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
        :marker-end="`url(#${markerId})`"
        @click="onLinkClick(link.from, link.to, $event)"
      />
    </slot>

    <!-- Draggable endpoints for re-routing existing links. -->
    <template v-if="linkable">
      <g v-for="link in links" :key="`h-${link.key}`" class="gantt-dependency-handles">
        <circle
          class="gantt-dependency-handle"
          :cx="link.tail.x"
          :cy="link.tail.y"
          :r="4"
          @pointerdown.stop="onEndpointDown(link, 'tail', $event)"
        />
        <circle
          class="gantt-dependency-handle"
          :cx="link.head.x"
          :cy="link.head.y"
          :r="4"
          @pointerdown.stop="onEndpointDown(link, 'head', $event)"
        />
      </g>
    </template>

    <!-- In-progress link line (does not capture pointers, so drop hit-tests work). -->
    <path v-if="draftPath" class="gantt-dependency-draft" :d="draftPath" />
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
