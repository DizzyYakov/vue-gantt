<script setup lang="ts">
import { computed } from 'vue'
import { useGanttContext } from '../composables/useGanttContext'
import { resourceWorkload, type ResourceWorkload, type WorkloadSegment } from '../layout'
import type { ResolvedResource } from '../types'

// A standalone, headless load histogram meant to sit BELOW the chart: one row per
// resource showing how many of its tasks run concurrently over time. It shares the
// chart's context (scale + resources) and mirrors the body's horizontal scroll via
// `viewport.scrollLeft`, so it stays aligned with the timeline without being a
// structural part of `GanttView`. Renders nothing when there are no resources.
const { tasks, resources, dateToX, widthBetween, contentWidth, viewport } = useGanttContext()

const workloads = computed<ResourceWorkload[]>(() =>
  resourceWorkload(tasks.value, { resourceIds: resources.value.map(resource => resource.id) }),
)
// Shared vertical scale across rows so bar heights are comparable (never 0).
const peak = computed(() => Math.max(1, ...workloads.value.map(workload => workload.peak)))
const resourceById = computed(() => new Map(resources.value.map(resource => [resource.id, resource])))
function resourceOf(id: string): ResolvedResource | undefined {
  return resourceById.value.get(id)
}
/** A positioned histogram bar (px x/width, % height), exposed to the default slot
 *  so a custom render doesn't need the chart context to place bars. */
interface WorkloadBar {
  segment: WorkloadSegment
  left: number
  width: number
  /** Height as a fraction of the row (0–1), = count / shared peak. */
  heightRatio: number
}
function barsFor(workload: ResourceWorkload): WorkloadBar[] {
  return workload.segments.map(segment => ({
    segment,
    left: dateToX(segment.start),
    width: widthBetween(segment.start, segment.end),
    heightRatio: segment.count / peak.value,
  }))
}
function barStyle(bar: WorkloadBar, resourceId: string): Record<string, string> {
  const color = resourceOf(resourceId)?.color
  return {
    left: `${bar.left}px`,
    width: `${bar.width}px`,
    height: `${bar.heightRatio * 100}%`,
    background: color ?? 'var(--gantt-workload-bar-bg, #6366f1)',
  }
}
</script>

<template>
  <div class="gantt-workload" aria-hidden="true">
    <div
      v-for="workload in workloads"
      :key="workload.resourceId"
      class="gantt-workload__row"
      :data-id="workload.resourceId"
    >
      <div class="gantt-workload__label">
        <slot name="label" :resource="resourceOf(workload.resourceId)" :workload="workload">
          <span class="gantt-workload__name">{{
            resourceOf(workload.resourceId)?.name ?? workload.resourceId
          }}</span>
        </slot>
      </div>
      <!-- Track mirrors the body's horizontal scroll; its inner spans the full
           content width and is translated to match `viewport.scrollLeft`. -->
      <div class="gantt-workload__track">
        <div
          class="gantt-workload__inner"
          :style="{ width: `${contentWidth}px`, transform: `translateX(${-viewport.scrollLeft}px)` }"
        >
          <slot :workload="workload" :peak="peak" :bars="barsFor(workload)">
            <div
              v-for="bar in barsFor(workload)"
              :key="bar.segment.start.getTime()"
              class="gantt-workload__bar"
              :data-count="bar.segment.count"
              :style="barStyle(bar, workload.resourceId)"
            />
          </slot>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gantt-workload {
  overflow: hidden;
  background: var(--gantt-workload-bg, var(--gantt-surface, #fff));
}

.gantt-workload__row {
  display: flex;
  align-items: stretch;
  height: var(--gantt-workload-row-height, 44px);
  border-top: var(--gantt-grid-border, 1px solid var(--gantt-grid-color, #e5e7eb));
}

.gantt-workload__label {
  flex: none;
  box-sizing: border-box;
  width: var(--gantt-sidebar-width, 200px);
  display: flex;
  align-items: center;
  padding: 0 12px;
  overflow: hidden;
  border-right: var(--gantt-grid-border, 1px solid var(--gantt-grid-color, #e5e7eb));
}

.gantt-workload__name {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  font-size: var(--gantt-workload-label-font-size, 0.8em);
}

.gantt-workload__track {
  position: relative;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.gantt-workload__inner {
  position: absolute;
  inset: 0;
  /* width + translateX set inline to mirror the timeline scroll. */
}

.gantt-workload__bar {
  position: absolute;
  bottom: 0;
  min-width: 1px;
  border-radius: var(--gantt-workload-bar-radius, 2px 2px 0 0);
  opacity: var(--gantt-workload-bar-opacity, 0.85);
}
</style>
