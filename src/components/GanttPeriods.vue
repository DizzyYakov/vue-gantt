<script setup lang="ts">
import { useGanttContext } from '../composables/useGanttContext'

// Background bands for custom timeline periods (sprints): a full-height,
// alternating-fill column per period, spanning the whole body. Decorative overlay
// (no pointers); the period label lives in the timeline header. Renders nothing
// when `periods` is empty, so it's safe to always mount.
const { periods, contentWidth, contentHeight } = useGanttContext()
</script>

<template>
  <div
    class="gantt-periods"
    :style="{ width: `${contentWidth}px`, height: `${contentHeight}px` }"
    aria-hidden="true"
  >
    <div
      v-for="p in periods"
      :key="p.id"
      class="gantt-period-band"
      :data-id="p.id"
      :data-parity="p.index % 2"
      :style="{ left: `${p.x}px`, width: `${p.width}px`, height: `${contentHeight}px` }"
    >
      <slot :period="p" />
    </div>
  </div>
</template>

<style scoped>
.gantt-periods {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.gantt-period-band {
  position: absolute;
  top: 0;
  box-sizing: border-box;
  background: var(--gantt-period-band-bg, rgb(99 102 241 / 4%));
  border-left: var(--gantt-period-border, 1px dashed var(--gantt-grid-color, #e5e7eb));
}

/* Alternating fill so adjacent sprints read as distinct bands. */
.gantt-period-band[data-parity='1'] {
  background: var(--gantt-period-band-alt-bg, transparent);
}
</style>
