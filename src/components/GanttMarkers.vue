<script setup lang="ts">
import { useGanttContext } from '../composables/useGanttContext'

// Full-height reference lines at arbitrary dates (quarter boundaries, release
// dates). Decorative overlay (no pointers); each marker carries an optional label.
// Renders nothing when `markers` is empty, so it's safe to always mount.
const { markers, contentHeight } = useGanttContext()
</script>

<template>
  <div class="gantt-markers" aria-hidden="true">
    <div
      v-for="marker in markers"
      :key="marker.id"
      class="gantt-marker"
      :data-id="marker.id"
      :style="{ left: `${marker.x}px`, height: `${contentHeight}px` }"
    >
      <slot :marker="marker">
        <span v-if="marker.label" class="gantt-marker__label">{{ marker.label }}</span>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.gantt-markers {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.gantt-marker {
  position: absolute;
  top: 0;
  width: 0;
  border-left: var(--gantt-marker-border, 1px dashed var(--gantt-marker-color, #6b7280));
}

.gantt-marker__label {
  position: absolute;
  top: 0;
  left: var(--gantt-marker-label-offset, 4px);
  white-space: nowrap;
  font-size: var(--gantt-marker-font-size, var(--gantt-header-font-size, 0.8em));
  color: var(--gantt-marker-label-color, var(--gantt-marker-color, #6b7280));
  background: var(--gantt-marker-label-bg, transparent);
  padding: var(--gantt-marker-label-padding, 0 2px);
}
</style>
