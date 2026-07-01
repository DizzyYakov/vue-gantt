<script setup lang="ts">
import { computed, onMounted, onUnmounted, useTemplateRef, watch } from 'vue'
import { useGanttContext } from '../composables/useGanttContext'
import { useGanttViewport } from '../composables/useGanttViewport'
import GanttBaselines from './GanttBaselines.vue'
import GanttConflicts from './GanttConflicts.vue'
import GanttDeadlines from './GanttDeadlines.vue'
import GanttDependencies from './GanttDependencies.vue'
import GanttGrid from './GanttGrid.vue'
import GanttGroupBar from './GanttGroupBar.vue'
import GanttMilestone from './GanttMilestone.vue'
import GanttSlack from './GanttSlack.vue'
import GanttTask from './GanttTask.vue'
import GanttTaskList from './GanttTaskList.vue'
import GanttTimeline from './GanttTimeline.vue'
import GanttToday from './GanttToday.vue'

const props = defineProps<{
  /** Height of the scroll viewport. A number is treated as pixels; a string is
   *  used verbatim. Provide it to cap the height and enable vertical scrolling +
   *  row virtualization. When omitted, the chart fills its parent's height
   *  (`height: 100%`) — so a height-constrained parent gives scrolling +
   *  virtualization, while an auto-height parent grows to fit the content. */
  height?: number | string
}>()

const {
  visibleTasks,
  visibleRows,
  visibleGroups,
  tasks,
  config,
  conflicts,
  slack,
  visibleColumnsFor,
  dateToX,
  contentWidth,
  contentHeight,
  setScroller,
} = useGanttContext()

// Virtualized base-unit columns the default GanttGrid draws — exposed to the
// `grid` slot so an override keeps the same (windowed) column set.
const gridColumns = computed(() => visibleColumnsFor(config.value.unit))

const scroller = useTemplateRef<HTMLElement>('scroller')
useGanttViewport(scroller)

// Expose the scroll container to the context so scrollToDate/Task/Today work.
// Register on mount (when the template ref is populated) and re-bind on change.
onMounted(() => setScroller(scroller.value ?? null))
watch(scroller, el => setScroller(el ?? null))
onUnmounted(() => setScroller(null))

const scrollStyle = computed(() => {
  // No explicit height → fill the parent. `height: 100%` resolves to the parent's
  // height when it's constrained (→ scroll + virtualization), and collapses to
  // content height when the parent is auto-sized (→ grows to fit, as before).
  if (props.height == null) return { height: '100%' }
  const h = typeof props.height === 'number' ? `${props.height}px` : props.height
  return { maxHeight: h }
})
</script>

<template>
  <div ref="scroller" class="gantt" :style="scrollStyle">
    <!-- Frozen header: sticky to the top while scrolling vertically. -->
    <div class="gantt__head">
      <div class="gantt__corner">
        <slot name="corner" :config="config" />
      </div>
      <div class="gantt__head-main">
        <slot name="timeline" :config="config" :visibleColumnsFor="visibleColumnsFor">
          <GanttTimeline>
            <template v-if="$slots.column" #column="columnProps">
              <slot name="column" v-bind="columnProps" />
            </template>
          </GanttTimeline>
        </slot>
      </div>
    </div>

    <div class="gantt__main">
      <!-- Frozen sidebar: sticky to the left while scrolling horizontally. -->
      <div class="gantt__sidebar">
        <slot name="sidebar" :rows="visibleRows" :groups="visibleGroups">
          <GanttTaskList>
            <template v-if="$slots.row" #row="rowProps">
              <slot name="row" v-bind="rowProps" />
            </template>
            <template v-if="$slots.group" #group="groupProps">
              <slot name="group" v-bind="groupProps" />
            </template>
          </GanttTaskList>
        </slot>
      </div>

      <div class="gantt__body">
        <slot name="grid" :columns="gridColumns" :rows="visibleRows">
          <GanttGrid />
        </slot>

        <slot name="group-bars" :groups="visibleGroups">
          <GanttGroupBar>
            <template v-if="$slots.groupBar" #default="groupBarProps">
              <slot name="groupBar" v-bind="groupBarProps" />
            </template>
          </GanttGroupBar>
        </slot>

        <slot name="baselines" :tasks="visibleTasks">
          <GanttBaselines />
        </slot>

        <slot name="bars" :tasks="visibleTasks">
          <template v-for="task in visibleTasks" :key="task.id">
            <GanttMilestone v-if="task.type === 'milestone'" :task="task">
              <template v-if="$slots.milestone" #default="slotProps">
                <slot name="milestone" v-bind="slotProps" />
              </template>
              <template v-if="$slots.tooltip" #tooltip="slotProps">
                <slot name="tooltip" v-bind="slotProps" />
              </template>
            </GanttMilestone>
            <GanttTask v-else :task="task">
              <template v-if="$slots.bar" #default="slotProps">
                <slot name="bar" v-bind="slotProps" />
              </template>
              <template v-if="$slots.tooltip" #tooltip="slotProps">
                <slot name="tooltip" v-bind="slotProps" />
              </template>
            </GanttTask>
          </template>
        </slot>
        <slot name="conflicts" :conflicts="conflicts">
          <GanttConflicts v-if="config.overlap === 'conflict'" />
        </slot>

        <slot name="slack" :slack="slack">
          <GanttSlack v-if="config.slack" />
        </slot>

        <slot name="deadlines" :tasks="visibleTasks">
          <GanttDeadlines />
        </slot>

        <slot name="dependencies" :tasks="tasks">
          <GanttDependencies />
        </slot>
        <slot name="today" :today="config.today" :dateToX="dateToX">
          <GanttToday />
        </slot>
        <slot name="body-extra" :contentWidth="contentWidth" :contentHeight="contentHeight" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.gantt {
  position: relative;
  overflow: auto;
  background: var(--gantt-surface, #fff);
  /* The frozen sidebar shares this scroll container, so timeline labels must
     stick just to the right of it. */
  --gantt-label-sticky-left: var(--gantt-sidebar-width);
}

.gantt__head {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  width: max-content;
}

.gantt__corner {
  position: sticky;
  left: 0;
  z-index: 1;
  flex: none;
  box-sizing: border-box;
  width: var(--gantt-sidebar-width);
  height: var(--gantt-header-height, var(--gantt-row-height));
  background: var(--gantt-surface, #fff);
  border-right: var(--gantt-grid-border, 1px solid var(--gantt-grid-color, #e5e7eb));
  border-bottom: var(--gantt-grid-border, 1px solid var(--gantt-grid-color, #e5e7eb));
}

.gantt__head-main {
  flex: none;
  width: var(--gantt-content-width);
  background: var(--gantt-surface, #fff);
}

.gantt__main {
  display: flex;
  width: max-content;
}

.gantt__sidebar {
  position: sticky;
  left: 0;
  z-index: 2;
  flex: none;
  box-sizing: border-box;
  width: var(--gantt-sidebar-width);
  height: var(--gantt-content-height);
  background: var(--gantt-surface, #fff);
  border-right: var(--gantt-grid-border, 1px solid var(--gantt-grid-color, #e5e7eb));
}

.gantt__body {
  position: relative;
  flex: none;
  width: var(--gantt-content-width);
  height: var(--gantt-content-height);
}
</style>
