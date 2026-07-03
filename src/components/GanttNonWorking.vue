<script setup lang="ts">
import { useGanttContext } from '../composables/useGanttContext'

// Background shading for non-working time (weekends / holidays / off periods): a
// full-height, flat-fill band per span, spanning the whole body. Decorative overlay
// (no pointers); mounts below the grid so grid lines and bars read on top. Renders
// nothing when `nonWorking` is empty, so it's safe to always mount.
const { nonWorking, contentHeight } = useGanttContext()
</script>

<template>
  <div class="gantt-nonworking" :style="{ height: `${contentHeight}px` }" aria-hidden="true">
    <div
      v-for="band in nonWorking"
      :key="band.id"
      class="gantt-nonworking-band"
      :data-id="band.id"
      :style="{ left: `${band.x}px`, width: `${band.width}px`, height: `${contentHeight}px` }"
    >
      <slot :band="band" />
    </div>
  </div>
</template>

<style scoped>
.gantt-nonworking {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.gantt-nonworking-band {
  position: absolute;
  top: 0;
  background: var(--gantt-nonworking-bg, rgb(100 116 139 / 8%));
}
</style>
