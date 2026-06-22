<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useGanttContext } from '../composables/useGanttContext'
import { useGanttViewport } from '../composables/useGanttViewport'
import GanttConflicts from './GanttConflicts.vue'
import GanttDependencies from './GanttDependencies.vue'
import GanttGrid from './GanttGrid.vue'
import GanttMilestone from './GanttMilestone.vue'
import GanttTask from './GanttTask.vue'
import GanttTaskList from './GanttTaskList.vue'
import GanttTimeline from './GanttTimeline.vue'
import GanttToday from './GanttToday.vue'

const props = defineProps<{
  /** Max height of the scroll viewport. A number is treated as pixels.
   *  Provide it to enable vertical scrolling + row virtualization. */
  height?: number | string
}>()

const { visibleTasks, config } = useGanttContext()

const scroller = useTemplateRef<HTMLElement>('scroller')
useGanttViewport(scroller)

const scrollStyle = computed(() => ({
  maxHeight: props.height == null
    ? undefined
    : typeof props.height === 'number'
      ? `${props.height}px`
      : props.height,
}))
</script>

<template>
  <div ref="scroller" class="gantt" :style="scrollStyle">
    <!-- Frozen header: sticky to the top while scrolling vertically. -->
    <div class="gantt__head">
      <div class="gantt__corner">
        <slot name="corner" />
      </div>
      <div class="gantt__head-main">
        <slot name="timeline">
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
        <slot name="sidebar">
          <GanttTaskList>
            <template v-if="$slots.row" #row="rowProps">
              <slot name="row" v-bind="rowProps" />
            </template>
          </GanttTaskList>
        </slot>
      </div>

      <div class="gantt__body">
        <slot name="grid">
          <GanttGrid />
        </slot>

        <template v-for="task in visibleTasks" :key="task.id">
          <GanttMilestone v-if="task.type === 'milestone'" :task="task">
            <template v-if="$slots.milestone" #default="slotProps">
              <slot name="milestone" v-bind="slotProps" />
            </template>
          </GanttMilestone>
          <GanttTask v-else :task="task">
            <template v-if="$slots.bar" #default="slotProps">
              <slot name="bar" v-bind="slotProps" />
            </template>
          </GanttTask>
        </template>

        <GanttConflicts v-if="config.overlap === 'conflict'" />

        <slot name="dependencies">
          <GanttDependencies />
        </slot>
        <slot name="today">
          <GanttToday />
        </slot>
        <slot name="body-extra" />
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
